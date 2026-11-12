/**
 * Isi statis Portal Guru yang **belum** punya data nyata.
 *
 * Semua bagian yang bisa dibaca dari database sudah pindah: materi/cerita dan
 * game lewat `src/server/stories`, statistik dashboard dihitung dari daftar
 * cerita, dan kelas/siswa lewat `src/server/classrooms`. Yang tersisa di sini
 * hanya hiasan gamifikasi guru, karena belum ada tabel progres guru.
 *
 * Tidak ada `import "server-only"` di sini: data dipakai komponen client.
 */

/**
 * Identitas gamifikasi di sidebar. `name`/`initials` diambil dari sesi guru
 * sungguhan; level, XP, dan gold belum punya sumber data, jadi tetap hiasan
 * desain sampai ada tabel progres guru.
 */
export const CURRENT_TEACHER = {
  level: 45,
  xp: "1,450 XP",
  gold: "320 Gold",
} as const;

/** Pilihan tingkat kelas yang dipakai di beberapa form. */
export const GRADE_OPTIONS = [
  "SMA Grade 10",
  "SMA Grade 11",
  "SMA Grade 12",
  "Perguruan Tinggi",
] as const;
