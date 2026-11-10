/**
 * Konstanta game tanpa dependensi — boleh diimpor modul murni (tes, camera,
 * maps) tanpa menarik Phaser ikut ke jsdom.
 *
 * Sumber angka: ADR 0009 (resolusi 640×360, tile 16×16).
 */

export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 360;

/** Ukuran satu tile dalam piksel. */
export const TILE_SIZE = 16;
