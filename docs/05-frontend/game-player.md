---
status: draft
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# Game Player (Halaman Siswa)

Halaman `/play/[storyId]` adalah tempat cerita dimainkan. Ia harus ringan,
cepat, dan tidak pernah menampilkan error mentah.

## Struktur halaman

```text
src/app/play/[storyId]/page.tsx        (Server Component)
  ├─ ambil cerita published + kelas (?kelas=)
  ├─ notFound() bila tidak ada
  └─ <GameShell story={story} />       (Client Component)
        ├─ <EntryScreen />             (DOM, layar masuk: pilih nama)
        ├─ <MainMenu />                (DOM, menu utama sebelum Mulai)
        ├─ <GameCanvas />              (Phaser, dynamic import, setelah Mulai)
        │    └─ <LoadingScreen />      (DOM, menutup layar sampai scene pertama siap)
        ├─ <ChallengeOverlay />        (DOM)
        ├─ <QuestTracker />            (DOM)
        ├─ <NpcHintLayer />            (DOM: penanda `!` + kotak `Space`)
        ├─ <ChapterCard />             (DOM, transisi)
        ├─ <QuestToast />              (DOM, transisi)
        ├─ <HUD />                     (DOM)
        ├─ <PauseMenu />               (DOM)
        └─ <ResultScreen />            (DOM, saat selesai)
```

Server Component **tidak** merender Phaser. Ia hanya mengambil data dan
menyerahkan JSON ke client.

> **Yang ada hari ini:** `EntryScreen`, `MainMenu`, `GameShell`, `GameCanvas`,
> `LoadingScreen`, `ChallengeOverlay`, `QuestTracker`, `NpcHintLayer` (berisi
> `NpcMarker` dan `InteractHint`), `ChapterCard`, `QuestToast`, `HUD`,
> `PauseMenu`, dan `ResultScreen` sudah ada.
>
> `/play/[storyId]` membaca cerita terbit lewat `getPlayEntry()`
> (`src/server/play/entry.ts`), yang memakai `getPublishedStory()`. Hanya
> `status = 'published'` dengan `published_version` yang dilayani; status lain,
> id tidak dikenal, dan id tidak valid → 404. Id demo `st_demo_siklus_air` tetap
> memakai fixture `src/game/demoStory.ts` supaya pengembangan frontend tidak
> butuh database. Progres `localStorage` dan tombol "Lanjutkan" ada di
> `src/game/progress.ts` + `GameShell`; siswa yang me-refresh melanjutkan dari
> awal scene terakhir.

## Layar masuk

Setiap hasil main harus punya nama, jadi `/play/[storyId]` membuka
`EntryScreen` lebih dulu. Gurunya yang menentukan kelas lewat tautan yang
dibagikan:

```text
/play/st_abc123?kelas=QST-7K3M
```

Aturan:

- **Kode kelas divalidasi di server** (`getPlayEntry`). Kelas hanya dipakai bila
  kodenya sah dan pemiliknya guru pemilik cerita. Kelas guru lain diperlakukan
  sama seperti kode salah: tidak ada daftar siswa, `classLinkInvalid: true`.
- **Siswa memilih namanya dari daftar kelas**, bukan mengetik bebas sebagai
  jalan utama. Daftar bisa dicari dengan nama atau NIS. Nama bebas tetap
  tersedia untuk dua kasus: tautan tanpa `?kelas=`, atau nama siswa belum
  terdaftar guru.
- **Identitas dikirim sebagai `studentId`**, bukan nama. Server menurunkan nama
  dan `classroom_id` dari baris `students`, jadi kelas tidak pernah dipercaya
  dari klien. Nama bebas dikirim sebagai `nickname`.
- Kode salah **tidak** membuat halaman 404: siswa tetap bisa bermain, layar
  masuk menjelaskan bahwa hasilnya tidak masuk analytics kelas.
- Yang dikirim ke client hanya `id`, `name`, dan `nis` siswa — tanpa username,
  password hash, tahun ajaran, atau data guru.
- Tidak ada akun siswa, cookie identitas, atau penyimpanan nama di
  `localStorage`. Nama hanya hidup di state `GameShell` selama sesi main.
  (`localStorage` hanya menyimpan progres cerita dan pengaturan audio.)

### Gerbang kode kelas (`/play`)

Siswa yang tidak membawa tautan guru membuka `/play` (ADR 0039 + ADR 0041).
Halaman itu statis dan hanya memasang `PlayGate`; tidak ada `storyId` di URL.

1. **Form kode + NIS** — kolom kode kelas paling atas, lalu **NIS**. Nama atau
   username **tidak** lagi diminta di sini. Server Action
   `masukKelas({ kode, nis })` mencari kelas, **game terbit milik guru pemilik
   kelas itu**, dan NIS di daftar murid guru tersebut.
