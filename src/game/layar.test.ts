import { describe, expect, it } from "vitest";

import { GAME_HEIGHT, GAME_WIDTH } from "./constants";
import { JANGKAUAN_PENUNJUK } from "./layout";
import {
  INSET_PENANDA,
  duniaKeLayar,
  posisiPenanda,
  posisiUiTerkunci,
  terlihatDiLayar,
  type InsetPenanda,
} from "./layar";

describe("duniaKeLayar", () => {
  it("kamera di titik nol tidak menggeser koordinat", () => {
    expect(duniaKeLayar({ scrollX: 0, scrollY: 0 }, 120, 80)).toEqual({
      x: 120,
      y: 80,
    });
  });

  it("mengurangi koordinat dunia dengan scroll kamera", () => {
    expect(duniaKeLayar({ scrollX: 64, scrollY: 32 }, 120, 80)).toEqual({
      x: 56,
      y: 48,
    });
  });

  it("memperhitungkan zoom kamera dari titik tengah layar", () => {
    // Zoom 0,5: titik tengah dunia tetap di tengah, titik lain mendekat.
    expect(
      duniaKeLayar(
        { scrollX: 0, scrollY: 0, zoom: 0.5, width: 640, height: 360 },
        320,
        180,
      ),
    ).toEqual({ x: 320, y: 180 });
    expect(
      duniaKeLayar(
        { scrollX: 0, scrollY: 0, zoom: 0.5, width: 640, height: 360 },
        640,
        360,
      ),
    ).toEqual({ x: 480, y: 270 });
  });

  it("memakai resolusi internal saat kamera tidak menyebut ukurannya", () => {
    expect(duniaKeLayar({ scrollX: 0, scrollY: 0, zoom: 0.5 }, 0, 0)).toEqual({
      x: GAME_WIDTH / 4,
      y: GAME_HEIGHT / 4,
    });
  });
});

describe("posisiUiTerkunci", () => {
  it("tidak menggeser apa pun saat zoom 1:1", () => {
    expect(posisiUiTerkunci(640, 360, 1)).toEqual({ x: 0, y: 0, skala: 1 });
  });

  it("mengembalikan anak ke koordinat layar asalnya walau kamera di-zoom", () => {
    const ui = posisiUiTerkunci(640, 360, 0.8);
    const zoom = 0.8;

    // Anak ber-koordinat lokal `c` harus jatuh kembali di `c` pada layar.
    for (const c of [0, 16, 320, 624, 640]) {
      const layar = zoom * (ui.x + ui.skala * c) + 320 * (1 - zoom);
      expect(layar).toBeCloseTo(c, 6);
    }
  });
});

describe("terlihatDiLayar", () => {
  it("menganggap titik di dalam bidang layar sebagai terlihat", () => {
    expect(terlihatDiLayar({ x: 0, y: 0 })).toBe(true);
    expect(terlihatDiLayar({ x: GAME_WIDTH, y: GAME_HEIGHT })).toBe(true);
  });

  it("menyembunyikan titik yang sudah melewati tepi layar", () => {
    expect(terlihatDiLayar({ x: -1, y: 100 })).toBe(false);
    expect(terlihatDiLayar({ x: GAME_WIDTH + 1, y: 100 })).toBe(false);
    expect(terlihatDiLayar({ x: 100, y: -1 })).toBe(false);
    expect(terlihatDiLayar({ x: 100, y: GAME_HEIGHT + 1 })).toBe(false);
  });
});

