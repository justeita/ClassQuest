import { PENANDA } from "./layout";
import { TINGGI_KARAKTER } from "./world/karakter";
import type { WorldNpc } from "./world/types";

/**
 * Zona interaksi NPC (ADR 0008): pemain yang cukup dekat dengan NPC bisa
 * memicu deretan beat scene lewat `StoryRunner.interact()`.
 * Pencarian NPC berbasis jarak dari titik kaki — murni, tanpa fisika tambahan.
 *
 * Prompt "Space" tidak lagi digambar di canvas; modul ini hanya menghitung
 * posisinya. React (`InteractHint.tsx`) yang menggambar kotak teksnya supaya
 * tajam — lihat ADR 0007.
 */

/**
 * Jarak zona interaksi: 30 px dari titik kaki pemain ke titik kaki NPC.
 *
 * Dinaikkan dari 24 px supaya pemain tidak perlu menempel persis ke sprite
 * sebelum `Space` mau bekerja. Angkanya tetap di bawah satu lebar ubin
 * (16 px) dikali dua, jadi dua NPC berdekatan tidak saling rebutan zona —
 * yang diambil tetap yang terdekat.
 */
export const ZONA_RADIUS = 30;

/**
 * Jarak tambahan sebelum kotak `Space` hilang lagi.
 *
 * Tanpa histeresis, pemain yang berdiri tepat di batas 30 px membuat kotak
 * berkedip: satu frame di dalam zona, frame berikutnya di luar. Kotak baru
 * hilang setelah jaraknya melewati 38 px, jadi tampil-hilangnya tenang.
 */
export const ZONA_HISTERESIS = 8;

/** Teks prompt; tombol yang sama dipakai `GameScene` untuk memicu dialog. */
export const PROMPT_INTERAKSI = "Space";

/**
 * Jarak dasar kotak prompt dari ubun-ubun sprite karakter, dalam piksel.
 *
 * Sama dengan `MARKER_OFFSET_Y` di `GameScene` (24 px): dasar kotak `Space`
 * jadi sejajar dengan dasar kotak `!`, dan karena tingginya pun sama
 * (`PENANDA.kotak`) kedua kotak terbaca sebagai satu widget. Papan nama NPC
 * yang lebih pendek tetap di bawah keduanya, jadi tidak ada yang tertutup.
 */
export const JARAK_PROMPT = 24;

/**
 * Geser kotak sampai tepi kirinya menyentuh tepi kanan kotak `!`.
 *
 * Penanda quest digambar di tengah NPC selebar `PENANDA.kotak`, jadi tepi
 * kanannya `PENANDA.kotak / 2` di kanan titik kaki. Dengan geseran itu kotak
 * `Space` duduk **rapat** di samping penanda dan tidak lagi terpisah celah.
 * Pemberi quest: `!` tetap tampil dan kotak meluncur keluar darinya
 * (`animate-quest-slide-in`). NPC obrolan singkat: tidak ada penanda, jadi
 * kotak muncul sendiri sebagai pop-up (`animate-quest-pop`).
 */
export const GESER_PROMPT = PENANDA.kotak / 2;

export type PromptHint = {
  text: string;
  /** Koordinat sudut kiri-bawah kotak dalam piksel internal 640×360. */
  x: number;
  y: number;
};

/**
 * NPC terdekat yang berada di dalam zona; null kalau tidak ada.
 *
 * Yang diukur jarak antara **titik kaki** pemain dan titik kaki NPC, sama
 * seperti tabrakan, supaya pemain bisa berdiri di samping NPC yang tinggi
 * tanpa terasa "jauh".
 */
export function findNpcInZone(
  npcs: Pick<WorldNpc, "id" | "x" | "y">[],
  playerX: number,
  playerY: number,
  radius = ZONA_RADIUS,
): string | null {
  let terdekat: { id: string; jarak: number } | null = null;

  for (const npc of npcs) {
    const dx = npc.x - playerX;
    const dy = npc.y - playerY;
    const jarak = Math.hypot(dx, dy);
    if (jarak <= radius && (terdekat === null || jarak < terdekat.jarak)) {
      terdekat = { id: npc.id, jarak };
    }
  }

  return terdekat?.id ?? null;
}

/**
 * Posisi kotak prompt rapat di kanan penanda `!`, dalam koordinat internal.
 * Sprite dijangkar di titik kaki, jadi ubun-ubunnya `TINGGI_KARAKTER` px di
 * atas titik itu; kotak diletakkan sejajar dengan `!` dan digeser ke kanan
 * sampai tepinya menyentuh penanda quest.
 */
export function posisiPrompt(
  npcs: Pick<WorldNpc, "id" | "x" | "y">[],
  npcId: string,
): PromptHint | null {
  const npc = npcs.find((entry) => entry.id === npcId);
  if (!npc) return null;

  return {
    text: PROMPT_INTERAKSI,
    x: npc.x + GESER_PROMPT,
    y: npc.y - TINGGI_KARAKTER - JARAK_PROMPT,
  };
}
