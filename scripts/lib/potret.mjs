/**
 * Pengukuran potret yang dipakai bersama oleh importer (`import-portraits.mjs`)
 * dan alat ukur (`ukur-portret.mjs`).
 *
 * Yang diukur bukan tinggi gambar, melainkan **kepala**: leher dideteksi dari
 * penyempitan lebar terbawah antara puncak kepala/bahu dan 80% bbox. Kalau tidak
 * ada penyempitan berarti (rambut atau jubah lebar), rasio bawaan dipakai supaya
 * skalanya tidak melejit. Importer memakai tinggi ini untuk menyeragamkan wajah;
 * alat ukur memakainya untuk melaporkan seberapa lebar kepala tiap karakter.
 *
 * Berkasnya murni (tanpa I/O) supaya mudah diuji dan dipakai ulang.
 */

/** Ambang alpha untuk menghitung kotak isi (buang bercak hampir transparan). */
export const AMBANG_ALPHA = 16;

/**
 * Porsi bbox yang dipakai sebagai tinggi kepala kalau leher tidak terdeteksi —
 * mis. tokoh berambut/jubah lebar yang lebarnya tidak menyempit di leher.
 * Nilainya rata-rata leher karakter lain.
 */
export const PORSI_KEPALA_BAWAAN = 0.52;

/** Kotak piksel opaque sebuah gambar. */
export function kotakOpaque(image) {
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (image.data[(y * image.width + x) * 4 + 3] < AMBANG_ALPHA) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new Error("potret kosong (tanpa piksel opaque)");
  return { minX, minY, maxX, maxY };
}

/** Profil lebar opaque tiap baris di dalam kotak isi. */
export function profilLebar(image, box) {
  const tinggi = box.maxY - box.minY + 1;
  const profil = new Array(tinggi);
  for (let k = 0; k < tinggi; k += 1) {
    const y = box.minY + k;
    let minX = image.width;
    let maxX = -1;
    for (let x = box.minX; x <= box.maxX; x += 1) {
      if (image.data[(y * image.width + x) * 4 + 3] < AMBANG_ALPHA) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
    profil[k] = maxX < 0 ? 0 : maxX - minX + 1;
  }
  return profil;
}

/**
 * Tinggi kepala dalam px sumber: dari tepi atas bbox sampai leher — penyempitan
 * lebar terdalam antara puncak kepala/bahu dan 80% bbox. Bila tidak ada
 * penyempitan berarti (rambut atau jubah lebar), pakai rasio bawaan supaya
 * skalanya tidak melejit.
 */
export function tinggiKepala(image, box) {
  const profil = profilLebar(image, box);
  const tinggi = profil.length;

  const lo = Math.max(0, Math.round(tinggi * 0.15));
  const hi = Math.max(lo, Math.round(tinggi * 0.45));
  let iPuncak = lo;
  let lebarPuncak = -1;
  for (let i = lo; i <= hi; i += 1) {
    if (profil[i] > lebarPuncak) {
      lebarPuncak = profil[i];
      iPuncak = i;
    }
  }

  let iLeher = iPuncak;
  let lebarLeher = Infinity;
  const batasLeher = Math.max(iPuncak, Math.round(tinggi * 0.8));
  for (let i = iPuncak; i <= batasLeher; i += 1) {
    if (profil[i] < lebarLeher) {
      lebarLeher = profil[i];
      iLeher = i;
    }
  }

  if (lebarPuncak <= 0 || lebarLeher > lebarPuncak * 0.8) {
    return Math.max(1, Math.round(tinggi * PORSI_KEPALA_BAWAAN));
  }
  return Math.max(1, iLeher);
}

/** Nilai tengah; dipakai supaya satu ekspresi janggal tidak menggeser skala. */
export function median(nilai) {
  const urut = [...nilai].sort((a, b) => a - b);
  const tengah = Math.floor(urut.length / 2);
  return urut.length % 2 === 0
    ? (urut[tengah - 1] + urut[tengah]) / 2
    : urut[tengah];
}

/**
 * Lebar kepala: lebar isi terbesar di dalam pita setinggi leher. Dipakai alat
 * ukur (`ukur-portret.mjs`) dan tes regresi supaya angka `KOREKSI` di importer
 * bisa diturunkan dan dijaga dari sumber yang sama.
 */
export function lebarKepala(image, box) {
  const batas = Math.min(box.minY + tinggiKepala(image, box) - 1, box.maxY);
  let lebar = 0;
  for (let y = box.minY; y <= batas; y += 1) {
    let minX = image.width;
    let maxX = -1;
    for (let x = box.minX; x <= box.maxX; x += 1) {
      if (image.data[(y * image.width + x) * 4 + 3] < AMBANG_ALPHA) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
    if (maxX >= 0 && maxX - minX + 1 > lebar) lebar = maxX - minX + 1;
  }
  return lebar;
}
