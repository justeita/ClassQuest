/**
 * Pengacak urutan berbasis benih tetap.
 *
 * Dipakai untuk menampilkan soal tanpa membocorkan urutan aslinya:
 * - `multiple_choice`: opsi diacak supaya jawaban benar tidak selalu di depan
 *   (cerita hasil AI dan cerita cadangan memang menaruh `opt_a` lebih dulu).
 * - `ordering`: item diacak supaya urutan awal bukan urutan benar
 *   (docs/02-data-model/challenge-types.md).
 *
 * Benih berasal dari `challenge.id`, jadi soal yang sama selalu tampil dalam
 * urutan yang sama: render ulang, buka-tutup overlay, dan soal ulang setelah
 * jawaban salah tidak menggeser posisi pilihan. Tanpa sifat ini, posisi yang
 * sudah dihafal siswa berubah-ubah dan pengacakan justru menyulitkan.
 */

/**
 * Acak berbasis benih tetap: daftar yang sama dengan benih yang sama selalu
 * menghasilkan urutan yang sama.
 */
export function acakDeterministik(ids: string[], seed: string): string[] {
  let state = 2166136261;
  for (const karakter of seed) {
    state ^= karakter.codePointAt(0) ?? 0;
    state = Math.imul(state, 16777619) >>> 0;
  }

  const hasil = [...ids];
  for (let i = hasil.length - 1; i > 0; i -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [hasil[i], hasil[j]] = [hasil[j]!, hasil[i]!];
  }
  return hasil;
}

/**
 * Acak daftar opsi tanpa memutus pasangan `id`–`text`.
 *
 * Id tetap ikut terkirim karena penilaian membandingkan `selectedId` dengan
 * `correctOptionId`, bukan posisi.
 */
export function acakOpsi<T extends { id: string }>(
  opsi: readonly T[],
  seed: string,
): T[] {
  const urutan = acakDeterministik(
    opsi.map((item) => item.id),
    seed,
  );
  const byId = new Map(opsi.map((item) => [item.id, item]));
  return urutan.map((id) => byId.get(id)!);
}
