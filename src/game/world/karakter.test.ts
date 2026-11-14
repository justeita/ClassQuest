import { describe, expect, it } from "vitest";

import {
  ARAH_DARI_BARIS,
  FRAME_ARAH,
  FPS_IDLE,
  FPS_WALK,
  TINGGI_KARAKTER,
  arahKe,
  indeksFrameAnimasi,
  kunciAnimasi,
  ukuranKarakter,
  type ArahGerak,
} from "./karakter";

/**
 * Kontrak arah dan animasi karakter. Urutan arah di sini harus sama dengan
 * urutan baris yang ditulis `scripts/import-characters.mjs`, karena `face` di
 * `village.json` dan animasi Phaser menunjuk baris yang sama.
 */

describe("urutan arah", () => {
  it("FRAME_ARAH dan ARAH_DARI_BARIS saling berkebalikan", () => {
    ARAH_DARI_BARIS.forEach((arah, baris) => {
      expect(FRAME_ARAH[arah]).toBe(baris);
    });
    expect(ARAH_DARI_BARIS).toHaveLength(8);
  });

  it("memulai dari selatan lalu searah jarum jam", () => {
    expect(ARAH_DARI_BARIS).toEqual([
      "down",
      "down-right",
      "right",
      "up-right",
      "up",
      "up-left",
      "left",
      "down-left",
    ]);
  });
});

describe("arahKe", () => {
  it("memetakan delapan penjuru persis ke delapan arah", () => {
    const persis: Array<[number, number, ArahGerak]> = [
      [0, 1, "down"],
      [1, 1, "down-right"],
      [1, 0, "right"],
      [1, -1, "up-right"],
      [0, -1, "up"],
      [-1, -1, "up-left"],
      [-1, 0, "left"],
      [-1, 1, "down-left"],
    ];
    for (const [dx, dy, arah] of persis) {
      expect(arahKe(dx, dy)).toBe(arah);
    }
  });

  it("MC di selatan NPC berarti NPC menghadap selatan", () => {
    // NPC di titik asal, pemain di bawahnya (y layar bertambah ke bawah).
    expect(arahKe(0, 120)).toBe("down");
  });

  it("memilih oktan terdekat untuk arah yang tidak persis", () => {
    expect(arahKe(1, 2)).toBe("down-right");
    expect(arahKe(-3, 1)).toBe("left");
  });

  it("tanpa perpindahan tetap menghadap depan", () => {
    expect(arahKe(0, 0)).toBe("down");
  });
});

describe("ukuranKarakter", () => {
  it("selalu setinggi karakter desa, lebarnya ikut rasio frame", () => {
    expect(ukuranKarakter(40, 60)).toEqual({
      width: (40 * TINGGI_KARAKTER) / 60,
      height: TINGGI_KARAKTER,
    });
    expect(ukuranKarakter(24, 32).height).toBe(TINGGI_KARAKTER);
  });
});

describe("animasi", () => {
  const frames = { idleFrames: 4, walkFrames: 8 };

  it("kunci animasi unik per karakter, jenis, dan arah", () => {
    expect(kunciAnimasi("char_mc", "idle", "down")).toBe("char_mc:idle:down");
    expect(kunciAnimasi("char_mc", "walk", "up")).toBe("char_mc:walk:up");
    expect(kunciAnimasi("char_npc_1", "idle", "down")).not.toBe(
      kunciAnimasi("char_mc", "idle", "down"),
    );
  });

  it("idle mulai di kolom nol dan walk setelah idle", () => {
    const kolom = frames.idleFrames + frames.walkFrames;
    expect(indeksFrameAnimasi(frames, "idle", "down")).toBe(0);
    expect(indeksFrameAnimasi(frames, "walk", "down")).toBe(frames.idleFrames);
    expect(indeksFrameAnimasi(frames, "idle", "up")).toBe(4 * kolom);
    expect(indeksFrameAnimasi(frames, "walk", "up")).toBe(4 * kolom + 4);
  });

  it("karakter tanpa walk tetap punya indeks idle yang sah", () => {
    const npc = { idleFrames: 8, walkFrames: 0 };
    expect(indeksFrameAnimasi(npc, "idle", "left")).toBe(6 * 8);
  });

  it("kecepatan idle lebih lambat daripada walk", () => {
    expect(FPS_IDLE).toBeLessThan(FPS_WALK);
  });
});
