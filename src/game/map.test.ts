import { describe, expect, it } from "vitest";

import { DEMO_STORY } from "@/game/demoStory";
import { buildRoomMap, roomForScene } from "./map";
import { listRoomAssets, resolveRoomData } from "./maps/roomData";
import { TILE_SIZE } from "./maps/types";

describe("resolveRoomData", () => {
  it("lorong sekolah memakai map khusus", () => {
    const room = resolveRoomData("sc_01_01");
    expect(room.roomId).toBe("lorong_sekolah");
    expect(room.floorTile).toBe("tile_floor_corridor");
    expect(room.widthTiles).toBe(60);
    expect(room.heightTiles).toBe(24);
  });

  it("scene kelas memakai kelas A", () => {
    const room = resolveRoomData("sc_01_02");
    expect(room.roomId).toBe("kelas_a");
    expect(room.floorTile).toBe("tile_floor_wood");
  });

  it("scene lain di kelas memakai ruangan yang sama", () => {
    for (const sceneId of ["sc_01_02", "sc_01_03"]) {
      expect(resolveRoomData(sceneId).roomId).toBe("kelas_a");
    }
  });

  it("halaman sekolah memakai map khusus", () => {
    const room = resolveRoomData("sc_03_03");
    expect(room.roomId).toBe("halaman_sekolah");
    expect(room.floorTile).toBe("tile_floor_grass");
    expect(room.widthTiles).toBe(56);
    expect(room.heightTiles).toBe(34);
  });

  it("scene halaman lain memakai ruangan yang sama", () => {
    for (const sceneId of [
      "sc_02_01",
      "sc_02_02",
      "sc_02_03",
      "sc_03_01",
      "sc_03_02",
      "sc_03_03",
    ]) {
      expect(resolveRoomData(sceneId).roomId).toBe("halaman_sekolah");
    }
  });

  it("scene tanpa map khusus jatuh ke template default", () => {
    const room = resolveRoomData("sc_09_09");
    expect(room.roomId).toBe("default");
  });

  it("tanpa sceneId tetap memberi template default", () => {
    expect(resolveRoomData(null).roomId).toBe("default");
    expect(resolveRoomData(undefined).roomId).toBe("default");
  });
});

describe("buildRoomMap", () => {
  it("mengonversi tile ke piksel", () => {
    const data = resolveRoomData("sc_01_02");
    const room = buildRoomMap(data, DEMO_STORY);

    expect(room.width).toBe(data.widthTiles * TILE_SIZE);
    expect(room.height).toBe(data.heightTiles * TILE_SIZE);
    expect(room.spawn.x).toBe(data.spawnTile.x * TILE_SIZE + TILE_SIZE / 2);
    expect(room.spawn.y).toBe((data.spawnTile.y + 1) * TILE_SIZE);
  });

  it("semua objek solid menjadi collider, termasuk NPC", () => {
    const data = resolveRoomData("sc_01_02");
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
    const data = resolveRoomData("sc_01_02");
    const room = buildRoomMap(data, DEMO_STORY);
    const prop = data.objects.find((o) => o.kind === "prop")!;
    const wall = data.objects.find((o) => o.kind === "wall")!;

    const propRect = room.solids.find(
      (r) => r.x === prop.tileX * TILE_SIZE && r.y === prop.tileY * TILE_SIZE,
    )!;
    expect(propRect.height).toBe(prop.tileH * TILE_SIZE - 2);

    const wallRect = room.solids.find(
      (r) => r.x === wall.tileX * TILE_SIZE && r.y === wall.tileY * TILE_SIZE,
    )!;
    expect(wallRect.height).toBe(wall.tileH * TILE_SIZE);
  });

  it("prop besar memakai sub-collider batang, bukan seluruh kanopi", () => {
    const data = resolveRoomData("sc_03_03");
    const room = buildRoomMap(data, DEMO_STORY);
    const tree = data.objects.find((o) => o.id === "prop_tree_large")!;
    const area = tree.collider!;

    const batang = room.solids.find(
      (r) =>
        r.x === (tree.tileX + area.x) * TILE_SIZE &&
        r.y === (tree.tileY + area.y) * TILE_SIZE,
    )!;
    expect(batang.width).toBe(area.w * TILE_SIZE);
    expect(batang.height).toBe(area.h * TILE_SIZE);
    // Kanopi 128×128 px tidak boleh menjadi collider penuh.
    expect(batang.width).toBeLessThan(tree.tileW * TILE_SIZE);
    expect(batang.height).toBeLessThan(tree.tileH * TILE_SIZE);
  });

  it("sub-collider selalu berada di dalam kotak objeknya", () => {
    for (const sceneId of ["sc_01_01", "sc_01_02", "sc_03_03"]) {
      for (const object of resolveRoomData(sceneId).objects) {
        if (!object.collider) continue;
        expect(object.collider.x).toBeGreaterThanOrEqual(0);
        expect(object.collider.y).toBeGreaterThanOrEqual(0);
        expect(object.collider.x + object.collider.w).toBeLessThanOrEqual(
          object.tileW,
        );
        expect(object.collider.y + object.collider.h).toBeLessThanOrEqual(
          object.tileH,
        );
      }
    }
  });

  it("NPC diambil dari cast; id tak dikenal diganti fallback cast", () => {
    const data = resolveRoomData("sc_01_02");
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
  it("memakai ukuran dan lantai ruangan masing-masing", () => {
    const lorong = roomForScene("sc_01_01", DEMO_STORY);
    const kelas = roomForScene("sc_01_02", DEMO_STORY);
    const halaman = roomForScene("sc_03_03", DEMO_STORY);

    expect(lorong.width).toBe(60 * TILE_SIZE);
    expect(lorong.height).toBe(24 * TILE_SIZE);
    expect(kelas.width).toBe(48 * TILE_SIZE);
    expect(kelas.height).toBe(28 * TILE_SIZE);
    expect(halaman.width).toBe(56 * TILE_SIZE);
    expect(halaman.height).toBe(34 * TILE_SIZE);

    expect(lorong.floorTile).toBe("tile_floor_corridor");
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

  it("memuat prop impor yang dipakai ruangan baru", () => {
    const { props } = listRoomAssets();
    for (const id of [
      "prop_tree_large",
      "prop_pond",
      "prop_shelf",
      "prop_door",
    ]) {
      expect(props).toContain(id);
    }
  });
});
