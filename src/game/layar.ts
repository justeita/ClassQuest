import { GAME_HEIGHT, GAME_WIDTH } from "./constants";
import { JANGKAUAN_PENUNJUK } from "./layout";

/**
 * Konversi koordinat dunia ke ruang layar internal 640×360.
 *
 * Prompt interaksi dan penanda NPC adalah DOM di atas canvas, sedangkan posisi
 * NPC berada di koordinat dunia. Kalau kamera bergeser (ruangan lebih besar
 * dari layar), koordinat dunia tidak boleh dipakai langsung sebagai persen
 * layar — hasilnya chip meleset dari NPC.
 */

/**
 * Potongan kamera yang dibutuhkan konversi: posisi scroll, zoom, dan ukuran
 * bidang layar. Kamera Phaser memenuhi bentuk ini apa adanya, jadi pemanggil
 * boleh mengoper `cameras.main` tanpa menyalin nilai.
 */
export type KameraView = {
  scrollX: number;
  scrollY: number;
  /** Zoom kamera; di luar 1 dunia ikut membesar/mengecil. Default 1. */
  zoom?: number;
  /** Ukuran bidang layar internal dalam px. Default resolusi internal. */
  width?: number;
  height?: number;
};

export type TitikLayar = { x: number; y: number };

/**
 * Titik dunia → titik layar. Nilai boleh pecahan; pembulatan di pemanggil.
 *
 * Zoom kamera berskala dari **titik tengah** bidang layar
 * (`origin` 0,5), jadi rumusnya:
 *
 * ```text
 * layar = zoom × (dunia − scroll) + tengah × (1 − zoom)
 * ```
 *
 * Saat zoom 1 suku kedua hilang dan hasilnya sama dengan `dunia − scroll`.
 */
export function duniaKeLayar(
  kamera: KameraView,
  x: number,
  y: number,
): TitikLayar {
  const zoom = kamera.zoom ?? 1;
  const lebar = kamera.width ?? GAME_WIDTH;
  const tinggi = kamera.height ?? GAME_HEIGHT;
  const tengahX = lebar / 2;
  const tengahY = tinggi / 2;

  return {
    x: zoom * (x - kamera.scrollX) + tengahX * (1 - zoom),
    y: zoom * (y - kamera.scrollY) + tengahY * (1 - zoom),
  };
}

/**
 * Posisi dan skala container UI Phaser supaya menempel di koordinat layar
 * walau kamera di-zoom.
 *
 * Objek ber-`scrollFactor(0)` tidak tergeser scroll, tetapi tetap ikut
 * diperbesar/diperkecil zoom — panel dialog dan portrait akan mengecil dan
 * menjauh dari tepi. Skala terbalik `1 / zoom` plus geseran setengah bidang
 * mengembalikannya persis: anak di koordinat lokal `c` jatuh kembali di
 * `layar = c`.
 */
export function posisiUiTerkunci(
  lebar: number,
  tinggi: number,
  zoom: number,
): { x: number; y: number; skala: number } {
  const skala = 1 / zoom;
  return {
    x: (lebar / 2) * (1 - skala),
    y: (tinggi / 2) * (1 - skala),
    skala,
  };
}

/**
 * Apakah titik jangkar papan nama masih di dalam layar.
 *
 * Papan nama digambar ke atas dari titik jangkarnya, jadi titik yang sudah
 * melewati tepi atas layar berarti namanya ikut keluar. Pemanggil memakai ini
 * untuk menyembunyikan papan nama NPC yang jauh, tanpa menjepitnya ke tepi.
 */
export function terlihatDiLayar(
  titik: TitikLayar,
  lebar = GAME_WIDTH,
  tinggi = GAME_HEIGHT,
): boolean {
  return titik.x >= 0 && titik.x <= lebar && titik.y >= 0 && titik.y <= tinggi;
}

/**
 * Jarak aman penanda dari tepi layar, dalam piksel internal.
 *
 * Beacon menempel di tepi, tetapi penunjuk arahnya menjulur keluar sampai
 * `JANGKAUAN_PENUNJUK` (22,5 px) dari pusat kotak. Bila pusat beacon lebih
 * dekat dari itu ke tepi, penunjuk — satu-satunya petunjuk arah NPC — terpotong
 * tepi kanvas dan beacon jadi tidak terbaca. Dulu sisi kiri/kanan/bawah hanya
 * 16 px sehingga penunjuknya habis terpotong, sementara sisi atas 24 px aman;
 * sekarang keempat sisi memakai nilai yang sama dengan sisa 1,5 px.
 *
 * Cincin denyut juga melebar sampai ~22 px dari pusat, jadi ikut tertampung.
 */
export const INSET_PENANDA = {
  atas: Math.ceil(JANGKAUAN_PENUNJUK + 1.5),
  kanan: Math.ceil(JANGKAUAN_PENUNJUK + 1.5),
  bawah: Math.ceil(JANGKAUAN_PENUNJUK + 1.5),
  kiri: Math.ceil(JANGKAUAN_PENUNJUK + 1.5),
} as const;

/** Jarak aman penanda; isi keempat sisi bila perlu nilai khusus. */
export type InsetPenanda = {
  atas: number;
  kanan: number;
  bawah: number;
  kiri: number;
};

/** Posisi penanda beserta statusnya: menempel di NPC atau di tepi layar. */
export type PenandaLayar = TitikLayar & {
  /** Titik asli di luar area aman, jadi penanda ditempel di tepi layar. */
  tepi: boolean;
  /** Arah NPC dalam derajat: 0 = kanan, 90 = bawah. Dipakai penunjuk beacon. */
  sudut: number;
};

/**
 * Posisi penanda quest di layar.
 *
 * Selama NPC masih terlihat (di dalam area aman selebar `inset` dari tepi),
 * posisinya dipakai apa adanya sehingga tanda menempel di atas kepalanya.
 * Begitu NPC keluar pandangan, penanda **tidak menghilang**: posisinya
 * dijepit ke tepi layar dan `sudut` menunjuk arah NPC. Karena posisinya
 * dihitung ulang tiap frame, beacon tepi ikut bergeser mengikuti NPC saat
 * pemain berjalan mendekat, lalu kembali menjadi penanda biasa tepat ketika
 * NPC masuk area aman.
 */
export function posisiPenanda(
  titik: TitikLayar,
  lebar = GAME_WIDTH,
  tinggi = GAME_HEIGHT,
  inset: InsetPenanda = INSET_PENANDA,
): PenandaLayar {
  // Jaga-jaga untuk layar yang sangat kecil: area aman tidak boleh terbalik.
  const kiri = Math.min(inset.kiri, lebar);
  const kanan = Math.max(kiri, lebar - inset.kanan);
  const atas = Math.min(inset.atas, tinggi);
  const bawah = Math.max(atas, tinggi - inset.bawah);

  const diLuar =
    titik.x < kiri || titik.x > kanan || titik.y < atas || titik.y > bawah;

  if (!diLuar) {
    return { x: titik.x, y: titik.y, tepi: false, sudut: 0 };
  }

  const x = Math.min(Math.max(titik.x, kiri), kanan);
  const y = Math.min(Math.max(titik.y, atas), bawah);
  const sudut = (Math.atan2(titik.y - y, titik.x - x) * 180) / Math.PI;

  return { x, y, tepi: true, sudut };
}
