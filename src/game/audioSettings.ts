/**
 * Pengaturan audio pengguna (musik dan efek suara dipisah).
 *
 * Disimpan di `localStorage` dengan kunci `classquest:settings:v1`. Semua nilai
 * di-clamp ke 0–1; baca/tulis yang gagal (storage ditolak, JSON rusak) jatuh ke
 * nilai default tanpa menghentikan permainan — sesuai prinsip "satu error tidak
 * boleh menghentikan seluruh permainan" di docs/04-game/interaction-loop.md.
 *
 * Modul ini murni: storage disuntik dari luar supaya bisa dites di jsdom.
 */

export type PengaturanAudio = {
  /** Volume musik 0–1; 0 berarti musik mati. */
  music: number;
  /** Volume efek suara 0–1; 0 berarti SFX mati. */
  sfx: number;
};

export const KUNCI_PENGATURAN = "classquest:settings:v1";

export const PENGATURAN_DEFAULT: PengaturanAudio = { music: 1, sfx: 1 };

type Penyimpanan = Pick<Storage, "getItem" | "setItem">;

/** Batasi nilai ke 0–1; non-angka jatuh ke 1 (nilai default per kanal). */
export function clampVolume(nilai: unknown): number {
  if (typeof nilai !== "number" || Number.isNaN(nilai)) return 1;
  return Math.min(1, Math.max(0, nilai));
}

function valid(pengaturan: unknown): PengaturanAudio {
  if (typeof pengaturan !== "object" || pengaturan === null) {
    return PENGATURAN_DEFAULT;
  }
  const kandidat = pengaturan as Record<string, unknown>;
  if (typeof kandidat.music !== "number" || typeof kandidat.sfx !== "number") {
    return PENGATURAN_DEFAULT;
  }
  return {
    music: clampVolume(kandidat.music),
    sfx: clampVolume(kandidat.sfx),
  };
}

/** Baca pengaturan dari storage; gagal apa pun → default. */
export function bacaPengaturanAudio(
  storage?: Penyimpanan | null,
): PengaturanAudio {
  if (!storage) return PENGATURAN_DEFAULT;
  try {
    const mentah = storage.getItem(KUNCI_PENGATURAN);
    if (!mentah) return PENGATURAN_DEFAULT;
    return valid(JSON.parse(mentah));
  } catch {
    return PENGATURAN_DEFAULT;
  }
}

/** Simpan pengaturan; gagal diam-diam (storage penuh atau ditolak). */
export function simpanPengaturanAudio(
  pengaturan: PengaturanAudio,
  storage?: Penyimpanan | null,
): PengaturanAudio {
  const aman = valid(pengaturan);
  if (!storage) return aman;
  try {
    storage.setItem(KUNCI_PENGATURAN, JSON.stringify(aman));
  } catch {
    // Storage penuh/ditolak: lanjut tanpa simpan, beri tahu sekali (interaction-loop.md).
  }
  return aman;
}

/** Pengaturan dari persen (0–100) — dipakai slider di menu jeda. */
export function dariPersen(musik: number, sfx: number): PengaturanAudio {
  return { music: clampVolume(musik / 100), sfx: clampVolume(sfx / 100) };
}
