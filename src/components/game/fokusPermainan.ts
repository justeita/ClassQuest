/**
 * Jebakan fokus area permainan (docs/04-game/accessibility.md).
 *
 * Halaman siswa hanya berisi kanvas dan HUD. Tanpa jebakan, `Tab` dari kanvas
 * berjalan keluar halaman sampai ke bilah peramban. Selama bermain, `Tab`/
 * `Shift+Tab` cukup berputar di kontrol dalam area game: urutan fokus tetap
 * logis dan fokus tidak pernah hilang.
 *
 * Ini **bukan** penangkapan global: jebakan hanya bekerja saat fokus berada di
 * area permainan (atau belum di mana pun / `body`). Pintasan milik peramban
 * seperti `Ctrl+Tab` dan `Alt+Tab` tidak disentuh.
 */

const PEMILIH_FOKUS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/** Kontrol yang bisa dijangkau `Tab`, urut DOM. */
export function elemenFokusable(wadah: HTMLElement): HTMLElement[] {
  return Array.from(wadah.querySelectorAll<HTMLElement>(PEMILIH_FOKUS)).filter(
    (elemen) => elemen.tabIndex >= 0 && !elemen.hidden,
  );
}

/**
 * Kontrol berikutnya (atau sebelumnya) dengan putaran. `null` bila area tidak
 * punya kontrol sama sekali — pemanggil lalu memfokuskan wadahnya.
 */
export function fokusBerikutnya(
  wadah: HTMLElement,
  aktif: Element | null,
  mundur = false,
): HTMLElement | null {
  const daftar = elemenFokusable(wadah);
  if (daftar.length === 0) return null;

  const indeks =
    aktif === null
      ? -1
      : daftar.findIndex(
          (elemen) => elemen === aktif || elemen.contains(aktif),
        );
  const tujuan =
    indeks === -1
      ? mundur
        ? daftar.length - 1
        : 0
      : (indeks + (mundur ? -1 : 1) + daftar.length) % daftar.length;

  return daftar[tujuan] ?? null;
}

/**
 * Ambil alih `Tab` bila fokus memang milik area permainan.
 *
 * `body`/`html` dianggap belum fokus (mis. setelah tombol HUD di-`blur`),
 * sehingga tekanan berikutnya menarik fokus kembali ke kontrol game, bukan
 * membiarkan peramban memindahkannya ke luar halaman.
 *
 * @returns `true` bila event sudah ditangani (fokus dipindahkan).
 */
export function tangkapTab(
  event: KeyboardEvent,
  wadah: HTMLElement,
  aktif: Element | null = document.activeElement,
): boolean {
  if (event.key !== "Tab" || event.defaultPrevented) return false;
  // Ctrl+Tab/Alt+Tab/Meta+Tab milik peramban (pindah tab/jendela).
  if (event.ctrlKey || event.altKey || event.metaKey) return false;

  const diDalam = aktif !== null && wadah.contains(aktif);
  const belumFokus =
    aktif === null ||
    aktif === document.body ||
    aktif === document.documentElement;
  if (!diDalam && !belumFokus) return false;

  event.preventDefault();
  const tujuan = fokusBerikutnya(wadah, aktif, event.shiftKey);
  (tujuan ?? wadah).focus({ preventScroll: true });
  return true;
}
