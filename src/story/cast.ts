/**
 * Roster karakter tetap ClassQuest.
 *
 * Nama, id, role, sprite, deskripsi, dan obrolan singkat di sini adalah
 * **satu-satunya sumber kebenaran**. Pipeline AI tidak boleh mengganti nama
 * atau menambah karakter: outline dari model selalu ditimpa dengan daftar ini,
 * dan fallback memakai daftar yang sama.
 *
 * Deskripsi sengaja menyebut penampilan yang terlihat di sprite (topi, kacamata,
 * jubah, tongkat, dan sebagainya) supaya cerita yang ditulis model akurat saat
 * dipasangkan dengan gambar.
 *
 * Detail visual yang lebih lengkap (rambut, outfit, usia, sifat) didokumentasikan
 * di `docs/07-assets/cast-bible.md`. Dokumen itu **tidak** dibaca runtime.
 *
 * Yang sampai ke model: `description` di bawah (maksimal 160 karakter, batas
 * schema) ditambah tiga peta prompt-only — `CAST_EXPERTISE` (bidang),
 * `CAST_TRAITS` (sifat khas), dan `CAST_VOICE` (cara bicara). Ketiganya **bukan**
 * bagian schema cerita; mengubahnya hanya mengubah isi blok `CAST`, tidak
 * mengubah bentuk `Story` (ADR 0038).
 */

import type { Character } from "./schema";

/**
 * Sepuluh karakter desa: satu pemain dan sembilan warga.
 *
 * Urutan stabil dan dipakai prompt, fallback, serta fixture contoh. Jangan
 * mengubah `id`/`spriteId` tanpa memperbarui manifest aset dan dokumen cerita.
 */
export const FIXED_CAST: readonly Character[] = [
  {
    id: "char_mc",
    name: "Kael",
    role: "player",
    spriteId: "char_mc",
    description:
      "Pemuda berjubah biru navy berhias emas dan tunik putih gading; tenang, pendiam, sederhana, dan penuh rasa ingin tahu.",
  },
  {
    id: "char_npc_10",
    name: "Edric",
    role: "mentor",
    spriteId: "char_npc_10",
    description:
      "Tetua desa berambut putih keperakan bermantel hijau tua berornamen emas; bijaksana, tenang, dan berwibawa.",
    smallTalk:
      "Desa ini tumbuh karena warganya saling mendengar. Setiap keputusan sebaiknya ditimbang dengan tenang, bukan tergesa-gesa.",
  },
  {
    id: "char_npc_1",
    name: "Elian",
    role: "npc",
    spriteId: "char_npc_1",
    description:
      "Pelajar akademi bertopi biru tua berpita emas yang membawa buku sihir; pendiam, lembut, dan gemar membaca.",
    smallTalk:
      "Buku ini lebih ramai daripada aku. Kalau kau ingin tahu sesuatu, biasanya jawabannya ada di halaman-halamannya.",
  },
  {
    id: "char_npc_3",
    name: "Elias",
    role: "npc",
    spriteId: "char_npc_3",
    description:
      "Pelajar akademi berkacamata persegi panjang yang selalu membawa buku tebal bersampul hijau tua; tenang dan teliti.",
    smallTalk:
      "Aku suka mencatat hal-hal kecil. Kadang dari catatan yang paling sederhana, kita baru mengerti sesuatu yang besar.",
  },
  {
    id: "char_npc_4",
    name: "Clara",
    role: "npc",
    spriteId: "char_npc_4",
    description:
      "Pelajar akademi berjubah biru royal dengan dua pita besar dan buku bersampul cokelat tua; lembut dan tekun.",
    smallTalk:
      "Aku suka membaca pelan-pelan supaya tidak ada yang terlewat. Satu halaman kadang perlu dibaca dua kali agar benar-benar paham.",
  },
  {
    id: "char_npc_5",
    name: "Griselda",
    role: "npc",
    spriteId: "char_npc_5",
    description:
      "Tetua desa berambut putih tersanggul dan berjubah marun bertongkat kayu; bijaksana, ramah, dan penyayang.",
    smallTalk:
      "Setiap orang punya waktunya sendiri untuk belajar. Yang penting jangan berhenti bertanya, walau sudah setua aku.",
  },
  {
    id: "char_npc_6",
    name: "Eldric",
    role: "npc",
    spriteId: "char_npc_6",
    description:
      "Tetua desa berjanggut putih lebat berjubah hijau tua dan bertongkat kayu; bijaksana, tenang, dan ramah.",
    smallTalk:
      "Desa ini menyimpan banyak cerita yang tidak tertulis di mana pun. Kalau kau punya waktu, aku bisa menceritakan beberapa.",
  },
  {
    id: "char_npc_7",
    name: "Marlow",
    role: "npc",
    spriteId: "char_npc_7",
    description:
      "Pemancing bertopi jerami bermata cokelat dan biru yang membawa joran serta keranjang tangkapan; ramah dan santai.",
    smallTalk:
      "Sungai mengajarkan kesabaran. Kadang ikan datang cepat, kadang kita cuma perlu menunggu lebih lama.",
  },
  {
    id: "char_npc_8",
    name: "Leonhardt",
    role: "npc",
    spriteId: "char_npc_8",
    description:
      "Calon kesatria berhelm baja perak dengan tunik biru dan armor kulit cokelat; tenang, sopan, dan pemberani.",
    smallTalk:
      "Aku masih belajar banyak hal, tapi aku berjanji akan melindungi desa ini dengan sebaik-baiknya.",
  },
  {
    id: "char_npc_9",
    name: "Theo",
    role: "npc",
    spriteId: "char_npc_9",
    description:
      "Petani muda bertopi jerami dan overall cokelat tua; ramah, pekerja keras, dan menyukai kehidupan desa.",
    smallTalk:
      "Kerja di ladang memang melelahkan, tapi aku suka melihat hasilnya tumbuh sedikit demi sedikit.",
  },
];