2. **NIS tidak ada di daftar → tidak bisa masuk.** Pesan "NIS itu tidak ada di
   daftar murid gurumu" tampil di form, dan tidak ada layar berikutnya. Murid
   tanpa NIS atau yang NIS-nya salah ketik harus memperbaikinya lewat guru.
3. **NIS cocok → konfirmasi nama lengkap.** Server mengirim nama dari baris
   `students`; layar konfirmasi menampilkan NIS, nama lengkap, dan kelas lalu
   bertanya "Ini kamu, benar?". Tombol **"Benar, lanjut main"** memasang
   `GameShell`; **"Bukan saya"** kembali ke kolom NIS yang kosong.
4. **Satu game terbit** → konfirmasi lalu langsung dimainkan. **Beberapa game** →
   siswa memilih dulu dari daftar game guru itu
   (`masukKelas({ kode, nis, storyId })`), tetap **sesudah** NIS diperiksa.
   Kelas tanpa game terbit dijawab "belum punya game".
5. **Tanpa navigasi.** Kode dan NIS tidak masuk URL atau `sessionStorage`; refresh
   kembali ke form, progres cerita tetap di `localStorage`.
6. **Batas tebak kode** 30 percobaan per 10 menit per IP (memori, fail open).
7. **Demo tetap di `/demo`**, ditautkan dari form sebagai "Coba demo tanpa kode
   kelas".

Jalur tautan guru (`/play/[storyId]?kelas=QST-XXXX`) **tidak berubah**: siswa
memilih namanya dari daftar kelas dan nama bebas masih boleh. Aturan NIS wajib
hanya berlaku di gerbang `/play`.

## Pengambilan data

```tsx
export default async function PlayPage(props: PageProps<"/play/[storyId]">) {
  const { storyId } = await props.params;
  const search = await props.searchParams;
  const kelas = typeof search.kelas === "string" ? search.kelas : null;

  const entry = await getPlayEntry(storyId, kelas);
  if (entry === null) notFound();

  return (
    <GameShell
      story={entry.story}
      classroom={entry.classroom}
      students={entry.students}
      classLinkInvalid={entry.classLinkInvalid}
      requireIdentity
    />
  );
}
```

Aturan:

- Hanya versi `published` yang boleh diambil.
- Jangan mengembalikan `draft` ke siswa, walaupun tahu `storyId`.
- `generateMetadata` memakai judul cerita.
- Respons `GET /api/stories/[storyId]` memakai `Cache-Control: no-store`.
- Status 404 asli dibuat oleh `src/proxy.ts`, bukan oleh halaman. Dengan Cache
  Components + Partial Prefetching, `/play/[storyId]` adalah route `◐`: App
  Shell terkirim lebih dulu (status 200), lalu `notFound()` berjalan — hasilnya
  soft 404 (`200` + UI 404 + `noindex`). Proxy memeriksa `getPlayableStory()`
  **sebelum** halaman dirender dan menulis ulang ke `/_not-found`, sehingga
  checker/analytics melihat `404`.
- `export const instant = false` di halaman menandai route ini boleh memblokir
  saat menunggu baca database. Ini hanya mematikan validasi instant-navigation,
  bukan model render.

## State di client

