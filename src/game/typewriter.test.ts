import { describe, expect, it } from "vitest";

import { Typewriter } from "./typewriter";

describe("Typewriter", () => {
  it("mulai kosong lalu mengungkap teks sesuai waktu", () => {
    const tw = new Typewriter("halo dunia");

    expect(tw.current()).toBe("");
    expect(tw.isDone()).toBe(false);

    tw.tick(500); // 35 kar/detik × 0,5 detik = 17,5 → teks pendek langsung habis
    expect(tw.current()).toBe("halo dunia");
    expect(tw.isDone()).toBe(true);
  });

  it("mengungkap sebagian teks untuk kalimat panjang", () => {
    const text = "a".repeat(350);
    const tw = new Typewriter(text);

    tw.tick(1000);
    expect(tw.current()).toBe("a".repeat(35));
    expect(tw.isDone()).toBe(false);

    tw.tick(1000);
    expect(tw.current()).toBe("a".repeat(70));
  });

  it("tidak mengungkap lebih banyak dari panjang teks", () => {
    const tw = new Typewriter("pendek");

    tw.tick(60000);
    expect(tw.current()).toBe("pendek");
    expect(tw.isDone()).toBe(true);
  });

  it("tick negatif atau nol tidak mengubah apa pun", () => {
    const tw = new Typewriter("teks");

    tw.tick(-100);
    expect(tw.current()).toBe("");

    tw.tick(0);
    expect(tw.current()).toBe("");
  });

  it("tick setelah selesai adalah no-op", () => {
    const tw = new Typewriter("teks");

    tw.tick(60000);
    tw.tick(60000);
    expect(tw.current()).toBe("teks");
    expect(tw.isDone()).toBe(true);
  });

  it("finish langsung menampilkan seluruh teks", () => {
    const text = "b".repeat(200);
    const tw = new Typewriter(text);

    tw.tick(100); // baru sebagian
    tw.finish();
    expect(tw.current()).toBe(text);
    expect(tw.isDone()).toBe(true);
  });

  it("teks kosong langsung dianggap selesai", () => {
    const tw = new Typewriter("");

    expect(tw.isDone()).toBe(true);
    expect(tw.current()).toBe("");
  });

  it("kecepatan bisa disetel di rentang 30–40 karakter per detik", () => {
    const tw = new Typewriter("c".repeat(100), 30);

    tw.tick(1000);
    expect(tw.current()).toBe("c".repeat(30));
  });

  it("kecepatan nol atau negatif ditolak", () => {
    expect(() => new Typewriter("teks", 0)).toThrow(
      "Kecepatan ketik harus positif.",
    );
    expect(() => new Typewriter("teks", -5)).toThrow(
      "Kecepatan ketik harus positif.",
    );
  });
});
