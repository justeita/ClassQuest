/**
 * Catatan dialog dan jurnal konsep (PR D).
 *
 * Log diisi dari sisi game: satu entri per beat dialog/narasi saat beat tampil
 * penuh — bukan potongan typewriter. Jurnal konsep terisi dari jawaban soal.
 *
 * Modul ini murni supaya pengelompokan dan penggabungannya bisa dites tanpa
 * Phaser maupun React.
 */

export type EntriDialog = {
  /** Nama pembicara; null untuk narasi (ditampilkan sebagai "Narasi"). */
  name: string | null;
  text: string;
  /** Judul scene tempat entri ini muncul; null bila scene tak berjudul. */
  sceneJudul: string | null;
};

export type EntriKonsep = {
  conceptTag: string;
  benar: boolean;
  explanation: string;
};

/**
 * Tambahkan entri dialog. Entri identik yang berurutan (scene, pembicara, teks)
 * digabung — terjadi kalau beat yang sama ditampilkan ulang, mis. setelah
 * "Ulangi chapter" tanpa membersihkan log.
 */
export function tambahEntriDialog(
  daftar: EntriDialog[],
  entri: EntriDialog,
): EntriDialog[] {
  const terakhir = daftar.at(-1);
  if (
    terakhir &&
    terakhir.name === entri.name &&
    terakhir.text === entri.text &&
    terakhir.sceneJudul === entri.sceneJudul
  ) {
    return daftar;
  }
  return [...daftar, entri];
}

/** Tambahkan entri jurnal; konsep yang sama diperbarui, bukan digandakan. */
export function tambahEntriKonsep(
  daftar: EntriKonsep[],
  entri: EntriKonsep,
): EntriKonsep[] {
  const ada = daftar.findIndex((e) => e.conceptTag === entri.conceptTag);
  if (ada === -1) return [...daftar, entri];
  const baru = [...daftar];
  baru[ada] = entri;
  return baru;
}

/** Kelompokkan entri per scene untuk tampilan buku catatan. */
export function kelompokkanPerScene(
  daftar: EntriDialog[],
): { sceneJudul: string | null; entri: EntriDialog[] }[] {
  const kelompok: { sceneJudul: string | null; entri: EntriDialog[] }[] = [];
  for (const entri of daftar) {
    const terakhir = kelompok.at(-1);
    if (terakhir && terakhir.sceneJudul === entri.sceneJudul) {
      terakhir.entri.push(entri);
      continue;
    }
    kelompok.push({ sceneJudul: entri.sceneJudul, entri: [entri] });
  }
  return kelompok;
}
