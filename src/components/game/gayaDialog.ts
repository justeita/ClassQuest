/**
 * Token "kotak dialog" — bahasa visual bersama untuk UI game.
 *
 * Warna disalin dari panel `DialogueBox` (latar navy `#0f172b`, bingkai tipis
 * putih transparan, sudut membulat, teks `#EFF2F7`) supaya tombol HUD, kotak
 * pilihan jawaban, dan kartu umpan balik tantangan tampil seragam (ADR 0026).
 *
 * Tiap token adalah string kelas **lengkap**. Keadaan diam dan aktif dipilih
 * dengan percabangan, bukan ditumpuk: dua kelas warna Tailwind yang bentrok
 * tidak punya urutan menang CSS yang bisa diandalkan.
 */

/** Kotak dialog diam: navy gelap dengan bingkai tipis. */
export const KOTAK_DIALOG =
  "rounded-lg border border-white/10 bg-[#0f172b]/95 text-[#EFF2F7]";

/** Kotak dialog aktif/terpilih: bingkai terang dan latar sedikit terangkat. */
export const KOTAK_DIALOG_AKTIF =
  "rounded-lg border border-white/60 bg-[#16223d] text-white";

/** Keadaan diam saat kursor melintas. */
export const KOTAK_DIALOG_HOVER =
  "hover:border-white/25 hover:bg-[#16223d] hover:text-white";

/** Cincin fokus keyboard; memakai aksen teal nama di kotak dialog. */
export const KOTAK_DIALOG_FOKUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55D0A5]";
