---
status: draft
last_reviewed: 2026-11-10
owner: tim ClassQuest
---

# Game Player (Halaman Siswa)

Halaman `/play/[storyId]` adalah tempat cerita dimainkan. Ia harus ringan,
cepat, dan tidak pernah menampilkan error mentah.

## Struktur halaman

```text
src/app/play/[storyId]/page.tsx        (Server Component)
  ├─ ambil cerita published
  ├─ notFound() bila tidak ada
  └─ <GameShell story={story} />       (Client Component)
        ├─ <TitleScreen />             (DOM, sebelum Mulai)
        ├─ <GameCanvas />              (Phaser, dynamic import, setelah Mulai)
        ├─ <ChallengeOverlay />        (DOM)
        ├─ <QuestTracker />            (DOM)
        ├─ <NpcMarker />               (DOM)
        ├─ <ChapterCard />             (DOM, transisi)
        ├─ <QuestToast />              (DOM, transisi)
        ├─ <HUD />                     (DOM)
        ├─ <PauseMenu />               (DOM)
        └─ <ResultScreen />            (DOM, saat selesai)
```

Server Component **tidak** merender Phaser. Ia hanya mengambil data dan
menyerahkan JSON ke client.

> **Yang ada hari ini:** `TitleScreen`, `GameShell`, `GameCanvas`,
> `ChallengeOverlay`, `QuestTracker`, `NpcMarker`, `ChapterCard`, `QuestToast`,
> `HUD`, `PauseMenu`, dan `ResultScreen` sudah ada.
>
> `/play/[storyId]` sudah berjalan, tetapi cerita masih dibaca dari fixture
> (`src/game/demoStory.ts`), bukan dari `getPublishedStory()`. Hanya id cerita
> demo yang dikenali (`generateStaticParams`); id lain → 404. Progres
> `localStorage` dan layar "Lanjutkan" **belum** ada.

## Pengambilan data

```tsx
export default async function PlayPage(props: PageProps<"/play/[storyId]">) {
  const { storyId } = await props.params;
  const story = await getPublishedStory(storyId);
  if (!story) notFound();

  return <GameShell story={story} />;
}
```

Aturan:

- Hanya versi `published` yang boleh diambil.
- Jangan mengembalikan `draft` ke siswa, walaupun tahu `storyId`.
- `generateMetadata` memakai judul cerita.
- Respons `GET /api/stories/[storyId]` memakai `Cache-Control: no-store`.

## State di client

```ts
type GameShellState =
  | { phase: "judul" }
  | { phase: "loading" }
  | { phase: "ready" }
  | { phase: "playing"; chapterIndex: number; sceneIndex: number }
  | { phase: "paused" }
  | { phase: "finished"; result: PlayResult }
  | { phase: "error"; code: string };
```

