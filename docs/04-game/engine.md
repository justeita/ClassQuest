---
status: draft
last_reviewed: 2026-11-13
owner: tim ClassQuest
---

# Arsitektur Game (Phaser 4)

Game berjalan **sepenuhnya di client**. Server hanya mengirim `Story` dan
menerima hasil. Tidak ada Phaser di server, tidak ada `window` saat SSR.

- Keputusan engine: [ADR 0004](../09-decisions/0004-phaser-4.md)
- UI hybrid: [ADR 0007](../09-decisions/0007-hybrid-ui.md)
- Desain: [`game-design.md`](./game-design.md)
- Dunia dan data peta: [`world-design.md`](./world-design.md)

## Pembagian tanggung jawab

| Bagian                 | Teknologi        | Isi                                             |
| ---------------------- | ---------------- | ----------------------------------------------- |
| Dunia, peta, karakter  | Phaser           | Sprite, posisi, urutan gambar (depth), kamera   |
| Dialog                 | Hybrid           | Panel + portrait Phaser, teks typewriter di DOM |
| Tantangan              | React DOM        | Form, tombol, input, feedback, aksesibilitas    |
| HUD, menu, hasil       | React DOM        | Panel quest, jeda, layar hasil                  |
| State cerita           | TypeScript murni | `StoryRunner` (tanpa Phaser)                    |
| Persistensi preferensi | `localStorage`   | Pengaturan audio, dibaca React saat mount       |

Alasannya: input teks dan aksesibilitas jauh lebih baik di DOM, sementara dunia
game butuh render loop. Memaksakan semuanya ke canvas akan memperlambat
pengembangan dan merusak aksesibilitas.

## Konfigurasi Phaser

Kode yang ada hari ini (`src/game/config.ts`):

```ts
import Phaser from "phaser";

import type { Story } from "@/story/schema";

import type { GameBus } from "./gameBus";
import { GameScene } from "./scenes/GameScene";
import { PreloadScene } from "./scenes/PreloadScene";

export { GAME_WIDTH, GAME_HEIGHT } from "./constants";

import { GAME_HEIGHT, ukuranKanvas } from "./constants";

export function createGameConfig(
  parent: HTMLElement,
  story: Story,
  bus?: GameBus,
): Phaser.Types.Core.GameConfig {
  const { skala, lebar } = ukuranKanvas(
    parent.clientWidth,
    parent.clientHeight,
  );

  return {
    type: Phaser.AUTO,
    parent,
    width: lebar,
    height: GAME_HEIGHT,
    backgroundColor: "#14201a",
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.NONE,
      zoom: skala,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [new PreloadScene(story), new GameScene(story, bus)],
  };
}
```

Yang penting dari konfigurasi ini:

