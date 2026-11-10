import { describe, expect, it } from "vitest";

import { DEMO_STORY } from "@/game/demoStory";
import { buildRoomMap, roomForScene } from "./map";
import { listRoomAssets, resolveRoomData } from "./maps/roomData";
import { TILE_SIZE } from "./maps/types";

describe("resolveRoomData", () => {
  it("scene kelas memakai map khusus", () => {
    const room = resolveRoomData("sc_01_01");
    expect(room.sceneId).toBe("sc_01_01");
    expect(room.floorTile).toBe("tile_floor_wood");
  });

  it("scene tanpa map khusus jatuh ke template default", () => {
    const room = resolveRoomData("sc_02_01");
    expect(room.sceneId).toBe("default");
  });

  it("tanpa sceneId tetap memberi template default", () => {
    expect(resolveRoomData(null).sceneId).toBe("default");
    expect(resolveRoomData(undefined).sceneId).toBe("default");
  });
});

describe("buildRoomMap", () => {
  it("mengonversi tile ke piksel", () => {
    const data = resolveRoomData("sc_01_01");
    const room = buildRoomMap(data, DEMO_STORY);

    expect(room.width).toBe(data.widthTiles * TILE_SIZE);
    expect(room.height).toBe(data.heightTiles * TILE_SIZE);
    expect(room.spawn.x).toBe(data.spawnTile.x * TILE_SIZE + TILE_SIZE / 2);
    expect(room.spawn.y).toBe((data.spawnTile.y + 1) * TILE_SIZE);
  });

  it("semua objek solid menjadi collider, termasuk NPC", () => {
    const data = resolveRoomData("sc_01_01");
    const room = buildRoomMap(data, DEMO_STORY);

    const solidObjects = data.objects.filter(
      (o) => o.kind === "wall" || o.solid,
    );
    expect(room.solids).toHaveLength(solidObjects.length);
    // Semua collider berada di dalam ruangan.
    for (const solid of room.solids) {
      expect(solid.x).toBeGreaterThanOrEqual(0);
      expect(solid.x + solid.width).toBeLessThanOrEqual(room.width);
      expect(solid.y).toBeGreaterThanOrEqual(0);
      expect(solid.y + solid.height).toBeLessThanOrEqual(room.height);
    }
  });

  it("collider prop diinset 2 px di sisi depan, dinding tidak", () => {
    const room = buildRoomMap(resolveRoomData("sc_01_01"), DEMO_STORY);
    const data = resolveRoomData("sc_01_01");
    const desk = data.objects.find((o) => o.kind === "prop")!;
    const wall = data.objects.find((o) => o.kind === "wall")!;

    const deskRect = room.solids.find(
      (r) => r.x === desk.tileX * TILE_SIZE && r.y === desk.tileY * TILE_SIZE,
    )!;
    expect(deskRect.height).toBe(desk.tileH * TILE_SIZE - 2);

    const wallRect = room.solids.find(
      (r) => r.x === wall.tileX * TILE_SIZE && r.y === wall.tileY * TILE_SIZE,
    )!;
    expect(wallRect.height).toBe(wall.tileH * TILE_SIZE);
  });

  it("NPC diambil dari cast; id tak dikenal diganti fallback cast", () => {
    const data = resolveRoomData("sc_01_01");
    const room = buildRoomMap(data, DEMO_STORY);

    const castIds = new Set(DEMO_STORY.cast.map((member) => member.id));
    for (const npc of room.npcs) {
      expect(castIds.has(npc.id)).toBe(true);
    }

    const patched = {
      ...data,
      objects: data.objects.map((o) =>
        o.kind === "npc" ? { ...o, id: "char_tidak_ada" } : o,
      ),
    };
    const roomPalsu = buildRoomMap(patched, DEMO_STORY);
    const pemain = DEMO_STORY.cast.find((m) => m.role === "player")?.id;
    const cadangan = DEMO_STORY.cast.find((m) => m.id !== pemain)!.id;
    for (const npc of roomPalsu.npcs) {
      expect(npc.id).toBe(cadangan);
    }
  });
});

describe("roomForScene", () => {
  it("memesan ukuran ruangan yang sama untuk scene berbeda", () => {
    const kelas = roomForScene("sc_01_01", DEMO_STORY);
    const halaman = roomForScene("sc_03_03", DEMO_STORY);
    expect(kelas.width).toBe(halaman.width);
    expect(kelas.floorTile).toBe("tile_floor_wood");
    expect(halaman.floorTile).toBe("tile_floor_grass");
  });
});

describe("listRoomAssets", () => {
  it("hanya memuat id tile dan prop dari manifest", () => {
    const { tiles, props } = listRoomAssets();
    expect(tiles.length).toBeGreaterThan(0);
    expect(props.length).toBeGreaterThan(0);
    for (const id of [...tiles, ...props]) {
      expect(id).toMatch(/^(tile|prop)_/);
    }
  });
});
