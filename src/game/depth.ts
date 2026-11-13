/**
 * Urutan gambar (depth) game, satu tempat untuk semua lapisan.
 *
 * Objek dunia memakai `setDepth(y)` agar pemain bisa berjalan di belakang
 * rumah/pohon (world-design.md § Perspektif). Nilai `y` bisa mencapai tinggi
 * peta desa (1792), jadi UI **tidak boleh** memakai angka kecil seperti 100 —
 * dulu textbox di depth 100 tertimpa meja dan NPC di separuh bawah ruangan.
 *
 * Aturannya: UI selalu di atas dunia, tanpa bergantung pada ukuran map.
 */

/** Gambar peta desa: paling bawah, tidak pernah menutupi apa pun. */
export const DEPTH_LATAR = -100_000;

/**
 * UI (textbox dialog, prompt interaksi). Jauh di atas objek dunia mana pun;
 * kalau map suatu hari lebih tinggi dari ini, naikkan angka ini — jangan
 * menurunkan depth UI.
 */
export const DEPTH_UI = 10_000;
