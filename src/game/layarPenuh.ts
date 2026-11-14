/**
 * Layar penuh dan kunci orientasi untuk perangkat sentuh.
 *
 * Di ponsel, bilah alamat peramban memakan tinggi layar dan joystick butuh ruang
 * di sisi kiri serta tombol aksi di kanan. Permainan jadi terasa sempit walau
 * kanvasnya sudah 16:9. Karena itu tombol "Layar penuh" memasukkan halaman ke
 * layar penuh, lalu **mencoba** mengunci orientasi mendatar.
 *
 * Dua langkah itu terpisah dengan sengaja: tidak semua peramban mengizinkan
 * kuncik orientasi (iOS Safari bahkan tidak punya layar penuh untuk elemen),
 * jadi gagal mengunci lanskap tidak boleh membatalkan layar penuh — dan
 * sebaliknya.
 */

/** Orientasi yang diminta: mendatar, searah dunia permainan yang lebih lebar. */
export const ORIENTASI_PERMAINAN: OrientationLockType = "landscape";

/** `true` bila dokumen sedang tampil penuh. Aman dipanggil tanpa `document`. */
export function layarPenuhAktif(doc: Document | null | undefined): boolean {
  return Boolean(doc?.fullscreenElement);
}

/** `true` bila peramban menyediakan Fullscreen API untuk elemen. */
export function dukungLayarPenuh(doc: Document | null | undefined): boolean {
  return Boolean(doc?.fullscreenEnabled);
}
