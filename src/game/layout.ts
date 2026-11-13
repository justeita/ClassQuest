import { GAME_HEIGHT, GAME_WIDTH } from "./constants";

/**
 * Geometri UI dalam ruang internal 640×360 (ADR 0009).
 *
 * Satu sumber angka untuk dua lapisan: Phaser memakai nilai ini untuk menggambar
 * panel dan portrait, React memakainya untuk menaruh teks di posisi yang sama.
 * Jangan menyalin angka ke komponen — impor dari sini supaya tidak melenceng.
 */

/** Panel dialog: x=16, y=240, 608×104 (docs/04-game/scene-format.md). */
export const TEXTBOX = {
  x: 16,
  y: 240,
  width: 608,
  height: 104,
  /** Jarak teks dari tepi panel (ruang internal). */
  padding: 16,
  /** Jarak baris pertama dari tepi atas panel. */
  paddingTop: 8,
} as const;

/**
 * Panel tantangan (docs/05-frontend/game-player.md § Challenge).
 *
 * Ditata sebagai kotak pilihan dialog RPG di **kanan atas dialog**, menyisakan
 * sisi kiri tetap terbuka agar portrait dan dialog NPC tetap terlihat.
 */
export const CHALLENGE = {
  /** Jarak dari tepi kanan ruang game; sejajar dengan tepi kanan dialog. */
  insetRight: 16,
  /** Lebar kotak pilihan RPG di kanan atas dialog. */
  width: 380,
  /** Jarak dari tepi kiri/kanan ruang game (kompatibilitas). */
  insetX: 16,
  /** Jarak tepi bawah panel ke tepi atas dialog. */
  gapDialog: 8,
  /** Tinggi maksimum panel sebelum isinya digulir. */
  maxHeight: 210,
} as const;

/** Portrait di atas panel: bingkai 72×72, gambar 64×64 di dalamnya. */
export const PORTRAIT = {
  x: 26,
  y: 164,
  /** Y saat portrait diletakkan tepat di atas panel dialog (center). */
  yAtas: 160,
  frameSize: 72,
  imageInset: 4,
  imageSize: 64,
} as const;

/**
 * Penanda quest (`NpcMarker.tsx`) — kotak `!` yang sama dipakai saat NPC
 * terlihat maupun saat NPC di luar pandangan menjadi beacon tepi layar.
 *
 * Geometrinya tinggal di sini supaya jarak aman dari tepi layar
 * (`INSET_PENANDA` di `layar.ts`) bisa dihitung dari jangkauan penunjuk, bukan
 * angka yang disalin dua kali.
 */
export const PENANDA = {
  /** Sisi kotak `!`. */
  kotak: 26,
  /** Segitiga penunjuk arah yang menjulur keluar dari pusat kotak. */
  penunjuk: {
    lebar: 9,
    tinggi: 7,
    /** Jarak pusat segitiga dari pusat kotak. */
    geser: 19,
  },
} as const;

/**
 * Jarak ujung penunjuk dari pusat kotak, dalam px internal: segitiga digeser
 * sejauh `geser`, lalu ujungnya menambah setengah tingginya.
 */
export const JANGKAUAN_PENUNJUK =
  PENANDA.penunjuk.geser + PENANDA.penunjuk.tinggi / 2;

/** Posisi/ukuran dalam persen ruang game, untuk `style` CSS overlay DOM. */
export function persen(nilai: number, total: number): string {
  return `${Number(((nilai / total) * 100).toFixed(4))}%`;
}

/**
 * Koordinat x internal → persen lebar ruang game **aktual**.
 *
 * Lebar internal mengikuti kontainer (`lebarKanvas`), jadi angka 640 tidak
 * lagi pasti. Nilai aktual datang dari CSS variable `--gw` yang dipasang di
 * bingkai kanvas; fallback `GAME_WIDTH` menjaga pratinjau/tes tetap jalan.
 */
export function persenLebar(x: number): string {
  return `calc(${x} / var(--gw, ${GAME_WIDTH}) * 100%)`;
}

/** Koordinat y internal → persen tinggi ruang game. */
export function persenTinggi(y: number): string {
  return persen(y, GAME_HEIGHT);
}

/** Kotak internal → `left/top/width/height` persen ruang game. */
export function kotakPersen(kotak: {
  x: number;
  y: number;
  width: number;
  height: number;
}): { left: string; top: string; width: string; height: string } {
  return {
    left: persenLebar(kotak.x),
    top: persen(kotak.y, GAME_HEIGHT),
    width: persenLebar(kotak.width),
    height: persen(kotak.height, GAME_HEIGHT),
  };
}

/**
 * Panjang internal (px pada tinggi 360) → lebar kontainer game.
 *
 * Lebar internal dunia mengikuti kontainer (`lebarKanvas`), jadi 1 unit
 * internal = `100 / --gw` persen lebar kontainer. `cqh` tetap dipakai sebagai
 * acuan karena tinggi internal selalu 360 — keduanya sebanding.
 */
export function cqw(px: number): string {
  // `--gw` = lebar dunia internal dalam px (mis. 780 pada layar 2:1), jadi
  // porsi lebar = px / --gw, dikalikan 1cqw (1% lebar bingkai kanvas).
  // Satuan `cqw` dipakai (bukan `%`) karena nilai ini juga dipakai untuk
  // padding dan fontSize, yang tidak menerima persen.
  return `calc(${px} / var(--gw, ${GAME_WIDTH}) * 100cqw)`;
}

/** Ukuran huruf setara `pxInternal`, dibatasi `minPx`–`maxPx` agar tetap terbaca. */
export function ukuranHuruf(
  pxInternal: number,
  minPx: number,
  maxPx: number,
): string {
  return `clamp(${minPx}px, ${cqw(pxInternal)}, ${maxPx}px)`;
}