- **Tinggi internal 360**, lebarnya `lebar kontainer ÷ skala`
  (`ukuranKanvas()` di `constants.ts`, dijepit 640–960). Skala bulat 1×/2×/3×
  dipakai saat sisa ruangnya ≤6%; kalau tidak, skala **penuh** (mis. 1,83×) supaya
  kanvas mengisi bingkai dan tidak jadi strip kecil. `Scale.NONE` + `zoom`
  dipakai (bukan `FIT`) karena lebar internal ikut dihitung di sini.
  `createGame.ts` menghitung ulang skala pada event `resize`. Angka dan warna ini
  harus sama dengan [`game-design.md`](./game-design.md#resolusi-dan-skala) dan
  [`../07-assets/asset-guide.md`](../07-assets/asset-guide.md).
- **Tidak ada `physics`.** Gerak dan tabrakan dihitung sendiri oleh
  `movement.ts` + `world/collision.ts` dari data editor; tidak ada satu pun
  `Arcade.Sprite` atau static body.
- Scene diberi `story` dan `bus` lewat konstruktor, bukan `registry`. Scene tidak
  lagi memuat fixture sendiri.

Catatan Phaser 4:

- `roundPixels` **default `false`** di v4. Tanpa ini, pixel art akan blur/bergetar.
- Pembulatan per objek memakai `vertexRoundMode`. Default `safeAuto` hanya
  membulatkan objek yang **tidak** diskalakan atau diputar; objek terskala
  (prop editor ±1,66×, karakter 0,875×) perlu
  `setVertexRoundMode("fullAuto")` supaya tidak meluncur di sub-piksel.
- `setTintFill()` sudah dihapus. Untuk efek highlight, pakai `setTint()` +
  `setTintMode()`.
- FX dan mask kini satu sistem filter. Jangan menyalin contoh Phaser 3.
- `Phaser.Geom.Point` tidak ada; pakai `Phaser.Math.Vector2`.
- `DynamicTexture` butuh `render()` setelah digambar.

## Integrasi dengan Next.js 16

### Aturan

1. Komponen host **wajib** `"use client"`.
2. Phaser **wajib** diimpor dinamis di dalam `useEffect` — jangan di top-level.
3. Game **wajib** di-`destroy()` saat cleanup.
4. Jangan memakai `next/dynamic` dengan `ssr: false` di Server Component.
5. Jangan menyimpan instance Phaser di state React (menyebabkan re-render).

### Komponen host

`GameShell.tsx` memegang **layar** (judul → main → hasil), bukan state cerita:

```tsx
export function GameShell({ story }: { story: Story }) {
  const [layar, setLayar] = useState<"judul" | "main" | "hasil">("judul");
  const [hasil, setHasil] = useState<PlayResult | null>(null);
  const [sesi, setSesi] = useState(0);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {layar === "judul" ? (
        <TitleScreen story={story} onStart={mulai} />
      ) : (
        <GameCanvas key={sesi} story={story} onFinished={selesai} />
      )}
      {layar === "hasil" && hasil && (
        <ResultScreen result={hasil} onMainLagi={mainLagi} />
      )}
    </div>
  );
}
```

`GameCanvas` memasang Phaser setelah "Mulai" (bukan di belakang layar judul) dan
menjembatani dunia dengan overlay DOM:

```tsx
export function GameCanvas({ story, onFinished }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameHandle | null>(null);
  const busRef = useRef<GameBus | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    void import("@/game/createGame")
      .then(({ createGame }) => {
        if (cancelled) return;
        const game = createGame(container, story);
        gameRef.current = game;
        busRef.current = game.bus;
        // ...pasang pendengar bus di sini...
      })
      .catch((error: unknown) => {
        console.error("Gagal memuat game:", error);
      });

    return () => {
      cancelled = true;
      gameRef.current?.destroy();
      gameRef.current = null;
      busRef.current = null;
    };
  }, [story]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      role="region"
      aria-label="Area permainan ClassQuest"
    />
  );
}
```

Yang perlu diperhatikan:

- Modul `@/game/createGame` diimpor **di dalam** `useEffect`, bukan di top-level.
  `createGame.ts` mengimpor Phaser, jadi top-level import akan membuat `window is
not defined` saat build.
- Instance game disimpan di `useRef`, bukan `useState` — supaya tidak memicu
  re-render.
- Flag `cancelled` menutup celah balapan: `import()` bisa selesai setelah cleanup
  dijalankan, dan tanpa flag itu game akan hidup tanpa pemilik.
- `GameHandle.destroy()` memanggil `game.destroy(true)`, jadi canvas ikut dilepas.
- Callback `onFinished` disimpan di ref agar identitas baru tidak memuat ulang
  Phaser.
- `key={sesi}` di `GameShell` memaksa remount saat "Main lagi" supaya cerita
  dimulai dari awal.

Catatan penting: **jangan** memberi `aria-hidden="true"` pada host canvas. Itu
menghapus seluruh game dari accessibility tree, padahal
[`accessibility.md`](./accessibility.md) mewajibkan canvas punya `aria-label` dan
bisa menerima fokus keyboard. Yang dekoratif cukup elemen di dalam canvas.

### Jebakan `<Activity>` di Next 16

Dengan `cacheComponents: true`, Next memakai React `<Activity>` untuk menyimpan
state route yang ditinggalkan. Artinya:

- Saat pengguna pindah route, **effect cleanup dijalankan** → game dihancurkan.
- Saat kembali, effect dijalankan lagi → game dibuat ulang.

Konsekuensi: **jangan** mengandalkan state di dalam Phaser untuk menyimpan
progres. Game harus bisa dibuat ulang dari `story` saja; posisi pemain dan kursor
cerita dimulai ulang dari awal.

### SSR

Gejala kalau salah: `ReferenceError: window is not defined` atau
`document is not defined` saat `next build`.

Penyebab: Phaser diimpor di module scope komponen yang dirender server.

Perbaikan: pastikan hanya di dalam `useEffect` (seperti contoh) atau di file yang
ditandai `"use client"` dan diimpor dinamis.

## Scene Phaser

| Scene          | Tanggung jawab sekarang                                                                     |
| -------------- | ------------------------------------------------------------------------------------------- |
| `PreloadScene` | Muat seluruh aset dunia desa + aset cerita; gambar progres di canvas; lanjut ke `GameScene` |
| `GameScene`    | Bangun dunia sekali, gerak 8 arah, interaksi NPC, dialog typewriter, tantangan lewat bus    |

`GameScene` menjalankan siklus ADR 0008: fase `explore` (dunia dari `VILLAGE`,
pemain dari `movement.ts`, zona interaksi dari `interaction.ts`) → `interact()`
memutar deretan beat lewat `textbox.ts` + `typewriter.ts` dengan debounce 150 ms
(Space/Enter/klik). Teks dialog dikirim ke React sebagai event `dialogue` dan
dirender `DialogueBox.tsx`; React membalas command `advance`. Prompt interaksi
memakai event `prompt`: kotak `Space` pemberi quest dirender `NpcMarker.tsx`
(menyatu dengan `!`), sedangkan obrolan singkat dirender `InteractHint.tsx`
(ADR 0007). Pemberi quest
scene aktif memulai dialog; NPC lain yang punya `smallTalk` menampilkan satu
kalimat singkat lewat textbox yang sama tanpa menggeser cerita (ADR 0016), dan
NPC tanpa obrolan tetap menjadi penghalang. Penanda `!` hanya untuk pemberi
quest, dikirim lewat event `markers` dan dirender `NpcMarker.tsx`.

Posisi prompt dan penanda dikonversi dari koordinat dunia ke layar memakai
`duniaKeLayar()` (`layar.ts`), yang memperhitungkan `scroll` **dan** `zoom`
kamera, lalu dikirim **setiap frame** supaya tanda menempel pada NPC saat kamera
bergeser. Dulu pengirimannya dibatasi 90 ms; dengan
kamera yang kini menempel pemain, penanda tertinggal lalu terlihat melompat
("putus-putus"). Keduanya dirender `NpcHintLayer.tsx` — komponen kecil yang
berlangganan bus sendiri, jadi pembaruan tiap frame tidak me-render ulang HUD,
dialog, atau jurnal. Emisi tetap hanya terjadi saat piksel bulatnya berubah.

Saat NPC terlihat, `NpcHintLayer.tsx` merender **papan nama** untuk **semua**
NPC — bukan hanya pemberi quest — dari `cast.name`. Chip gelap bergaris
`#3D4B41`, teks krem tebal, lebar maksimum agar nama panjang dipotong elipsis,
dan diletakkan rapat di atas kepala (`JARAK_NAMA` 6 px) supaya tidak "melayang"
tinggi dari sprite. NPC tanpa entri di `cast` dilewati, jadi tidak ada papan
nama kosong.

Pemberi quest ditandai **kotak `!`** bergaya HUD di atas papan namanya
(`MARKER_OFFSET_Y` 24 px). Kotak yang sama dipakai di dua keadaan supaya
indikator konsisten: saat dekat kotak naik-turun ringan (`animate-quest-bob`,
magnitudo 4 px); saat NPC berada di luar pandangan, `posisiPenanda()` (`layar.ts`)
menjepit posisinya ke tepi layar dan kotak menjadi **beacon** — ditambah cincin
denyut dan **penunjuk kecil di atas kotak** yang berputar mengikuti `sudut` arah
NPC. `INSET_PENANDA` (24 px semua sisi) menahan beacon agar tetap dekat tepi
bingkai game, tetapi tidak lebih dekat dari jangkauan penunjuknya
(`JANGKAUAN_PENUNJUK` 22,5 px dari pusat kotak) — dulu sisi kiri/kanan/bawah
hanya 16 px sehingga penunjuk arah habis terpotong tepi kanvas. Penunjuk dan
cincin denyut kini utuh di keempat sisi, dan tidak ada tombol HUD yang tertutup
karena `pointer-events-none`. Karena posisinya dihitung ulang tiap
frame, beacon ikut bergeser ketika pemain berjalan mendekat dan berubah mulus
menjadi kotak `!` begitu NPC masuk layar.

Kotak `!` **tidak** diganti kotak `Space` saat pemain mendekat: pemberi quest
menampilkan keduanya sebagai **satu paket**. `NpcMarker.tsx` membungkus `!` dan
`Space` dalam satu `div` ber-animasi idle (`animate-quest-bob`), jadi keduanya
naik-turun **bersama** dan tidak terlihat terpisah; kotak `Space` (komponen
`KotakSpace.tsx` yang dipakai bersama) diletakkan absolut di `left-full` — rapat
di tepi kanan `!` tanpa celah, tinggi sama (`PENANDA.kotak`) — sehingga lebar
paket tetap seukuran `!` dan penanda tetap di tengah NPC. Saat pemain masuk zona,
kotak `Space` meluncur keluar dari `!` (`animate-quest-slide-in`, titik tumbuh di
tepi kiri); saat pemain keluar, kotak **tidak** hilang mendadak melainkan
meluncur masuk kembali ke `!` (`animate-quest-slide-out`). Supaya animasi keluar
sempat terlihat, `NpcMarker.tsx` menahan kotak di DOM selama `DURASI_KELUAR_MS`
(200 ms, sama dengan durasi keyframes) lewat hook `useTeksKeluar`. Penyesuaian
state-nya dilakukan **saat render** (pola _storing information from previous
renders_), sehingga kelas animasi sudah benar pada render yang sama dengan
perubahan prop — kotak tidak berkedip memainkan animasi masuk dulu — dan hanya
callback timer yang menyentuh state, jadi tidak ada render berantai saat pemain
diam. Kotak yang tampil sendiri — obrolan singkat maupun kotak quest saat
penandanya jadi **beacon tepi layar** — dirender `InteractHint.tsx` dan
**selalu dipusatkan** pada titik kaki NPC (`-translate-x-1/2`), jadi lurus
vertikal dengan papan nama dan karakter di bawahnya. Obrolan singkat muncul
sebagai pop-up (`animate-quest-pop`), bukan meluncur ke kanan, karena tidak ada
penanda untuk dituju; kotak quest yang tampil sendiri tetap meluncur keluar dari
`!` (`animate-quest-slide-in`). Kotak standalone juga punya animasi **keluar**
yang halus saat pemain meninggalkan zona: `NpcHintLayer.tsx` menahan kotak
terakhir di DOM selama `DURASI_KELUAR_MS` lalu mengirim `keluar: true`, jadi
obrolan singkat memudar & menyusut (`animate-quest-pop-out`) dan kotak quest
yang tampil sendiri meluncur masuk kembali ke `!` (`animate-quest-slide-out`).
Karena `hint` sendiri tetap langsung `null`, paket penanda quest tetap memulai
animasi keluarnya lewat `NpcMarker` tanpa jeda tambahan. Animasi hanya jalan
sekali per kemunculan: React memakai ulang kotak yang sama saat koordinatnya
berubah tiap frame. Zona interaksi
memakai histeresis — masuk di 30 px, keluar di 38 px — supaya kotak tidak
berkedip saat pemain berdiri di batas zona. Speaker disorot, beat `transition`
fade otomatis, beat `challenge` dibuka sebagai overlay React.

Dunia dibangun **sekali** di `create()`: tidak ada `roomId`, tidak ada bangun
ulang saat pindah chapter. Perpindahan scene hanya menukar musik dan NPC pemberi
quest; posisi terakhir pemain dipertahankan. Spawn hanya dipakai saat memulai
cerita atau saat "Ulangi chapter".

`ChallengeScene` **tidak ada** — tantangan adalah overlay React.

## Pemuatan aset

`PreloadScene` memuat **seluruh aset dunia** (kind `world`: peta, 80 potongan
objek, 10 spritesheet karakter, dan musik default) karena dunia tidak bisa
dirender sebagian. Aset cerita ditambahkan di atasnya lewat
`collectStoryAssets(story)` di `src/game/sceneAssets.ts`:

```ts
const dipakai = new Set<string>(RUNTIME_ASSET_IDS);

for (const chapter of story.chapters) {
  if (chapter.backgroundId) dipakai.add(chapter.backgroundId);
  if (chapter.musicId) dipakai.add(chapter.musicId);
  for (const scene of chapter.scenes) {
    if (scene.backgroundId) dipakai.add(scene.backgroundId);
    if (scene.musicId) dipakai.add(scene.musicId);
  }
}

for (const karakter of story.cast) {
  dipakai.add(karakter.spriteId);
}

return ASSETS.filter((asset) => dipakai.has(asset.id));
```

Aturan:

- Key di Phaser **sama dengan `assetId`**. Jangan membuat key lain.
- Spritesheet karakter memakai `frameWidth`/`frameHeight` dari manifest, karena
  tiap karakter desa punya lebar frame sendiri.
- Tanpa penanganan `loaderror` dan tanpa sprite cadangan: `manifest.test.ts`
  menjamin setiap id manifest punya berkasnya.
- Tampilkan progress yang jujur; jangan freeze tanpa indikator.

## Bridge Phaser ↔ React

Implementasi: `src/game/gameBus.ts` — emitter kecil bertipe (bukan
`EventEmitter` global) agar mudah dites dan tidak bocor antar-instance.

Event yang dikirim **dari** Phaser:

```ts
type GameEvent =
  | { type: "dialogue"; view: DialogueView }
  | { type: "prompt"; hint: PromptView | null }
  | { type: "markers"; markers: NpcMarker[] }
  | { type: "nametags"; plates: NpcNameplate[] }
  | { type: "challenge"; view: ChallengeView }
  | {
      type: "graded";
      challengeId: string;
      correct: boolean;
      explanation: string;
    }
  | { type: "finished"; result: PlayResult; answers: Answer[] }
  | {
      type: "log";
      name: string | null;
      text: string;
      sceneJudul: string | null;
    }
  | { type: "quest"; view: QuestState }
  | { type: "skipping"; aktif: boolean }
  | { type: "error"; code: string };
```

`DialogueView` = `{ visible, name, text, waiting }`; `PromptView` =
`{ text, x, y }`, `NpcMarker` = `{ npcId, x, y, tepi?, sudut? }`, dan
`NpcNameplate` = `{ npcId, nama, x, y }`, semuanya dalam koordinat layar internal
640×360 (sudah dikurangi scroll kamera). `nama` berasal dari `cast.name` dan
dipakai papan nama di atas kepala NPC; papan nama dikirim untuk **semua** NPC
yang terlihat, terpisah dari penanda quest. Untuk `NpcMarker`, `tepi: true`
berarti NPC di luar pandangan sehingga posisinya sudah dijepit ke area aman di
tepi layar dan `sudut` (derajat, 0 = kanan) memutar penunjuk beacon. `QuestState`
berisi
chapter, scene aktif, daftar quest turunan scene, dan `activeQuestId`; status
`selesai | aktif | terkunci` dihitung dari posisi `StoryRunner`, bukan ditulis di
Story JSON. Teks dialog dikirim bertahap saat typewriter berjalan, dan React tidak
perlu tahu beat mana yang aktif.

Perintah **ke** Phaser:

```ts
type GameCommand =
  | { type: "submit_answer"; challengeId: string; answer: Answer }
  | { type: "resolve_challenge"; challengeId: string; correct: boolean }
  | { type: "advance" }
  | { type: "skip_start" }
  | { type: "skip_stop" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "restart_chapter" }
  | { type: "set_audio"; music: number; sfx: number }
  | { type: "freeze" }
  | { type: "unfreeze" };
```

Aturan yang mengikat:

- `challenge` membawa `ChallengeView` dari `challengeView.ts` — **tanpa**
  `correctOptionId`, `correctAnswer`, `correctOrder`, `acceptedAnswers`, atau
  `explanation`. Overlay tidak boleh menerima jawaban.
- Penilaian dijalankan di sisi game (pemegang `Story`) memakai `scoreAnswer()`
  dari `src/story/scoring.ts`; hasilnya dikirim sebagai `graded`.
- **Jawaban salah yang masih punya percobaan tidak mengirim `graded`.** Game
  memutar `onWrong.detour` lewat jalur `dialogue`/`log` yang sama dengan beat
  biasa, lalu membuka ulang tantangan yang sama dengan teks soal ulang. `graded`
  — termasuk `explanation` — hanya dikirim sekali, untuk hasil final (benar atau
  percobaan terakhir).
- Selama fase `challenge`, input dialog diabaikan sampai `resolve_challenge`
  diterima. `skip_start`/`skip_stop` memajukan beat bertahap ala tahan-tombol
  Persona (time-lapse 100 ms per beat selama ditahan) dan berhenti di beat soal;
  hanya beat dialog/narasi yang dilewati, dan beat `transition` tetap diputar.
  Saat time-lapse berjalan, event `skipping` mengabarkan `aktif: true/false`
  supaya DOM bisa menampilkan status.
- `pause` membekukan loop scene dan mengecilkan musik; `freeze` (buku log)
  membekukan dunia tanpa mengecilkan musik.

## Alur state

`StoryRunner` adalah **state machine murni** yang tidak tahu Phaser:

```ts
type RunnerState = {
  chapterIndex: number;
  sceneIndex: number;
  beatIndex: number;
  phase: "explore" | "dialog" | "challenge" | "chapter_end" | "done";
};

export function advance(state: RunnerState, story: Story): RunnerState;
export function currentBeat(state: RunnerState, story: Story): Beat;
export function resolveChallenge(state: RunnerState, story: Story): RunnerState;
```

Phaser hanya **menampilkan** hasil `currentBeat`. Ini membuat logika cerita bisa
dites tanpa browser dan tanpa Phaser.

Pergantian bab juga dijalankan `GameScene`, bukan menunggu tombol: begitu
`akhirBab()` benar (`phase === "chapter_end"`), scene menjadwalkan `advance()`
sendiri setelah `JEDA_AKHIR_BAB_MS`, jadi bab berikutnya terbuka otomatis di
fase `explore`. Predikat `akhirBab()` ada di `StoryRunner.ts` supaya aturan
"ini akhir bab" tidak tersebar sebagai perbandingan string di scene.

## Konsekuensi performa

- Satu instance `Phaser.Game` per halaman. Jangan membuat game baru tiap render.
- `useEffect` dependency harus stabil (`story` di-memo; callback disimpan di ref).
- Aset audio dimuat sekali per cerita; jangan memuat ulang saat pindah scene.
- Hindari membuat `Text` baru setiap frame; update teks yang ada.

## Checklist implementasi

Yang sudah berlaku di kode hari ini:

- [x] `"use client"` di komponen host.
- [x] Phaser diimpor dinamis di dalam `useEffect`.
- [x] `game.destroy(true)` di cleanup.
- [x] `pixelArt: true`, `roundPixels: true`.
- [x] `scale.mode = NONE` + `zoom` dari `ukuranKanvas()`, tinggi dasar 360 dengan
      lebar adaptif (ADR 0009): skala bulat untuk pixel paling tajam, skala penuh
      saat sisa ruangnya terlalu besar.
- [x] `vertexRoundMode` `fullAuto` untuk objek terskala; posisi pemain dan NPC
      dibulatkan ke piksel utuh.
- [x] Key aset = `assetId`.
- [x] Bridge mengirim `GameEvent` dan menerima `GameCommand`.
- [x] Tidak ada state penting hanya di dalam Phaser (progres dihitung ulang dari
      `story`).
- [x] `bun run build` tidak menghasilkan error `window is not defined`.

Belum ada:

- [ ] `loaderror` punya fallback eksplisit (dijaga lewat `manifest.test.ts`).
- [ ] Persistensi progres ke `localStorage` (baru preferensi audio).