describe("posisiPenanda", () => {
  it("membiarkan penanda menempel pada NPC selama masih terlihat", () => {
    expect(posisiPenanda({ x: 320, y: 120 })).toEqual({
      x: 320,
      y: 120,
      tepi: false,
      sudut: 0,
    });
  });

  it("menjepit penanda ke tepi kiri dan menunjuk ke kiri", () => {
    expect(posisiPenanda({ x: -120, y: 150 })).toEqual({
      x: INSET_PENANDA.kiri,
      y: 150,
      tepi: true,
      sudut: 180,
    });
  });

  it("menjepit ke sudut kanan-bawah dan menunjuk diagonal", () => {
    const posisi = posisiPenanda({ x: 700, y: 400 });

    expect(posisi.x).toBe(GAME_WIDTH - INSET_PENANDA.kanan);
    expect(posisi.y).toBe(GAME_HEIGHT - INSET_PENANDA.bawah);
    expect(posisi.tepi).toBe(true);
    // NPC di kanan-bawah → penunjuk menghadap kanan-bawah.
    expect(posisi.sudut).toBeGreaterThan(0);
    expect(posisi.sudut).toBeLessThan(90);
  });

  it("menjepit ke tepi atas dan menunjuk ke atas", () => {
    const posisi = posisiPenanda({ x: 320, y: -40 });

    expect(posisi.x).toBe(320);
    expect(posisi.y).toBe(INSET_PENANDA.atas);
    expect(posisi.tepi).toBe(true);
    // NPC di atas layar → penunjuk menghadap ke atas.
    expect(posisi.sudut).toBe(-90);
  });

  it("mengikuti lebar kamera internal yang adaptif", () => {
    const posisi = posisiPenanda({ x: 900, y: 180 }, 780, GAME_HEIGHT);

    expect(posisi.x).toBe(780 - INSET_PENANDA.kanan);
    expect(posisi.y).toBe(180);
    expect(posisi.tepi).toBe(true);
    expect(posisi.sudut).toBe(0);
  });

  it("menerima jarak aman khusus tanpa mengubah perilaku jepitan", () => {
    const inset: InsetPenanda = { atas: 10, kanan: 10, bawah: 10, kiri: 10 };

    expect(posisiPenanda({ x: -5, y: 50 }, 640, 360, inset)).toEqual({
      x: 10,
      y: 50,
      tepi: true,
      sudut: 180,
    });
  });

  it("tidak membalik area aman di layar yang sangat kecil", () => {
    const posisi = posisiPenanda({ x: 5, y: 5 }, 20, 20);

    expect(posisi.tepi).toBe(true);
    expect(posisi.x).toBeGreaterThanOrEqual(0);
    expect(posisi.y).toBeGreaterThanOrEqual(0);
  });
});

describe("INSET_PENANDA", () => {
  it("menyisakan ruang penuh untuk penunjuk beacon di keempat sisi", () => {
    // Penunjuk arah beacon menjulur keluar dari pusat kotak; kalau tepi lebih
    // dekat dari jangkauannya, penunjuk terpotong dan beacon tidak terbaca.
    for (const sisi of [
      INSET_PENANDA.atas,
      INSET_PENANDA.kanan,
      INSET_PENANDA.bawah,
      INSET_PENANDA.kiri,
    ]) {
      expect(sisi).toBeGreaterThan(JANGKAUAN_PENUNJUK);
    }

    // Sama di semua sisi: penunjuk tidak lagi terpotong di kiri/kanan/bawah.
    expect(INSET_PENANDA.kanan).toBe(INSET_PENANDA.kiri);
    expect(INSET_PENANDA.bawah).toBe(INSET_PENANDA.kanan);
    expect(INSET_PENANDA.atas).toBe(INSET_PENANDA.kanan);
    expect(INSET_PENANDA.kanan).toBe(24);
  });

  it("menjepit beacon jauh dari tepi sehingga penunjuknya utuh di layar", () => {
    // NPC jauh di kanan-bawah: penunjuk menghadap keluar, ujungnya tetap di
    // dalam kanvas 640×360.
    const posisi = posisiPenanda({ x: 5000, y: 5000 }, 640, 360);

    expect(posisi.x + JANGKAUAN_PENUNJUK).toBeLessThanOrEqual(640);
    expect(posisi.y + JANGKAUAN_PENUNJUK).toBeLessThanOrEqual(360);
    expect(5000 - posisi.x).toBeGreaterThan(0);
  });
});