/** Salinan cast yang bisa dipakai sebagai `Story.cast` (array biasa). */
export function fixedCast(): Character[] {
  return FIXED_CAST.map((member) => ({ ...member }));
}

/**
 * Bidang keahlian tiap tokoh, **hanya untuk prompt**.
 *
 * `Character` di schema cerita sengaja tidak punya field ini: `description`
 * dibatasi 160 karakter dan bercampur dengan ciri fisik, sehingga pekerjaan
 * tokoh mudah tenggelam. Peta ini disalin ke blok `CAST` sebagai `keahlian:`
 * supaya model tahu siapa yang berhak menjelaskan apa — mis. dialog tentang
 * ikan jatuh ke Marlow (nelayan), bukan ke pelajar yang gemar membaca
 * (ADR 0025).
 *
 * Isinya diturunkan dari pekerjaan di berkas persona ODT, tag aset karakter di
 * manifest, dan `smallTalk`. Bukan kontrak: mengubahnya tidak mengubah schema
 * cerita, hanya perilaku prompt. Rujukannya
 * `docs/07-assets/cast-bible.md`.
 */
export const CAST_EXPERTISE: Readonly<Record<string, string>> = {
  char_mc: "murid akademi; mengamati dan bertanya, bukan ahli topik",
  char_npc_10:
    "penasihat desa; pengetahuan umum, kebijaksanaan, adat, memimpin",
  char_npc_1: "membaca, buku, hafalan, sihir ringan",
  char_npc_3: "mencatat, ketelitian, hitungan, buku pelajaran",
  char_npc_4: "membaca, menulis, belajar tekun",
  char_npc_5: "nasihat, adat desa, merawat orang",
  char_npc_6: "sejarah desa, cerita rakyat, pengetahuan lama",
  char_npc_7: "ikan, sungai, memancing, perahu, arus",
  char_npc_8: "menjaga, keamanan, aturan, keberanian, pos jaga",
  char_npc_9: "ladang, sawah, tanaman, panen, tanah",
};

/**
 * Sifat khas tiap tokoh, **hanya untuk prompt**.
 *
 * Berbeda dari `description` yang harus memuat ciri fisik, peta ini khusus
 * watak: bagaimana tokoh bereaksi, apa yang ia hindari, dan apa yang membuatnya
 * terasa berbeda dari tokoh lain. Model memakainya untuk memilih emosi dan
 * sikap, bukan untuk menyebut "sifat" secara harfiah di dialog (ADR 0038).
 */
