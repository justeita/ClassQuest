import type { ArahGerak } from "./world/karakter";

/**
 * Joystick layar sentuh → arah gerak 8 arah.
 *
 * Dunia hanya mengenal delapan arah (`ArahGerak`), jadi tongkat analog diubah
 * dengan **snap ke sektor 45°**, bukan disalurkan sebagai vektor bebas. Dengan
 * begitu kecepatan dan animasi pemain sama persis dengan jalur papan tombol —
 * tidak ada aturan gerak kedua yang harus dijaga sinkron.
 *
 * `dx`/`dy` adalah pergeseran ujung tongkat dari pusat, sudah dinormalkan ke
 * jari-jari pad (mis. -1..1). `DEADZONE_STIK` menahan goyangan jari: di bawah
 * ambang itu tongkat dianggap netral supaya pemain bisa berhenti di tempat.
 */

/** Ambang pergeseran minimum sebelum tongkat dianggap menggerakkan pemain. */
export const DEADZONE_STIK = 0.32;

/** Arah hasil snap per sektor 45°, mulai dari kanan lalu searah jarum jam. */
const ARAH_SEKTOR: readonly ArahGerak[] = [
  "right",
  "down-right",
  "down",
  "down-left",
  "left",
  "up-left",
  "up",
  "up-right",
];

/**
 * Arah hadap dari pergeseran tongkat; `null` bila masih di dalam deadzone.
 *
 * Sudut tongkat dibulatkan ke kelipatan 45° lalu diambil arahnya. Pendekatan
 * sudut dipakai (bukan membandingkan komponen dengan `sin 45°`) supaya tepat di
 * perbatasan diagonal tidak ada ambang pecahan yang bisa meleset satu ULP —
 * hasilnya selalu salah satu dari delapan `ArahGerak`.
 */
export function arahDariStik(
  dx: number,
  dy: number,
  deadzone: number = DEADZONE_STIK,
): ArahGerak | null {
  const panjang = Math.hypot(dx, dy);
  if (!(panjang >= deadzone) || panjang === 0) return null;

  // `atan2` mengukur sudut dari sumbu X: 0 = kanan, positif = bawah.
  const sektor = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
  return ARAH_SEKTOR[(sektor + 8) % 8];
}

/**
 * Jaga pergeseran ujung tongkat tetap di dalam jari-jari pad, untuk digambar.
 * Arahnya dipertahankan; hanya panjangnya yang dijepit.
 */
export function batasiStik(
  dx: number,
  dy: number,
  radius: number,
): { x: number; y: number } {
  const panjang = Math.hypot(dx, dy);
  if (panjang <= radius || panjang === 0) return { x: dx, y: dy };
  const skala = radius / panjang;
  return { x: dx * skala, y: dy * skala };
}
