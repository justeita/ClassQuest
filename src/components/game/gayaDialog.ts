/**
 * Token "kotak dialog" — bahasa visual bersama untuk UI game.
 *
 * Warna disalin dari keluarga kotak penanda quest (`!`/`Space` di atas NPC):
 * latar hijau-gelap `#0b120e`, aksen oranye `#E8A87C`, dan teks krem terang
 * `#F7F4EC`. Dipakai tombol HUD, kotak pilihan jawaban, dan kartu umpan balik
 * tantangan supaya semuanya tampil seragam (ADR 0026, ADR 0027).
 *
 * Tiap token adalah string kelas **lengkap**. Keadaan diam dan aktif dipilih
 * dengan percabangan, bukan ditumpuk: dua kelas warna Tailwind yang bentrok
 * tidak punya urutan menang CSS yang bisa diandalkan.
 */

/** Kotak dialog diam: gelap dengan bingkai tipis aksen. */
export const KOTAK_DIALOG =
  "rounded-lg border border-[#E8A87C]/25 bg-[#0b120e]/95 text-[#F7F4EC]";

/** Kotak dialog aktif/terpilih: bingkai aksen penuh dan latar sedikit terangkat. */
export const KOTAK_DIALOG_AKTIF =
  "rounded-lg border border-[#E8A87C] bg-[#1c2a22] text-white";

/** Keadaan diam saat kursor melintas. */
export const KOTAK_DIALOG_HOVER =
  "hover:border-[#E8A87C]/60 hover:bg-[#1c2a22] hover:text-white";

/** Cincin fokus keyboard; memakai aksen oranye yang sama dengan kotak penanda quest. */
export const KOTAK_DIALOG_FOKUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C]";