export const CAST_TRAITS: Readonly<Record<string, string>> = {
  char_mc: "tenang, pendiam, sederhana, penuh rasa ingin tahu",
  char_npc_10: "bijaksana, tenang, berwibawa, menimbang sebelum memutuskan",
  char_npc_1: "pendiam, lembut, gemar membaca, lebih nyaman dengan buku",
  char_npc_3: "tenang, teliti, rapi, tidak suka menebak-nebak",
  char_npc_4: "lembut, tekun, sabar, tidak pernah buru-buru",
  char_npc_5: "bijaksana, ramah, penyayang, seperti nenek bagi semua warga",
  char_npc_6: "bijaksana, tenang, ramah, suka bernostalgia",
  char_npc_7: "ramah, santai, sabar, tidak pernah terburu-buru",
  char_npc_8: "tenang, sopan, pemberani, menjunjung janji",
  char_npc_9: "ramah, pekerja keras, ceria, bangga pada desanya",
};

/**
 * Cara bicara tiap tokoh, **hanya untuk prompt**.
 *
 * Tanpa kolom ini, semua tokoh menulis kalimat dengan pola yang sama dan cerita
 * terasa seperti satu orang berbicara dengan banyak nama. Isinya pola konkret
 * (panjang kalimat, kebiasaan, perumpamaan), bukan sekadar kata sifat (ADR 0038).
 */
export const CAST_VOICE: Readonly<Record<string, string>> = {
  char_mc: "kalimat pendek, banyak bertanya, jarang berpendapat panjang",
  char_npc_10: "tenang dan runtut, menimbang dua sisi sebelum menyimpulkan",
  char_npc_1: "pelan dan hati-hati, sering mengutip isi buku",
  char_npc_3: "rinci dan berurutan, suka menyebut catatannya",
  char_npc_4: "hangat dan sabar, mengulang hal penting dengan kata sendiri",
  char_npc_5: "lembut dan pelan, memakai perumpamaan merawat tanaman",
  char_npc_6: "seperti bercerita, suka membuka dengan kisah lama desa",
  char_npc_7: "kalimat pendek, banyak jeda, suka perumpamaan sungai",
  char_npc_8: "tegas dan sopan, kalimat pendek seperti sumpah kesatria",
  char_npc_9: "ceplas-ceplos ceria, banyak menyebut kerja ladang",
};

/**
 * Tempat tetap di desa, **hanya untuk prompt**.
 *
 * Peta desa (`src/game/world/village.json`) sudah memposisikan sembilan NPC di
 * koordinat tetap, tetapi model tidak pernah melihat koordinat itu. Tanpa daftar
 * ini, chapter bisa menulis "Marlow muncul di alun-alun" padahal di peta ia
 * berdiri di jembatan sungai — narasi dan tempat tokoh jadi tidak cocok.
 *
 * Satu tempat = satu rumah/bangunan atau satu area. `label` dipakai di kolom
 * `lokasi:` pada blok `CAST`; `note` menjelaskan batas tempatnya di blok
 * `LOKASI` (mis. kolam timur bukan air mancur alun-alun). Isinya diturunkan dari
 * `map.txt` paket aset dan dicocokkan dengan posisi NPC di `village.json`;
 * rujukannya `docs/07-assets/cast-bible.md` (ADR 0029).
 */
export interface CastPlace {
  /** Kunci stabil; dipakai test dan dokumen. */
  id: string;
  /** Nama tempat singkat untuk kolom `lokasi:` di blok CAST. */
  label: string;
  /** Penjelasan batas tempat untuk blok LOKASI. */
  note: string;
  /** Id tokoh yang menempati tempat ini. */
  members: readonly string[];
}

