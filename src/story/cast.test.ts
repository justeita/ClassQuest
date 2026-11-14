import { describe, expect, it } from "vitest";

import { VILLAGE } from "../game/world/village";
import {
  CAST_EXPERTISE,
  CAST_PLACES,
  CAST_TRAITS,
  CAST_VOICE,
  FIXED_CAST,
  isKnownPlace,
  locationOf,
  MENTOR_ID,
  PLAYER_ID,
} from "./cast";

/**
 * Data prompt harus menutup seluruh cast tetap.
 *
 * `CAST_EXPERTISE`, `CAST_TRAITS`, `CAST_VOICE`, dan `CAST_PLACES` bukan bagian
 * schema cerita, jadi tidak ada validator yang menegur kalau satu tokoh
 * terlewat. Test ini yang menjaga: setiap tokoh tetap punya keahlian, sifat,
 * cara bicara, dan tepat satu lokasi, dan setiap NPC yang benar-benar dipasang
 * di peta (`village.json`) punya lokasi di blok prompt. Kalau tidak, model bisa
 * mengarang tempat atau membuat semua tokoh terdengar sama.
 */

const castIds = FIXED_CAST.map((member) => member.id);

describe("data prompt cast", () => {
  it("setiap tokoh tetap punya keahlian", () => {
    for (const id of castIds) {
      expect(CAST_EXPERTISE[id], `${id} tanpa keahlian`).toBeTruthy();
    }
    expect(Object.keys(CAST_EXPERTISE).sort()).toEqual([...castIds].sort());
  });

  it("setiap tokoh tetap punya sifat dan cara bicara", () => {
    for (const id of castIds) {
      expect(CAST_TRAITS[id], `${id} tanpa sifat`).toBeTruthy();
      expect(CAST_VOICE[id], `${id} tanpa cara bicara`).toBeTruthy();
    }
    expect(Object.keys(CAST_TRAITS).sort()).toEqual([...castIds].sort());
    expect(Object.keys(CAST_VOICE).sort()).toEqual([...castIds].sort());
  });

  it("cara bicara tiap tokoh berbeda satu sama lain", () => {
    const suara = castIds.map((id) => CAST_VOICE[id]);
    expect(new Set(suara).size).toBe(suara.length);
  });

  it("setiap tokoh tetap punya tepat satu lokasi", () => {
    for (const id of castIds) {
      const tempat = CAST_PLACES.filter((place) => place.members.includes(id));
      expect(tempat, `${id} punya ${tempat.length} lokasi`).toHaveLength(1);
      expect(locationOf(id)).toBe(tempat[0]?.label);
    }
  });

  it("tidak ada lokasi untuk tokoh yang tidak ada di cast", () => {
    const penghuni = CAST_PLACES.flatMap((place) => place.members);
    for (const id of penghuni) {
      expect(castIds).toContain(id);
    }
  });

  it("id tempat unik dan tidak kosong", () => {
    const ids = CAST_PLACES.map((place) => place.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const place of CAST_PLACES) {
      expect(place.id.length).toBeGreaterThan(0);
      expect(place.label.length).toBeGreaterThan(0);
      expect(place.note.length).toBeGreaterThan(0);
      expect(place.members.length).toBeGreaterThan(0);
    }
  });

  it("setiap NPC di peta punya lokasi di prompt", () => {
    for (const npc of VILLAGE.npcs) {
      expect(locationOf(npc.id), `${npc.id} tidak punya lokasi`).toBeTruthy();
    }
  });

  it("pemain dan mentor tetap dikenali", () => {
    expect(locationOf(PLAYER_ID)).toBeTruthy();
    expect(locationOf(MENTOR_ID)).toBeTruthy();
  });

  it("isKnownPlace menerima label, singkatan, dan alias tempat desa", () => {
    for (const place of CAST_PLACES) {
      expect(isKnownPlace(place.label), place.label).toBe(true);
    }

    expect(isKnownPlace("kolam timur")).toBe(true);
    expect(isKnownPlace("jembatan kayu")).toBe(true);
    expect(isKnownPlace("kebun sayuran dekat sumur batu")).toBe(true);
  });

  it("isKnownPlace menolak ruangan di luar peta desa", () => {
    for (const asing of [
      "kelas",
      "di depan kelas",
      "halaman sekolah",
      "laboratorium",
      "koridor",
      "",
    ]) {
      expect(isKnownPlace(asing), asing).toBe(false);
    }
  });
});