```ts
type GameShellState =
  | { phase: "menu" }
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

Implementasi sekarang memegang `masuk | menu | main | hasil` di `GameShell`;
sedangkan `paused` dipegang `GameCanvas` karena menu jeda hanya relevan selama
sesi permainan aktif. Fase `loading | ready` dipetakan ke overlay `LoadingScreen`
di dalam `GameCanvas`: `loading` = progres aset belum penuh atau scene pertama
belum siap, `ready` = event `ready` sudah datang dan layar muat sedang memudar.
Selama overlay itu masih menutup layar, shortcut papan ketik `GameCanvas` (Esc,
Q, B) sengaja mati — tidak ada permainan yang bisa dijedakan, dan Tab harus bisa
keluar dari tombol "Batal". `QuestTracker` menerima daftar quest lewat event
`quest` dari Phaser, diturunkan dari scene dan status runner — bukan ditebak dari
DOM.

State ini yang bertahan saat komponen di-remount oleh `<Activity>` (lihat
[`../04-game/engine.md`](../04-game/engine.md)). Sumber kebenaran progres:
`localStorage`, bukan Phaser.

## Layar

### Menu utama

Dipakai `GameShell` untuk **semua** route: `/demo` (demo) dan `/play/[storyId]`
(tautan guru). Dulu `/play` punya layar judul sendiri (`TitleScreen`, latar
`map_village` + ringkasan cerita); layar itu sudah dihapus supaya tampilan
sebelum mulai sama di mana pun siswa masuk. `/play` tetap membuka `EntryScreen`
lebih dulu bila siswa perlu memilih nama, lalu menu ini.

- Satu gambar desa utuh (`public/menu/desa.webp`) memenuhi layar. Teks menu
  berdiri **langsung di atas gambar**, di bawah naungan pohon kiri atas, tanpa
  panel — jadi seluruh desa tetap terlihat. Di layar < 768 px papan teksnya
  diberi latar gelap transparan sendiri, karena crop gambar menaruh rumah terang
  di belakang teks.
- Isi papan: judul "CLASS QUEST" (serif tebal), garis emas berhiaskan bintang,
  empat pilihan — `Mulai`, `Pengaturan`, `Kredit`, `Keluar` — petunjuk tombol, dan
  label versi di bawah. Pilihan aktif ditandai segitiga emas + warna emas.
  Bila ada progres tersimpan, daftar menjadi lima: `Lanjutkan` di paling atas,
  lalu `Mulai ulang`, `Pengaturan`, `Kredit`, `Keluar`.
- Keyboard-first: `↑`/`↓` (atau `W`/`S`) memindahkan sorotan dan memindahkan
  fokus DOM, `Home`/`End` ke ujung daftar, `Enter`/`Space` menjalankan pilihan.
  `Tab` tidak pernah diambil alih. Selama dialog terbuka, panah tidak menggerakkan
  menu karena fokus milik dialog.
- `Mulai` langsung menyalakan permainan (`GameCanvas`) tanpa layar perantara —
  judul sudah diwakili menu ini, dan dua menu berurutan membingungkan. Bila ada
  progres sah, `Lanjutkan` melanjutkan dari awal scene terakhir dan `Mulai`
  berganti label jadi `Mulai ulang` (menghapus progres lalu mulai dari bab 1).
- Progres datang dari `useSyncExternalStore` (`src/game/progressStore.ts`):
  snapshot server `null` supaya HTML server dan render klien pertama sama, lalu
  React membacanya setelah hydration. Kursor hasil pilihan itu diberikan ke
  `GameCanvas` sebagai `mulaiDari`.
- `Pengaturan` membuka dialog berisi slider **Musik** dan **Efek suara** terpisah,
  membaca dan menulis `classquest:settings:v1` yang sama dengan
  [`../../src/game/audioSettings.ts`](../../src/game/audioSettings.ts). Nilai
  dibaca saat dialog dibuka (bukan saat mount) supaya render server dan client
  tidak berbeda. `Simpan` menutup dialog dan memberi tahu lewat `role="status"`.
- `Kredit` berisi asal-usul cerita dan lisensi font. `Keluar` membuka konfirmasi
  yang menautkan ke `/` (halaman pemilihan peran) — bukan menutup tab, karena
  `window.close()` tidak diizinkan peramban.
- Kelopak sakura ditulis dengan nilai tetap (bukan `Math.random()`) agar render
  server dan client sama, hanya jatuh di paruh kanan (area pohon), dan
  disembunyikan total saat `prefers-reduced-motion: reduce`.

### Loading

Seluruh layar muat hidup di DOM (`src/components/game/LoadingScreen.tsx`), bukan
di canvas. Dulu progres hanya teks `Memuat… N%` yang digambar Phaser: canvas
640×360 di-upscale 1,6×, jadi hurufnya bergerigi dan tidak terbaca pembaca layar.

- Latar malam pixel sesuai palet game: langit bergradasi, bintang berkelip,
  bulan, dan dua lapis bukit berundak. Semuanya **CSS murni** (tanpa berkas
  gambar) supaya layar muat tidak ikut menunggu unduhan apa pun.
- Isi: label `ClassQuest` + jumlah bab, mata pelajaran · kelas, judul cerita,
  bilah progres bersegmen, status, persen, satu tips yang berganti pelan, dan
  tombol "Batal".
- Tiga keadaan:
  - **Tak tentu** — skrip game (`import()` Phaser) belum siap, jadi bilah
    menyapu dan persen tidak dikarang (`aria-valuenow` kosong).
  - **Terukur** — `PreloadScene` mengirim `{ type: "loading", progress }` lewat
    `GameBus`; persen dijepit 0–100 dan status bergerak dari "Memuat aset desa…"
    ke "Menyusun scene pertama…".
  - **Gagal** — `import()`/`createGame()` ditolak: bilah diganti pesan
    "Game gagal dimuat…" + tombol "Coba lagi" yang memuat ulang Phaser di layar
    yang sama. Layar muat tidak pernah berputar selamanya.
- `GameScene.create()` mengirim `{ type: "ready" }` **setelah** dunia, pemain,
  kamera, dan beat pertama berdiri. `LoadingScreen` baru memudar sesudahnya
  (jeda 320 ms + pudar 320 ms), jadi tidak ada kanvas kosong yang sempat
  terlihat. `PreloadScene` sengaja tidak mengirim `ready`: di sana canvas masih
  kosong.
- Tombol "Batal" mengembalikan siswa ke menu utama lewat prop `onBatal` — sama
  di `/demo` maupun `/play/[storyId]`. Tidak menutup tab (`window.close()` tidak
  diizinkan peramban).
- Bintang ditulis dengan nilai tetap (bukan `Math.random()`) agar render server
  dan client sama. Semua `animation` berada di dalam
  `@media (prefers-reduced-motion: no-preference)`; dengan `reduce`, bintang
  berhenti di satu tingkat terang dan bilah tidak beranimasi.

### Playing

- Kanvas diskalakan lewat `ukuranKanvas()` (`Scale.NONE` + `zoom`): kanvas selalu
  tampil utuh (tidak pernah ter-crop). Skala **bulat** dipakai saat sisa ruang
  kontainer ≤6% (pixel paling tajam); selain itu skala **penuh** supaya kanvas
  mengisi bingkai — di jendela laptop 1366×660 dulu hanya dapat 960×360. Halaman
  memberi margin 8–24 px dan sudut membulat, jadi sisa ruang terbaca sebagai
  bingkai jendela, bukan kanvas yang menempel ke tepi.
- Tombol buku quest di kiri atas (`Q` Quest): membuka jendela buku catatan ala Minecraft journal dengan 2 halaman perkamen yang menampilkan bab, judul scene, daftar tugas dengan status `Aktif`/`Selesai`/`Terkunci`, dan hitungan tantangan. Dapat dibuka/tutup dengan tombol `Q` atau `Esc`.
- HUD kanan atas: tombol quest, percepat, musik, catatan, jeda, dan layar
  penuh. Semua tombol HUD dan quest menampilkan tombol keyboardnya sebagai
  keycap konsisten (`Tab`, `B`, `Q`, `Esc`) lewat komponen `Keycap`, dan
  memakai satu **desain yang sama dengan panel kotak dialog** — gelap `#0b120e`
  dengan bingkai dan aksen oranye `#E8A87C` serta teks krem terang `#F7F4EC`,
  sudut membulat — supaya terlihat konsisten (ADR 0029, ADR 0031). Di desktop (`lg`, ≥1024px) ukuran tombolnya sengaja diperbesar
  agar nyaman diklik; di HP tetap ringkas. Judul chapter tidak menetap di
  HUD; ia muncul sebentar sebagai `ChapterCard` saat bab berganti, dan
  `QuestToast` memberi tahu saat quest baru dimulai.
