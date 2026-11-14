import { describe, expect, it } from "vitest";

import { batasiStik, DEADZONE_STIK, arahDariStik } from "@/game/arahSentuh";

/**
 * Joystick layar sentuh harus menghasilkan **delapan arah** yang sama dengan
 * `ArahGerak` papan tombol — bukan vektor bebas. Kalau konversinya meleset,
 * gerak sentuh dan gerak keyboard akan memakai aturan yang berbeda dan animasi
 * karakter pecah. Tiap kasus di bawah mewakili satu sektor.
 */
describe("arahDariStik", () => {
  it("mengabaikan pergeseran di dalam deadzone", () => {
    expect(arahDariStik(0, 0)).toBeNull();
    expect(arahDariStik(0.1, 0)).toBeNull();
    expect(arahDariStik(0, -0.2)).toBeNull();
    expect(arahDariStik(0.2, 0.2)).toBeNull();
  });

  it("memetakan empat arah utama", () => {
    expect(arahDariStik(1, 0)).toBe("right");
    expect(arahDariStik(-1, 0)).toBe("left");
    expect(arahDariStik(0, 1)).toBe("down");
    expect(arahDariStik(0, -1)).toBe("up");
  });

  it("memetakan empat arah diagonal", () => {
    expect(arahDariStik(1, 1)).toBe("down-right");
    expect(arahDariStik(-1, 1)).toBe("down-left");
    expect(arahDariStik(1, -1)).toBe("up-right");
    expect(arahDariStik(-1, -1)).toBe("up-left");
  });

  it("tidak peduli panjang tongkat, hanya arahnya", () => {
    expect(arahDariStik(10, 0)).toBe("right");
    expect(arahDariStik(0.1, 5)).toBe("down");
    expect(arahDariStik(0.4, 0.4)).toBe("down-right");
  });

  it("memakai deadzone yang diberikan", () => {
    expect(arahDariStik(0.3, 0, DEADZONE_STIK)).toBeNull();
    expect(arahDariStik(0.3, 0, 0.2)).toBe("right");
  });
});

describe("batasiStik", () => {
  it("membiarkan pergeseran di dalam radius apa adanya", () => {
    expect(batasiStik(10, 20, 52)).toEqual({ x: 10, y: 20 });
  });

  it("menjepit panjang ke radius sambil mempertahankan arah", () => {
    const { x, y } = batasiStik(0, 200, 52);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(52);
    expect(Math.hypot(x, y)).toBeCloseTo(52);
  });
});
