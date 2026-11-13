import { GAME_HEIGHT, GAME_WIDTH } from "./constants";

/**
 * Konversi koordinat dunia ke ruang layar internal 640×360.
 *
 * Prompt interaksi dan penanda NPC adalah DOM di atas canvas, sedangkan posisi
 * NPC berada di koordinat dunia. Kalau kamera bergeser (ruangan lebih besar
 * dari layar), koordinat dunia tidak boleh dipakai langsung sebagai persen
 * layar — hasilnya chip meleset dari NPC.
 */

export type KameraView = {
  scrollX: number;
  scrollY: number;
};

export type TitikLayar = { x: number; y: number };

/** Titik dunia → titik layar. Nilai boleh pecahan; pembulatan di pemanggil. */
export function duniaKeLayar(
  kamera: KameraView,
  x: number,
  y: number,
): TitikLayar {
  return {
    x: x - kamera.scrollX,
    y: y - kamera.scrollY,
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
 * Beacon tepi sengaja didekatkan ke tepi: kotaknya berukuran 26 px (setengah
 * 13 px), jadi 16 px masih menyisakan 3 px di dalam layar. Penunjuk boleh
 * sedikit menonjol keluar — ujungnya terpotong rapi oleh bingkai game dan
 * justru memperkuat kesan "menunjuk keluar". Sisi atas 24 px memberi ruang
 * agar penunjuk tidak habis terpotong.
 */
export const INSET_PENANDA = {
  atas: 24,
  kanan: 16,
  bawah: 16,
  kiri: 16,
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
