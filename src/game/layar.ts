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
 * Jarak aman penanda dari tepi layar, dalam piksel internal.
 *
 * Sisi atas lebih lebar karena baris HUD duduk di sana: tombol Quest di kiri
 * dan jeda/musik/catatan di kanan. Dengan jarak ini beacon tidak menutupi
 * tombol, jadi terlihat seperti bagian HUD, bukan tempelan di atasnya.
 */
export const INSET_PENANDA = {
  atas: 52,
  kanan: 18,
  bawah: 20,
  kiri: 18,
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
};

/**
 * Posisi penanda quest di layar.
 *
 * Selama NPC masih terlihat (di dalam area aman selebar `inset` dari tepi),
 * posisinya dipakai apa adanya sehingga tanda menempel di atas kepalanya.
 * Begitu NPC keluar pandangan, penanda **tidak menghilang**: posisinya
 * dijepit ke tepi layar. Karena posisinya dihitung ulang tiap frame, beacon
 * tepi ikut bergeser mengikuti NPC saat pemain berjalan mendekat, lalu
 * kembali menjadi penanda biasa tepat ketika NPC masuk area aman.
 *
 * Arah NPC ditunjukkan oleh sisi layar tempat beacon berhenti — tidak perlu
 * panah, jadi tidak ada bentuk segitiga yang menutupi dunia.
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
    return { x: titik.x, y: titik.y, tepi: false };
  }

  return {
    x: Math.min(Math.max(titik.x, kiri), kanan),
    y: Math.min(Math.max(titik.y, atas), bawah),
    tepi: true,
  };
}
