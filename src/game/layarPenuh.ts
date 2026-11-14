/**
 * Layar penuh dan kunci orientasi untuk perangkat sentuh.
 *
 * Di ponsel, bilah alamat peramban memakan tinggi layar dan joystick butuh ruang
 * di sisi kiri serta tombol aksi di kanan. Permainan jadi terasa sempit walau
 * kanvasnya sudah 16:9. Karena itu tombol "Layar penuh" memasukkan halaman ke
 * layar penuh, lalu **mencoba** mengunci orientasi mendatar.
 *
 * Dua langkah itu terpisah dengan sengaja: tidak semua peramban mengizinkan
 * kunci orientasi (iOS Safari bahkan tidak punya layar penuh untuk elemen),
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

/**
 * Masuk layar penuh lalu coba kunci orientasi mendatar.
 *
 * Harus dipanggil **langsung dari penanganan gestur** (klik/ketuk): peramban
 * menolak permintaan layar penuh yang datang setelah `await` atau jeda. Karena
 * itu pemanggil tidak boleh menunggu apa pun sebelum fungsi ini dipanggil.
 *
 * Best-effort: gagal layar penuh atau gagal kunci orientasi sama-sama tidak
 * melempar. Kembalian `true` hanya bila layar penuh benar-benar masuk.
 */
export async function masukLayarPenuhLanskap(
  doc: Document | null | undefined = typeof document === "undefined"
    ? null
    : document,
  orientation: ScreenOrientation | null | undefined = typeof screen ===
  "undefined"
    ? null
    : screen.orientation,
): Promise<boolean> {
  if (!doc?.fullscreenEnabled || doc.fullscreenElement) return false;

  try {
    await doc.documentElement.requestFullscreen({ navigationUI: "hide" });
  } catch {
    // Peramban menolak: biarkan halaman apa adanya.
    return false;
  }

  try {
    await orientation?.lock?.(ORIENTASI_PERMAINAN);
  } catch {
    // Kunci orientasi tidak didukung (mis. iOS): layar penuh tetap dipakai.
  }

  return true;
}
