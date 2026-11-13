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
 * Apakah titik berada di dalam area permainan.
 *
 * `margin` positif memperluas batas ke luar layar, negatif mempersempitnya.
 * `posisiPenanda` memakainya untuk mengecek area aman selebar `pad`;
 * koordinat prompt interaksi memakai batas apa adanya.
 */
export function dalamLayar(
  titik: TitikLayar,
  lebar = GAME_WIDTH,
  tinggi = GAME_HEIGHT,
  margin = 0,
): boolean {
  return (
    titik.x >= -margin &&
    titik.x <= lebar + margin &&
    titik.y >= -margin &&
    titik.y <= tinggi + margin
  );
}

/** Posisi penanda beserta status tepi dan arah panahnya. */
export type PenandaLayar = TitikLayar & {
  /** Titik asli di luar area aman, jadi penanda ditempel di tepi layar. */
  tepi: boolean;
  /** Arah panah dalam derajat: 0 = kanan, 90 = bawah (searah CSS rotate). */
  sudut: number;
};

/**
 * Posisi penanda quest di layar.
 *
 * Selama NPC masih terlihat (di dalam area aman selebar `pad` dari tepi),
 * posisinya dipakai apa adanya sehingga tanda menempel di atas kepalanya.
 * Begitu NPC keluar pandangan, penanda **tidak menghilang**: posisinya
 * dijepit ke tepi layar dan `sudut` menunjuk arah NPC berada. Saat pemain
 * berjalan mendekat, posisi jepitan ini ikut bergeser mengikuti NPC dan
 * akhirnya kembali menjadi penanda biasa tepat ketika NPC masuk area aman —
 * tidak ada lompatan karena batasnya memakai `pad` yang sama.
 */
export function posisiPenanda(
  titik: TitikLayar,
  lebar = GAME_WIDTH,
  tinggi = GAME_HEIGHT,
  pad = 20,
): PenandaLayar {
  // Jaga-jaga untuk layar yang sangat kecil: area aman tidak boleh terbalik.
  const kiri = pad;
  const kanan = Math.max(pad, lebar - pad);
  const atas = pad;
  const bawah = Math.max(pad, tinggi - pad);

  // Area aman = layar yang dipersempit `pad` di tiap sisi. Margin negatif
  // membuat `dalamLayar` mengecek batas dalam, bukan batas layar luar.
  const diLuar = !dalamLayar(titik, lebar, tinggi, -pad);

  if (!diLuar) {
    return { x: titik.x, y: titik.y, tepi: false, sudut: 0 };
  }

  const x = Math.min(Math.max(titik.x, kiri), kanan);
  const y = Math.min(Math.max(titik.y, atas), bawah);
  const sudut = (Math.atan2(titik.y - y, titik.x - x) * 180) / Math.PI;

  return { x, y, tepi: true, sudut };
}