export const CAST_PLACES: readonly CastPlace[] = [
  {
    id: "bebas",
    label: "berjalan bebas mengikuti cerita",
    note: "Pemain bergerak sendiri; dia boleh datang ke tempat mana pun, tetapi tokoh lain tidak berpindah menemuinya tanpa alasan cerita.",
    members: ["char_mc"],
  },
  {
    id: "alun_alun",
    label: "alun-alun utama, di bangku kiri bawah air mancur",
    note: "Air mancur di tengah desa, dikelilingi bangku kayu dan lentera. Ini pusat desa, bukan kolam.",
    members: ["char_npc_1"],
  },
  {
    id: "perpustakaan",
    label: "halaman depan perpustakaan, dekat tangga dan taman bunga",
    note: "Perpustakaan berdiri sendiri di timur laut. Elias ada di depan bangunannya, bukan di dalam rumah warga.",
    members: ["char_npc_3"],
  },
  {
    id: "kolam_timur",
    label: "bangku di samping pohon berbunga merah muda, dekat kolam",
    note: "Kolam alami di timur desa, dikelilingi bunga dan bebatuan. Bukan air mancur alun-alun dan bukan sungai.",
    members: ["char_npc_4"],
  },
  {
    id: "rumah_hijau",
    label: "halaman depan rumah beratap hijau, dekat pot bunga",
    note: "Rumah di sudut tenggara dengan taman kecil dan pot bunga di depan pintu.",
    members: ["char_npc_5"],
  },
  {
    id: "rumah_biru",
    label: "bangku kayu di depan rumah beratap biru gelap",
    note: "Rumah di sudut barat daya dengan bangku kayu di halaman. Jangan tertukar dengan rumah merah Edric di utara.",
    members: ["char_npc_6"],
  },
  {
    id: "jembatan",
    label: "jembatan kayu di atas sungai",
    note: "Sungai dan jembatan kayu di bagian selatan desa, jauh dari kolam dan alun-alun.",
    members: ["char_npc_7"],
  },
  {
    id: "pintu_selatan",
    label: "pintu masuk selatan, dekat lentera jalan dan papan penunjuk arah",
    note: "Gerbang desa dengan tangga batu, lentera jalan, dan papan penunjuk arah ke hutan.",
    members: ["char_npc_8"],
  },
  {
    id: "kebun",
    label: "kebun sayuran dekat sumur batu",
    note: "Petak tanaman di barat desa dengan sumur batu beratap kayu. Tempat kerja Theo.",
    members: ["char_npc_9"],
  },
  {
    id: "rumah_merah",
    label: "halaman depan rumah beratap merah, dekat pot bunga",
    note: "Rumah beratap merah di utara tengah, di ujung jalan utama. Ini rumah Edric, bukan rumah biru Eldric.",
    members: ["char_npc_10"],
  },
];

/** Lokasi tetap seorang tokoh; `undefined` bila id tidak dikenal. */
export function locationOf(id: string): string | undefined {
  return CAST_PLACES.find((place) => place.members.includes(id))?.label;
}

/**
 * Sebutan pendek yang tetap dianggap menunjuk sebuah tempat desa.
 *
 * Model kadang menyingkat label `LOKASI` ("kolam timur" alih-alih "bangku di
 * samping pohon berbunga merah muda, dekat kolam"). Daftar ini dipakai
 * `isKnownPlace()` supaya singkatan wajar tidak memicu peringatan, sementara
 * nama tempat di luar desa (mis. "kelas", "halaman sekolah") tetap tertangkap.
 */
const PLACE_ALIASES: Readonly<Record<string, readonly string[]>> = {
  bebas: ["berjalan bebas", "mengikuti cerita"],
  alun_alun: ["alun-alun", "air mancur"],
  perpustakaan: ["perpustakaan", "taman bunga"],
  kolam_timur: ["kolam timur", "kolam", "pohon berbunga"],
  rumah_hijau: ["rumah beratap hijau", "rumah hijau"],
  rumah_biru: ["rumah beratap biru", "rumah biru"],
  jembatan: ["jembatan", "sungai"],
  pintu_selatan: ["pintu masuk selatan", "pintu selatan", "gerbang desa"],
  kebun: ["kebun", "sumur batu", "sawah"],
  rumah_merah: ["rumah beratap merah", "rumah merah"],
};

/**
 * Apakah `location` menyebut salah satu tempat tetap desa.
 *
 * Perbandingan longgar dan sengaja murah: label utuh, potongan label, atau
 * alias pendek. Ini dipakai validator untuk memberi **peringatan** pada
 * `continuity.characterStates[].location`, bukan untuk menolak cerita.
 */
export function isKnownPlace(location: string): boolean {
  const text = location.trim().toLowerCase();
  if (text.length === 0) return false;

  return CAST_PLACES.some((place) => {
    const label = place.label.toLowerCase();
    if (text.includes(label)) return true;
    if (text.length >= 4 && label.includes(text)) return true;
    return (PLACE_ALIASES[place.id] ?? []).some((alias) =>
      text.includes(alias),
    );
  });
}

/** Id pemain tetap; dipakai fallback dan test. */
export const PLAYER_ID = "char_mc";

/** Id mentor tetap; dipakai fallback dan test. */
export const MENTOR_ID = "char_npc_10";