- **Pergantian bab berjalan otomatis.** Setelah beat terakhir sebuah bab selesai,
  GameScene membuka bab berikutnya sendiri (jeda singkat, lalu `ChapterCard`
  menandai bab baru). Pemain tidak perlu menekan tombol untuk lanjut; menekan
  Space/Enter hanya mempercepat. Cerita yang sudah bab terakhir langsung masuk
  ke `ResultScreen` lewat jalur yang sama.
- **Papan nama** muncul di atas kepala **semua** NPC yang terlihat (dari
  `cast.name`), rapat di atas sprite, supaya siswa mengenali siapa saja di desa.
  NPC pemberi quest ditandai **kotak `!`** bergaya HUD di atas papan namanya; UI
  kotak ini sama persis di dua keadaan supaya konsisten. Saat pemain dekat, kotak
  hanya naik-turun ringan. Saat NPC di luar pandangan, kotak menjadi **beacon** di
  tepi layar dengan cincin denyut dan penunjuk kecil di atas kotak yang berputar
  mengikuti arah NPC. Beacon tetap dekat tepi bingkai game, tetapi penunjuk arah
  dan cincin denyutnya utuh di semua sisi — jarak aman (`INSET_PENANDA` 24 px)
  selalu lebih besar dari jangkauan penunjuk, jadi tidak ada bagian yang
  terpotong tepi kanvas. Beacon juga tembus klik, jadi tidak ada tombol HUD yang
  tertutup. Beacon ikut bergeser saat pemain berjalan mendekat, lalu berubah
  kembali menjadi kotak `!` ketika NPC masuk layar. Kotak `!` **tidak** hilang
  saat pemain mendekat: kotak `Space` menjadi **satu paket** dengannya — duduk
  rapat di kanan `!` (`left-full`, tinggi sama) dan naik-turun bersama lewat satu
  pembungkus `animate-quest-bob`, jadi keduanya tidak terlihat terpisah. Saat
  muncul, kotak `Space` meluncur keluar dari `!` (`animate-quest-slide-in`);
  saat pemain keluar zona kotak meluncur masuk kembali ke `!`
  (`animate-quest-slide-out`) — ditahan di DOM 200 ms agar animasinya sempat
  jalan. Kotak yang tampil sendiri — obrolan singkat maupun kotak quest saat
  penandanya jadi beacon tepi layar — **selalu dipusatkan** (`-translate-x-1/2`)
  di titik kaki NPC, jadi lurus vertikal dengan papan nama dan karakter di
  bawahnya. Obrolan singkat muncul sebagai pop-up (`animate-quest-pop`), bukan
  meluncur ke kanan, dan saat pemain pergi kotak standalone juga beranimasi
  keluar dengan halus (`animate-quest-pop-out`, atau meluncur kembali ke `!`
  untuk kotak quest yang tampil sendiri) — ditahan di DOM 200 ms oleh
  `NpcHintLayer`. Zona interaksi memakai histeresis (masuk 44 px, keluar 52 px)
  supaya kotak tidak berkedip di batas zona. Posisi papan nama, penanda, dan
  kotak `Space` diperbarui tiap frame lewat `NpcHintLayer`, jadi tanda tetap
  menempel pada NPC saat kamera bergeser, dan disembunyikan selama dialog,
  tantangan, atau menu jeda.
