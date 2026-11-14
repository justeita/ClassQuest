/**
 * Kendali `Tab` di area permainan (docs/04-game/accessibility.md).
 *
 * Selama bermain, `Tab` sengaja ditahan (dimatikan): tombol untuk bicara ke
 * warga adalah `Space`/`Enter`, jadi `Tab` tidak boleh memindahkan fokus ke
 * tombol HUD. Kalau tidak, tekanan `Space` berikutnya justru mengaktifkan
 * tombol HUD yang baru terpilih, bukan memulai dialog.
 *
 * Saat eksplorasi dan saat soal, `Tab`/`Shift+Tab` dicegah dan fokus
 * dikembalikan ke area permainan. Saat panel tantangan terbuka, fokus dibiarkan
 * di panelnya sendiri karena navigasi opsi memakai tombol angka/panah. `Tab`
 * baru hidup kembali saat dialog (pintasan "Percepat") dan di menu jeda/buku
 * yang memang butuh navigasi papan ketik biasa.
 *
 * Ini **bukan** penangkapan global: `Ctrl+Tab`, `Alt+Tab`, dan `Meta+Tab` tetap
 * milik peramban.
 */

/**
 * Tahan `Tab` selama bermain supaya fokus tidak pindah ke tombol HUD.
 *
 * @param fokusKe Elemen yang ditarik kembali fokusnya, atau `null` untuk sekadar
 *   menahan `Tab` tanpa memindahkan fokus (mis. saat panel tantangan memegang
 *   fokusnya sendiri).
 * @returns `true` bila event sudah ditangani (Tab dicegah).
 */
export function tangkapTab(
  event: KeyboardEvent,
  fokusKe: HTMLElement | null = null,
): boolean {
  if (event.key !== "Tab" || event.defaultPrevented) return false;
  // Ctrl+Tab/Alt+Tab/Meta+Tab milik peramban (pindah tab/jendela).
  if (event.ctrlKey || event.altKey || event.metaKey) return false;

  event.preventDefault();
  fokusKe?.focus({ preventScroll: true });
  return true;
}