Ini **state layar**, bukan state cerita. Soal yang sedang terbuka dilacak oleh
`RunnerState.phase === "challenge"` di [`../04-game/engine.md`](../04-game/engine.md#alur-state);
`GameShell` hanya menampilkan overlay-nya. Pemetaan lengkap ada di
[`../04-game/interaction-loop.md`](../04-game/interaction-loop.md#dua-state-bukan-satu).

Implementasi sekarang memegang `judul | main | hasil` di `GameShell`, sedangkan
`paused` dipegang `GameCanvas` karena menu jeda hanya relevan selama sesi
permainan aktif. `QuestTracker` menerima daftar quest lewat event `quest` dari
Phaser, diturunkan dari scene dan status runner — bukan ditebak dari DOM.

State ini yang bertahan saat komponen di-remount oleh `<Activity>` (lihat
[`../04-game/engine.md`](../04-game/engine.md)). Sumber kebenaran progres:
`localStorage`, bukan Phaser.

## Layar

### Loading

- Latar gelap sesuai palet game.
- Canvas menampilkan teks progres `Memuat… N%` selama aset cerita dimuat;
  layar loading DOM dengan judul cerita belum dibuat.
- Tombol "Batal" kembali ke halaman awal.

### Ready / judul

- Layar penuh dengan latar `bg_mountain_night` dan sprite pemain dari `cast`.
- Judul, synopsis singkat, mata pelajaran, kelas, jumlah chapter, perkiraan
  durasi.
- Tombol "Mulai", "Kontrol", dan "Kembali". Panah atas/bawah memindahkan
  fokus, Enter menjalankan pilihan.
- Phaser **baru** dipasang setelah "Mulai" ditekan; sebelum itu tidak ada
  kanvas yang berjalan di latar belakang.
- Tombol "Lanjutkan" (bila ada progres valid) belum ditampilkan karena progres
  `localStorage` belum ada.

### Playing

- Canvas fullscreen (letterbox bila rasio beda).
- Panel quest di kiri atas: `Chapter n/total`, judul scene aktif, dan daftar
  scene chapter itu dengan status `Aktif`/`Selesai`/`Terkunci` plus hitungan
  tantangan yang sudah dijawab.
- HUD kanan atas: tombol jeda dan tombol suara. Judul chapter tidak menetap di
  HUD; ia muncul sebentar sebagai `ChapterCard` saat bab berganti, dan
  `QuestToast` memberi tahu saat quest baru dimulai.
- Penanda `!` hanya ada di atas NPC pemberi quest. Saat pemain mendekat, chip
  `Space` menggantikan penanda itu. Keduanya memakai koordinat layar yang ikut
  kamera dan disembunyikan selama dialog, tantangan, atau menu jeda.
- Tombol suara mengatur `sound.mute` Phaser; preferensi berlaku untuk musik dan
  SFX. Musik mulai setelah "Mulai" ditekan (aturan autoplay browser), lalu
  berganti hanya saat `musicId` scene berubah.
- Klik di mana saja untuk lanjut.

### Challenge

![Panel tantangan di atas dialog](../assets/challenge-overlay.svg)

- Panel DOM selebar 95% diletakkan **di atas dialog**, bukan di tengah layar.
  Dialog terakhir tetap terlihat dan typewriter-nya dibekukan.
- Tidak ada lapisan gelap penuh; hanya panel gelap hampir pekat.
- Isi soal digulir di dalam panel bila panjang; tombol aksi menempel di bawah.
- Di layar sangat pendek, panel memakai hampir seluruh tinggi ruang game dan
  boleh menutup dialog (fallback) supaya soal tetap terbaca.
- Fokus keyboard masuk ke panel saat muncul dan kembali ke area game saat
  ditutup.
- `Esc` tidak menutup overlay sebelum soal dijawab; lihat
  [`../04-game/accessibility.md`](../04-game/accessibility.md#keyboard).
- Keempat tipe soal punya UI jawaban sendiri:
  - `multiple_choice` / `true_false`: daftar opsi; angka `1`–`5` memilih,
    panah atas/bawah memindah sorotan, `Enter` mengirim.
  - `ordering`: tombol naik/turun per item (bukan drag), urutan awal diacak
    deterministik per `challengeId` agar tidak sama dengan urutan cerita.
  - `short_answer`: satu input teks; `Enter` atau tombol "Jawab" mengirim.
- Overlay hanya mengirim jawaban mentah. Trim, lowercase, dan pembuangan tanda
  baca akhir dilakukan `src/story/scoring.ts`, bukan di komponen.
- `hints` tampil sebagai catatan kecil bila ada; jawaban benar tidak pernah ikut
  ke `ChallengeView`.

### Paused

- Lanjut, ulangi chapter, suara, keluar.
- Game di-pause (`scene.pause()`), input dialog berhenti.
- Musik tidak dihentikan, hanya dikecilkan (volume 0,35 → 0,12) agar jeda tidak
  terasa memutus suasana; volume kembali saat lanjut atau ulangi chapter.
- Fokus masuk ke tombol "Lanjut" dan kembali ke tombol HUD saat menu ditutup.

### Finished

- Skor dan jumlah benar.
- Daftar `weakConcepts` dengan kalimat: "Coba ulang bagian ini: Kondensasi".
- Tombol "Main lagi" dan "Kembali ke awal".
- Tanpa ranking, tanpa perbandingan dengan siswa lain.

### Error

| Kode                 | Pesan ke siswa                                    |
| -------------------- | ------------------------------------------------- |
| `STORY_NOT_FOUND`    | "Cerita ini tidak ditemukan."                     |
| `SCHEMA_UNSUPPORTED` | "Cerita ini dibuat dengan versi yang lebih baru." |
| `UNKNOWN`            | "Terjadi masalah. Coba muat ulang halaman."       |

Aset yang gagal dimuat **bukan** layar error: game memakai placeholder
(`bg_default`, `char_default`) dan menampilkan satu toast kecil. Lihat tabel
penanganan error di [`../04-game/interaction-loop.md`](../04-game/interaction-loop.md#penanganan-error-runtime).

## Responsif

| Layar             | Perilaku                                                     |
| ----------------- | ------------------------------------------------------------ |
| Desktop ≥ 1024 px | Canvas 16:9 di tengah, HUD di atas                           |
| Tablet            | Sama, overlay lebih lebar                                    |
| HP landscape      | Canvas memenuhi lebar, HUD kecil                             |
| HP portrait       | Saran "Putar layar untuk pengalaman terbaik" (bisa dilewati) |

Jangan memaksa fullscreen API; sediakan tombol opsional.

## Berbagi

Guru membagikan:

- tautan `/play/[storyId]`,
- kode kelas (opsional, `TBD`).

Siswa tidak perlu akun. Nama panggilan opsional, disimpan lokal.

## Performa

| Target                         | Cara                                                 |
| ------------------------------ | ---------------------------------------------------- |
| First content < 2 s            | Shell HTML + skeleton; Phaser dimuat setelahnya      |
| Aset hanya yang dipakai        | `assetUsage`                                         |
| Tidak ada layout shift         | Host canvas punya rasio tetap (`aspect-ratio: 16/9`) |
| Bundle Phaser tidak di landing | Dynamic import hanya di halaman game                 |

Ukuran Phaser besar (~1 MB+). Jangan mengimpor Phaser di halaman guru atau
landing.

## Integrasi overlay

```tsx
<GameCanvas story={story} onEvent={handleGameEvent} />;

{
  beat.type === "challenge" && (
    <ChallengeOverlay
      challenge={findChallenge(story, beat.challengeId)}
      onResolve={(answer) => {
        const correct = isCorrect(challenge, answer);
        recordAnswer(challenge.id, correct);
        bridge.send({
          type: "resolve_challenge",
          challengeId: challenge.id,
          correct,
        });
      }}
    />
  );
}
```

`beat` berasal dari `currentBeat(runner, story)` — fungsi murni yang sama yang
dipakai Phaser untuk menampilkan dialog. Jadi overlay dan canvas tidak mungkin
menunjuk soal yang berbeda.

Aturan:

- `ChallengeOverlay` menerima `ChallengeView` tanpa jawaban benar.
- Penilaian di `GameShell`, bukan di overlay.
- Setelah resolve, overlay menampilkan penjelasan sebelum ditutup.

## Progres

- Simpan setelah setiap beat (throttle 500 ms).
- Kunci: `classquest:progress:{storyId}`.
- Saat mount, baca progres; kalau `storyVersion` beda → tawarkan mulai ulang.
- Saat selesai, simpan `PlayResult` dan tandai selesai.

## Checklist implementasi

- [ ] Hanya cerita `published` yang bisa diakses.
- [ ] `notFound()` untuk id tidak dikenal.
- [ ] Phaser hanya dimuat di halaman game.
- [ ] Host canvas punya rasio tetap.
- [ ] Overlay tidak menerima jawaban benar.
- [ ] Progres bisa dipulihkan.
- [ ] Error aset tidak menghentikan permainan.
- [ ] Bisa dimainkan dengan keyboard.
- [ ] Tidak ada error `window is not defined` saat build.
