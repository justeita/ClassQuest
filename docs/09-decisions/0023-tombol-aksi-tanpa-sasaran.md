---
status: stable
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# 0023 — Tombol Aksi Sentuh Tetap Hidup Tanpa Sasaran

- **Status:** Accepted
- **Tanggal:** 2026-11-14
- **Pengambil keputusan:** tim ClassQuest
- **Menggantikan:** — (menyesuaikan butir 2 [ADR 0021](0021-kontrol-sentuh-hp.md), tidak membatalkannya)

## Konteks

[ADR 0021](0021-kontrol-sentuh-hp.md) menetapkan satu tombol aksi kontekstual yang
**mati** saat tidak ada yang bisa dilakukan. Setelah dipakai di ponsel, perilaku
itu menimbulkan masalah yang tidak terlihat di desktop:

- Tombol yang mati tidak menjelaskan apa pun. Pemain menekannya berkali-kali,
  mengira permainan macet, padahal ia hanya belum cukup dekat dengan warga.
- Tidak ada papan tombol di ponsel yang bisa memberi petunjuk alternatif; di
  desktop setidaknya prompt `Space` terlihat. Tombol mati berarti satu-satunya
  jalur aksi jadi buntu bisu.

Batasan yang mengikat:

- **Tanpa command palsu.** Tombol tidak boleh mengirim `interact`/`advance` saat
  tidak ada sasaran; scene tetap satu-satunya yang memutuskan aksi sah.
- **Tanpa dependensi baru** dan tetap konsisten dengan gaya visual yang ada.
- **Aksesibilitas dijaga.** Pembaca layar tetap harus tahu tombol bisa ditekan,
  dan pesan yang muncul harus diumumkan lewat status ARIA.

## Opsi

| Opsi                                                | Kelebihan                       | Kekurangan                                   | Biaya |
| --------------------------------------------------- | ------------------------------- | -------------------------------------------- | ----- |
| A. Tombol redup, tetap aktif + pesan "dekati warga" | Selalu bisa dicoba; menjelaskan | Perlu timer pesan & status ARIA              | Kecil |
| B. Tombol mati (status quo ADR 0021)                | Tidak ada aksi "hantu"          | Bisu; terasa rusak di ponsel                 | Nol   |
| C. Sembunyikan tombol saat tanpa sasaran            | Bersih secara visual            | Tata letak melompat; pemain kehilangan acuan | Kecil |
| D. Tampilkan peta/penunjuk menuju warga terdekat    | Sangat menolong                 | Fitur baru yang jauh lebih besar             | Besar |

## Keputusan

Kami memilih **A**, dengan aturan:

1. **Tombol tidak pernah `disabled`.** Tanpa sasaran ia tampil **redup**
   (`KELAS_REDUP`) alih-alih menyala, tetapi tetap bisa difokuskan dan ditekan.
2. **Menekan tanpa sasaran memunculkan pesan, bukan command.** Selama tidak ada
   `interact`/`advance` yang sah, menekan tombol hanya menampilkan pesan singkat
   **"Dekati warga untuk bicara"** (±2200 ms). Command tetap hanya dikirim saat
   `aksi` berisi `"bicara"` atau `"lanjut"`.
3. **Label yang jujur.** Tanpa sasaran `aria-label` menjadi "Cari warga di
   sekitar" dan label visualnya "·", supaya tombol tidak mengaku sebagai aksi
   yang belum tersedia.
4. **Pesan diumumkan.** Pesan tampil dalam elemen `role="status"` supaya pembaca
   layar mengumumkannya, dan hilang sendiri tanpa perlu aksi pemain.

## Konsekuensi

**Positif:**

- Tombol selalu memberi umpan balik; pemain tahu harus mendekati warga, bukan
  mengira permainan macet.
- Tidak ada command palsu; `GameCanvas` tetap satu-satunya penentu aksi sah.
- Tanpa dependensi baru; perilaku dijaga tes (`TouchControls.test.tsx`).

**Negatif / utang:**

- Timer pesan harus dibersihkan saat kontrol dilepas supaya tidak menulis state
  pada komponen yang sudah unmount.
- Menyimpang dari butir 2 ADR 0021, jadi ADR ini harus dibaca bersama-sama.

**Yang harus diubah:**

- `src/components/game/TouchControls.tsx` — tombol aktif, kelas siap/redup, pesan
  `role="status"`, dan label tanpa sasaran.
- `src/components/game/TouchControls.test.tsx` — tes tombol tanpa sasaran.
- [`../04-game/interaction-loop.md`](../04-game/interaction-loop.md),
  [`../04-game/accessibility.md`](../04-game/accessibility.md), dan
  [`../05-frontend/game-player.md`](../05-frontend/game-player.md).

## Kapan keputusan ini ditinjau ulang

- Jika pesan "dekati warga" terasa mengganggu/terlalu sering muncul.
- Jika muncul cara yang lebih baik untuk menuntun pemain ke warga terdekat
  (mis. penunjuk arah), yang bisa menggantikan pesan ini.

## Referensi

- [ADR 0021](0021-kontrol-sentuh-hp.md) — kontrol sentuh dan tata letak HP.
- [`../04-game/interaction-loop.md`](../04-game/interaction-loop.md#input-sentuh) —
  perilaku input sentuh di dalam loop permainan.
