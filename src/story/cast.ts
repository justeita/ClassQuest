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
      "Pelajar akademi berkacamata persegi yang selalu membawa buku tebal bersampul hijau tua; tenang dan teliti.",
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

/** Id pemain tetap; dipakai fallback dan test. */
export const PLAYER_ID = "char_mc";

/** Id mentor tetap; dipakai fallback dan test. */
export const MENTOR_ID = "char_npc_10";
