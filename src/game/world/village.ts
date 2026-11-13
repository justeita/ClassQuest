/**
 * Dunia desa — satu peta untuk seluruh cerita.
 *
 * Dibangkitkan oleh `scripts/import-world.mjs`; jangan disunting tangan.
 * Perpindahan chapter **tidak** mengganti peta atau membangun ulang dunia:
 * pemain tetap berdiri di tempatnya, hanya scene cerita yang berganti.
 */

import villageJson from "./village.json";
import type { WorldData } from "./types";

export const VILLAGE: WorldData = villageJson as WorldData;

/** Titik kaki pemain saat chapter dimulai ulang. */
export const SPAWN_PEMAIN = VILLAGE.player;
