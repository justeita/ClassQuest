import { GAME_HEIGHT, GAME_WIDTH } from "./constants";

/**
 * Geometri UI dalam ruang internal 640×360 (ADR 0009).
 *
 * Satu sumber angka untuk lapisan DOM: panel dialog, potret, dan teks
 * (`DialogueBox.tsx`) memakai nilai ini supaya tidak melenceng satu sama lain.
 * Jangan menyalin angka ke komponen — impor dari sini.
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
  /**
   * Jari-jari sudut panel (px internal). Dipakai juga sebagai jarak masuk potret
   * dari sisi kotak: kalau potret menempel tepat di tepi, sudut membulat panel
   * memotong bahu karakter dan menyisakan celah latar di bawahnya — potret
   * tampak melayang. Dengan jarak masuk sebesar radius ini, tepi potret berhenti
   * tepat di titik singgung lengkungan sudut.
   */
  radius: 14,
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

/**
 * Faktor ukuran potret terhadap ukuran lama (setengah lebar panel). Potret
 * setengah panel terasa terlalu besar dan menutupi layar; 0,85 membuat wajah
 * masih terbaca jelas tetapi tidak mendominasi. Lebar dan tinggi dikalikan
 * dengan faktor yang sama supaya rasio kanvas importer tetap utuh.
 */
const SKALA_POTRET = 0.85;

/**
 * Potret dialog gaya Persona (ADR 0023): tanpa bingkai, gambarnya berdiri **di
 * atas** panel dialog — dasarnya sejajar tepi atas panel, jadi tidak ada bagian
 * potret yang tertutup kotak.
 *
 * NPC berpangkal di sisi kiri atas panel, MC (yang dicerminkan) di sisi kanan
 * atas; keduanya menjulur ke tengah tepi atas. Slot berukuran tetap dan
 * gambarnya dirender `object-contain`, jadi potret tetap mengisi persis walau
 * rasio berkasnya meleset sedikit.
 *
 * `scripts/import-portraits.mjs` menyeragamkan **tinggi kepala** (bukan tinggi
 * gambar) dan menaruh semua potret di kanvas berukuran sama — jadi wajah semua
 * karakter tampil sebesar yang sama dan potret tidak melompat saat ekspresi
 * berganti. Siluet karakter tidak dipotong di sisi luarnya; jarak dari kotak
 * dialog diatur lewat `inset` di sini. Rasio kanvas importer (456:360) sengaja
 * sama persis dengan slot di sini; MC yang dicerminkan membuat rata kiri kanvas
 * jadi rata kanan slot. Berkas aslinya lebih kecil dari kanvas lama supaya
 * cepat dimuat.
 */
export const PORTRAIT = {
  /** Lebar slot potret (px internal). */
  width: (TEXTBOX.width / 2) * SKALA_POTRET,
  /**
   * Tinggi slot potret (px internal). Menjaga rasio 456:360 yang sama dengan
   * kanvas importer, dan cukup memuat kepala beserta bahu di atas panel
   * (panel mulai di `y=240`).
   */
  height: TEXTBOX.y * SKALA_POTRET,
  /**
   * Jarak potret dari sisi luar panel (px internal). Sedikit lebih besar dari
   * radius sudut panel: tepi potret tidak bertumpuk dengan lengkungan sudut,
   * jadi bahu karakter tidak terpotong dan tidak terlihat mepet ke tepi kotak.
   */
  inset: TEXTBOX.radius + 4,
} as const;

/**
 * Ukuran intrinsik berkas potret (`456×360`). Dipakai `next/image` sebagai
 * `width`/`height` supaya rasio kotaknya benar sebelum gambar selesai dimuat;
 * angkanya harus sama dengan `LEBAR_KANVAS`/`TINGGI_KANVAS` di
 * `scripts/import-portraits.mjs`.
 */
export const PORTRAIT_SOURCE = {
  width: 456,
  height: 360,
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
