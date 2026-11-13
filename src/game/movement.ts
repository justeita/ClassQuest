import type Phaser from "phaser";

import {
  KAKI_DALAM,
  KAKI_SETENGAH_LEBAR,
  type Tabrakan,
} from "./world/collision";
import type { ArahGerak } from "./world/karakter";

/**
 * Gerak pemain top-down 8 arah.
 *
 * Bukan fisika Phaser: kecepatan dihitung per frame dan tabrakan diperiksa
 * dengan rumus editor peta (`world/collision.ts`). Hasilnya sama dengan yang
 * dilihat pembuat peta, dan tidak ada badan fisika yang bisa "menempel" di
 * sudut objek.
 *
 * Sumbu X dan Y diperiksa terpisah supaya pemain bisa menyusur dinding; arah
 * diagonal **tidak** dinormalisasi — persis seperti editor.
 */

/** Kecepatan pemain dalam piksel per detik (editor: 180). */
export const KECEPATAN_PEMAIN = 180;

/** Batas `dt` agar pemain tidak melompat menembus dinding setelah jeda. */
export const DT_MAKSIMUM = 0.05;

export const PEMAIN_NAMA = "player";

/** Tombol gerak: tiap arah bisa dipicu beberapa tombol (panah + WASD). */
export type MovementKeys = Record<
  "left" | "right" | "up" | "down",
  Phaser.Input.Keyboard.Key[]
>;

/**
 * Arah hadap dari tombol yang sedang ditekan. Diagonal dihitung dari kombinasi
 * horizontal + vertikal; `null` bila tidak ada tombol gerak.
 */
export function arahGerak(keys?: MovementKeys): ArahGerak | null {
  const kiri = keys?.left.some((key) => key.isDown) ?? false;
  const kanan = keys?.right.some((key) => key.isDown) ?? false;
  const atas = keys?.up.some((key) => key.isDown) ?? false;
  const bawah = keys?.down.some((key) => key.isDown) ?? false;

  const horizontal = kiri ? "left" : kanan ? "right" : null;
  const vertikal = atas ? "up" : bawah ? "down" : null;

  if (horizontal && vertikal) {
    return `${vertikal}-${horizontal}` as ArahGerak;
  }
  return horizontal ?? vertikal;
}

/** Vektor satuan sumbu dari arah hadap; diagonal tetap 1 di tiap sumbu. */
export function vektorArah(arah: ArahGerak): { x: number; y: number } {
  const x = arah.endsWith("left") ? -1 : arah.endsWith("right") ? 1 : 0;
  const y = arah.startsWith("up") ? -1 : arah.startsWith("down") ? 1 : 0;
  return { x, y };
}

export function ambilTombolGerak(
  scene: Phaser.Scene,
): MovementKeys | undefined {
  const keyboard = scene.input.keyboard;
  if (!keyboard) return undefined;

  // Nonaktifkan global capture agar input teks HTML (DOM) tidak diblokir oleh Phaser
  keyboard.disableGlobalCapture();

  const wasd = keyboard.addKeys("W,A,S,D") as Record<
    "W" | "A" | "S" | "D",
    Phaser.Input.Keyboard.Key
  >;
  const panah = keyboard.addKeys("up,down,left,right") as Record<
    "up" | "down" | "left" | "right",
    Phaser.Input.Keyboard.Key
  >;

  // Bersihkan capture browser agar pengetikan huruf W, A, S, D di DOM berjalan normal
  keyboard.clearCaptures();

  return {
    left: [wasd.A, panah.left],
    right: [wasd.D, panah.right],
    up: [wasd.W, panah.up],
    down: [wasd.S, panah.down],
  };
}

export type LangkahInput = {
  /** Titik kaki pemain sebelum bergerak. */
  x: number;
  y: number;
  arah: ArahGerak | null;
  /** Selang waktu frame dalam detik (sudah dibatasi `DT_MAKSIMUM`). */
  dt: number;
  kecepatan?: number;
  tabrakan: Tabrakan;
  /** Ukuran dunia; pemain tidak keluar dari batas ini. */
  batas: { width: number; height: number };
};

/**
 * Hitung titik kaki baru: gerak per sumbu, dibatalkan per sumbu bila menabrak,
 * lalu dijepit ke batas dunia. Mengembalikan titik lama bila tidak ada tombol
 * atau bila kedua sumbu tertahan.
 */
export function langkahPemain(input: LangkahInput): { x: number; y: number } {
  const { arah, dt, tabrakan, batas } = input;
  if (!arah) return { x: input.x, y: input.y };

  const kecepatan = input.kecepatan ?? KECEPATAN_PEMAIN;
  const vektor = vektorArah(arah);
  const nx = input.x + vektor.x * kecepatan * dt;
  const ny = input.y + vektor.y * kecepatan * dt;

  let x = input.x;
  let y = input.y;

  if (!tabrakan(nx, y)) {
    x = Math.max(
      KAKI_SETENGAH_LEBAR,
      Math.min(batas.width - KAKI_SETENGAH_LEBAR, nx),
    );
  }
  if (!tabrakan(x, ny)) {
    y = Math.max(KAKI_DALAM, Math.min(batas.height, ny));
  }

  return { x, y };
}