- Tombol `Percepat` (`Tab`) tampil di HUD hanya selama fase dialog. Pola
  tahan-tombol ala Persona 3 Reload: selama ditahan, beat dialog/narasi maju
  seperti time-lapse dan garis kecepatan menyala di tepi atas/bawah kanvas
  (`SpeedLines`); dilepas, tempo kembali normal. Soal tidak bisa dilewati —
  tombol dan pintasan berhenti di beat tantangan, dan fade transisi tetap
  diputar. Di perangkat sentuh tombolnya didengarkan dari `window`
  (`pointerup`/`pointercancel`/`touchend`/`touchcancel`), supaya peramban ponsel
  yang mengubah ketukan-tahan jadi gestur gulir tidak mematikannya
  (ADR 0028).
- Tombol `Catatan` (`B`) membuka buku catatan dua halaman: riwayat dialog
  (dikelompokkan per scene, dengan chip nama pembicara) dan jurnal konsep
  (conceptTag, status benar/perlu diulang, penjelasan). Jendelanya **kartu
  membulat** dengan garis aksen oranye, dan area bacaannya memakai **scrollbar
  bertema** (`scrollbar-tema` di `globals.css`) alih-alih scrollbar bawaan
  peramban (ADR 0031). Dunia dibekukan
  selama buku terbuka; musik tetap diputar penuh. Buku dibersihkan saat
  "Ulangi chapter" atau sesi baru.
- Tombol musik (`♪`) mengatur volume musik saja: nyala/mati. Efek suara
  diatur terpisah di panel pengaturan menu jeda; keduanya dipisah supaya
  siswa bisa mematikan musik tanpa kehilangan umpan balik jawaban. Preferensi
  tersimpan di `localStorage` (`classquest:settings:v1`) dan dikirim ke scene
  lewat command `set_audio`. Musik mulai setelah "Mulai" ditekan (aturan
  autoplay browser), lalu berganti hanya saat `musicId` scene berubah.
- Klik di mana saja untuk lanjut.

### Challenge

![Panel tantangan di atas dialog](../assets/challenge-overlay.svg)

- Teks soal/pertanyaan ditampilkan langsung di dalam `DialogueBox` NPC, bukan elemen tambahan di atasnya.
- Yang melayang di atas dialog HANYA pilihan jawabannya:
  - Opsi pendek (seperti "1", "2", "4"): ditata 1 baris horizontal di kanan atas dialog.
  - Opsi teks panjang: ditata bertumpuk vertikal di kanan atas dialog; lebar seluruh box seragam mengikuti opsi terpanjang.
  - Persoalan matematika / matriks: ditata sebagai kartu berjejer agar formula terlihat jelas.
- **Lebar kotak mengikuti isi (fit text), bukan lebar panel.** Opsi pilihan, baris pengurutan, input jawaban singkat, dan tombol `Jawab` dibungkus grup `w-fit` sehingga hanya selebar isinya; pada daftar kolom, semua opsi diseragamkan ke opsi terpanjang (tanpa lebar minimum tetap). Jadi jawaban pendek tidak lagi membentang penuh ke kanan. Baris petunjuk pintasan ditaruh di luar grup agar tidak ikut menentukan lebarnya. (ADR 0030)
  - Pada `ordering`, daftar item dan tombol `Jawab` berbagi grup `w-fit` yang sama supaya tepi kanan keduanya rata.
  - Pada `short_answer`, input `size` mengikuti panjang placeholder sehingga teks petunjuk muat tanpa terpotong, dan tombol `Jawab` selebar input.
