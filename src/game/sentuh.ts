/**
 * Deteksi perangkat sentuh, tanpa dependensi DOM supaya bisa diuji sebagai
 * fungsi murni. Pemanggil (`useSentuh.ts`) yang membaca `window.matchMedia` dan
 * `navigator.maxTouchPoints`, lalu menyerahkan hasilnya ke sini.
 *
 * Aturannya sengaja **bukan** `maxTouchPoints > 0`: laptop dengan layar sentuh
 * tetap memakai papan tombol dan tetikus, jadi menampilkan joystick di sana cuma
 * menutupi dunia. Yang menentukan adalah penunjuk **utama** yang kasar dan tidak
 * bisa melayang (`pointer: coarse` + `hover: none`) — begitulah ponsel dan
 * tablet melaporkan diri.
 *
 * Kalau `matchMedia` tidak ada (jsdom, SSR), jatuh ke `maxTouchPoints` supaya
 * perilakunya tetap masuk akal.
 */

export type InfoSentuh = {
  /** `navigator.maxTouchPoints`; 0 di perangkat tanpa layar sentuh. */
  maxTouchPoints: number;
  /** Hasil `(pointer: coarse)`: penunjuk utama tidak presisi. */
  pointerCoarse: boolean;
  /** Hasil `(hover: none)`: penunjuk utama tidak bisa melayang di atas elemen. */
  hoverNone: boolean;
  /** `window.matchMedia` tersedia. */
  mediaQuery: boolean;
};

export function perangkatSentuh(info: InfoSentuh): boolean {
  if (!info.mediaQuery) return info.maxTouchPoints > 0;
  return info.pointerCoarse && info.hoverNone;
}
