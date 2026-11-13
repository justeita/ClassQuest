/**
 * Navigasi keras (muat ulang penuh) untuk alur autentikasi.
 *
 * Dipakai setelah login/logout berhasil, bukan `router.push()`/`replace()`.
 * Alasannya ada di `LoginForm`: navigasi client yang diikuti `router.refresh()`
 * berjalan dalam satu transisi React, sehingga layar baru baru berganti setelah
 * kedua permintaan RSC selesai. Bila server lambat (instance dingin, DB jauh),
 * halaman lama terlihat beku. Muat ulang penuh tidak bisa macet seperti itu,
 * memakai cookie sesi terbaru apa adanya, dan menampilkan progres dari browser.
 *
 * Dipisah ke modul sendiri supaya test bisa meng-`vi.mock` seam-nya tanpa
 * menyentuh `window.location` jsdom.
 */
export function hardNavigate(url: string): void {
  window.location.assign(url);
}