- Konsistensi visual HCI dengan DialogueBox (ADR 0030, ADR 0031):
  - Kotak jawaban, kartu matriks, kartu umpan balik, tombol aksi, dan petunjuk pintasan memakai **token kotak dialog** yang sama (`gayaDialog.ts`): latar gelap `#0b120e`/95, bingkai tipis aksen oranye `#E8A87C`, sudut membulat (`rounded-lg`), teks krem terang `#F7F4EC`, aksen oranye `#E8A87C`, flat tanpa drop shadow.
  - Keadaan terpilih memakai `KOTAK_DIALOG_AKTIF` (bingkai oranye penuh, latar sedikit terangkat); keadaan diam memakai `KOTAK_DIALOG` + hover. Dipilih dengan percabangan agar tidak menumpuk kelas warna yang bentrok.
  - Setelah dijawab (`graded`), pilihan box jawaban disembunyikan dan hanya kartu umpan balik yang muncul agar tidak memicu scrollbar; bingkai kartu berwarna status (`#6F9B7A` benar, `#C9A227` belum tepat).
  - Ukuran huruf dan line-height opsi dan penjelasan umpan balik proporsional dan nyaman dibaca (`ukuranHuruf(13.5, 12, 20)` & `lineHeight: 1.3`).
  - Penunjuk pilihan aktif adalah **tangan menunjuk (glove) SVG** yang digambar sendiri (bukan glyph font atau emoji) di **luar kotak** — kiri untuk daftar, atas untuk kartu, dan di depan input `short_answer`. Telapak krem `#F7F4EC` dengan outline gelap dan manset oranye `#E8A87C`, jadi tetap jelas di atas dunia terang maupun kotak gelap; saat tidak aktif ia `opacity-0` agar tata letak tidak bergeser.
  - Tombol aksi `Jawab` disejajarkan sempurna dengan kotak jawaban di atasnya dan memakai aksen oranye `#E8A87C`.
  - Teks petunjuk tombol shortcut (`hints`) memakai latar gelap `#0b120e`/95 dengan teks krem terang `#F7F4EC` untuk keterbacaan tinggi.
- Segitiga lanjut dialog `▼` diposisikan di **sudut kanan bawah kotak dialog**.
- Tanpa background kotak pembungkus hitam luar (hanya baris pilihan yang memiliki latar), tanpa tombol jawab/lanjut terpisah. Memilih opsi langsung mengirim respon dialog, dan kartu umpan balik cerita dapat diklik atau ditekan Spasi/Enter untuk lanjut.
- Kontrol keyboard-first meminimalkan ketergantungan mouse/touchpad:
  - `multiple_choice` / `true_false`: angka `1`–`5` langsung memilih & mengirim, panah/WASD menggeser sorotan, `Enter`/`Spasi` memilih.
  - `ordering`: panah atas/bawah atau `W`/`S` memilih baris, panah kiri/kanan atau `A`/`D` menggeser posisi naik/turun, angka `1`–`N` loncat baris, `Enter` mengirim jawaban.
  - `short_answer`: input otomatis fokus saat muncul; `Enter` langsung mengirim jawaban.
- Isi soal digulir di dalam panel bila panjang; tombol aksi menempel di bawah.
- Di layar sangat pendek, panel memakai hampir seluruh tinggi ruang game dan
  boleh menutup dialog (fallback) supaya soal tetap terbaca.
- Fokus keyboard masuk ke panel saat muncul dan kembali ke area game saat
  ditutup.
- `Esc` tidak menutup overlay sebelum soal dijawab; lihat
  [`../04-game/accessibility.md`](../04-game/accessibility.md#keyboard).
- Keempat tipe soal punya UI jawaban sendiri:
  - `multiple_choice` / `true_false`: daftar opsi; angka `1`–`5` memilih,
    panah atas/bawah memindah sorotan, `Enter` mengirim. Opsi pilihan ganda
    sudah dikirim `buildChallengeView` dalam urutan teracak deterministik per
    `challenge.id` (lihat [`../04-game/scene-format.md`](../04-game/scene-format.md#data-yang-dikirim-ke-react)),
    jadi jawaban benar tidak selalu di posisi pertama.
  - `ordering`: tombol naik/turun per item (bukan drag), urutan awal diacak
    deterministik per `challengeId` agar tidak sama dengan urutan cerita.
  - `short_answer`: satu input teks; `Enter` atau tombol "Jawab" mengirim.
- Overlay hanya mengirim jawaban mentah. Trim, lowercase, dan pembuangan tanda
  baca akhir dilakukan `src/story/scoring.ts`, bukan di komponen.
- `hints` tampil sebagai catatan kecil bila ada; jawaban benar tidak pernah ikut
  ke `ChallengeView`.

### Paused

- Lanjut, ulangi chapter, pengaturan suara (slider Musik dan Efek suara
  terpisah + tombol mute per baris), keluar.
- Tampil sebagai satu **kartu gelap membulat** dengan garis aksen oranye; area
  luarnya bisa digulir dan memakai **scrollbar bertema** (`scrollbar-tema`),
  jadi di layar ponsel pendek menu tetap terjangkau tanpa scrollbar bawaan
  peramban (ADR 0031).
- Game di-pause (`scene.pause()`), input dialog berhenti.
- Musik tidak dihentikan, hanya dikecilkan (volume 0,35 → 0,12) agar jeda tidak
  terasa memutus suasana; volume kembali saat lanjut atau ulangi chapter.
- Fokus masuk ke tombol "Lanjut" dan kembali ke tombol HUD saat menu ditutup.

### Finished

- Skor dan jumlah benar.
- Daftar `weakConcepts` dengan kalimat: "Coba ulang bagian ini: Kondensasi".
- Tombol "Main lagi" dan "Kembali ke awal".
- Tanpa ranking, tanpa perbandingan dengan siswa lain.
- Hasil disimpan lewat Server Action `savePlayResult` (`src/app/play/actions.ts`):
  `GameScene` mengirim event `finished` berisi `result` **dan** `answers`
  percobaan pertama, lalu `GameShell` mengirim
  `{ storyId, result: { studentId | nickname, answers } }`. Hanya jawaban dan
  identitas pilihan layar masuk yang dikirim — server menghitung ulang skor dari
  cerita terbit, menurunkan nama/kelas dari baris `students`, dan mengisi
  `classroom_id`. Layar hasil tampil tanpa menunggu simpan; statusnya ditulis
  jujur di bawah ringkasan: "Menyimpan hasil main…", "Hasil main tersimpan.",
  atau "Hasil main belum tersimpan.".
- Cerita demo (`/demo` dan `/play/st_demo_siklus_air`) dibaca tanpa database,
  jadi tidak punya baris `stories` untuk dirujuk `play_results`. Di sana action
  menjawab `not_found` dan status berbunyi "belum tersimpan" — bukan bug
  tampilan. Untuk menguji penyimpanan, mainkan cerita terbit lewat
  `/play/<storyId>`.

### Error

| Kode                 | Pesan ke siswa                                    |
| -------------------- | ------------------------------------------------- |
| `STORY_NOT_FOUND`    | "Cerita ini tidak ditemukan."                     |
| `SCHEMA_UNSUPPORTED` | "Cerita ini dibuat dengan versi yang lebih baru." |
| `UNKNOWN`            | "Terjadi masalah. Coba muat ulang halaman."       |

Aset yang gagal dimuat **bukan** layar error: game tetap berjalan dengan latar
default (`bg_default`) dan panel default (`ui_default`). Sprite karakter tidak
punya cadangan — sprite yang hilang tidak digambar. Lihat tabel penanganan error
di [`../04-game/interaction-loop.md`](../04-game/interaction-loop.md#penanganan-error-runtime).

## Responsif

| Layar               | Perilaku                                                                             |
| ------------------- | ------------------------------------------------------------------------------------ |
| Desktop ≥ 1024 px   | Kanvas mengisi bingkai (margin 24 px, sudut membulat); kontrol keyboard              |
| Tablet / HP lanskap | Kanvas mengisi bingkai; joystick dan tombol aksi **mengapung** di dalamnya           |
| HP potret           | Panggung 16:9 di atas; **dek kontrol** (joystick + tombol aksi) dan bar HUD di bawah |
| Sentuh              | Label `Space` berganti jadi "Sentuh"; semua keycap keyboard disembunyikan            |
| Tombol layar penuh  | Ada di HUD; memenuhkan layar lalu mencoba mengunci lanskap                           |

Singkatnya: tidak ada lagi saran "putar layar". Di ponsel potret, kanvas tidak
dipaksa memenuhi seluruh tinggi sehingga teksnya tetap terbaca — panggung game
dikunci `aspect-video` di bagian atas, sisanya jadi dek kontrol yang jauh dari
tepi bawah (tempat ibu jari beristirahat). Di lanskap, kontrol mengapung di dalam
bingkai kanvas supaya dunia tidak ikut tergencet.

Di ponsel potret tombol HUD (Quest, Percepat, Musik, Catatan, Jeda, layar penuh)
tidak lagi melayang di atas kanvas: semuanya dipindah ke **bar di bawah kanvas**.
Tombolnya memakai desain yang sama dengan kotak dialog — gelap `#0b120e`
dengan bingkai dan aksen oranye `#E8A87C` serta teks krem terang, sudut
membulat — jadi seragam di desktop maupun HP (ADR 0029, ADR 0031). Teks dialog juga diperkecil karena kotak 16:9 di potret hanya
setinggi ±65 px. Gaya tombol dipakai bersama lewat `gayaHud.ts`, dan prop `letak`
(`overlay` | `bar`) yang memilih variannya (ADR 0028).

Kontrol muncul hanya saat perangkat terbaca sentuh: penunjuk utama **kasar**
(`pointer: coarse`) dan **tidak bisa hover** (`hover: none`). Laptop berlayar
sentuh tetap memakai papan tombol dan tetikus — memunculkan joystick di sana cuma
menutupi dunia. Deteksinya ada di `useSentuh.ts`; ringkasan keputusannya di
[ADR 0024](../09-decisions/0024-kontrol-sentuh-hp.md).

Joystick mengirim **satu dari delapan arah** yang sama dipakai papan tombol
(`movement.ts`), bukan vektor bebas — jadi aturan gerak, tabrakan, dan animasi
tetap satu jalur. Tombol aksi besar berlabel "Bicara": menyala saat pemain di zona
NPC, dan tampil redup tetapi tetap bisa ditekan saat belum ada warga, lalu
memunculkan pesan "Dekati warga untuk bicara" (ADR 0026). Di lanskap tombolnya
digeser agak menjauh dari sudut kanan bawah supaya tidak terpotong tepi layar
(ADR 0029). Selama dialog joystick
dan tombol aksi disembunyikan supaya tidak menutupi teks; lanjut dialog cukup
dengan mengetuk kotak dialog (ADR 0027). Rincian interaksinya di
[`../04-game/interaction-loop.md`](../04-game/interaction-loop.md#input-sentuh).

Halaman game memakai seluruh viewport dengan margin 8–24 px dan bingkai bersudut
membulat, ditambah **safe-area** (`env(safe-area-inset-*)`, lihat `.area-game` di
`globals.css`) supaya HUD dan tombol sentuh tidak tertutup notch atau bar sistem.
`viewport-fit=cover` di `layout.tsx` yang mengisi inset itu. Kanvas **selalu
tampil utuh**: skala bulat dipakai bila sisa ruangnya ≤6%, selain itu kanvas
dibesarkan penuh mengikuti bingkai supaya tidak muncul bar gelap besar.

Tombol **"Layar penuh"** (ikon di HUD) memenuhkan halaman lalu mencoba
mengunci orientasi mendatar; keluar dari layar penuh melepas kunci itu lagi. Keduanya best-effort — di Safari iPhone tombolnya
tidak dirender sama sekali, dan bila kunci orientasi ditolak pemain tetap dapat
layar penuh. Keputusannya di
[ADR 0025](../09-decisions/0025-layar-penuh-lanskap.md).

Semua tombol dan tautan memakai `touch-action: manipulation`, dan akar
`GameCanvas` `touch-manipulation`, supaya di Android ketukan langsung jadi klik
dan tidak tertahan menunggu ketuk-dua-kali zoom. Hanya pad tongkat yang tetap
`touch-none` (perlu menahan gulir saat jempol menggeser).

## Berbagi

Guru membagikan:

- tautan `/play/[storyId]`,
- kode kelas (opsional, `TBD`).

Siswa tidak perlu akun. Nama panggilan opsional, disimpan lokal.

## Performa

| Target                         | Cara                                            |
| ------------------------------ | ----------------------------------------------- |
| First content < 2 s            | Shell HTML + skeleton; Phaser dimuat setelahnya |
| Aset hanya yang dipakai        | `assetUsage`                                    |
| Tidak ada layout shift         | Kanvas berukuran tetap mengikuti mode `ENVELOP` |
| Bundle Phaser tidak di landing | Dynamic import hanya di halaman game            |

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

Implementasi: `src/game/progress.ts` (murni, storage disuntik) + event
`progress` di `GameBus`.

- Scene mengirim `{ type: "progress", view }` setiap kursor cerita bergerak
  (beat baru, jawaban pertama, "Ulangi chapter", dan sekali di akhir
  `create()`); `GameCanvas` yang menulisnya ke `localStorage`. Tidak di-throttle:
  perubahan beat mengikuti kecepatan pemain, dan refresh sedetik setelah beat
  terakhir tetap harus melanjutkan dari beat itu.
- Kunci: `classquest:progress:{storyId}`; isinya `PlayProgress` (kursor +
  jawaban percobaan pertama + sidik cerita + `updatedAt`).
- `GameShell` membaca progres lewat `useSyncExternalStore`
  (`src/game/progressStore.ts`); simpanan yang rusak, milik cerita lain, atau
  dibuat untuk sidik cerita berbeda dibaca sebagai `null` dan dihapus di
  `useEffect` — tanpa dialog konfirmasi, karena kursor lama memang tidak bisa
  dipakai.
- `Lanjutkan` meneruskan kursor ke `GameCanvas` → `createGame(..., mulaiDari)` →
  `GameScene.pulihkanProgres()`: jawaban dipulihkan lewat `AnswerLog.restore()`
  dan `StoryRunner.lanjutkanDari()` membuka **awal scene**, bukan tengah beat.
- `finished`, "Main lagi", dan "Mulai ulang" menghapus simpanan.
- Saat selesai, kirim **jawaban** dan identitas layar masuk ke `savePlayResult`
  (server menghitung ulang skor); jangan mengirim field skor atau kelas.

## Checklist implementasi

- [ ] Hanya cerita `published` yang bisa diakses.
- [ ] `notFound()` untuk id tidak dikenal.
- [ ] Phaser hanya dimuat di halaman game.
- [ ] Kanvas tampil utuh di bingkai halaman (margin 8–24 px, sudut membulat).
- [ ] Overlay tidak menerima jawaban benar.
- [x] Progres bisa dipulihkan (`src/game/progress.ts`, tombol "Lanjutkan").
- [ ] Error aset tidak menghentikan permainan.
- [ ] Bisa dimainkan dengan keyboard.
- [ ] Tidak ada error `window is not defined` saat build.
