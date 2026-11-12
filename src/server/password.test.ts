// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  checkPassword,
  hashPassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  verifyPassword,
} from "./password";

describe("checkPassword", () => {
  it("menerima password dalam batas", () => {
    expect(checkPassword("a".repeat(MIN_PASSWORD_LENGTH))).toBeNull();
    expect(checkPassword("sandi-biasa-123")).toBeNull();
    expect(checkPassword("a".repeat(MAX_PASSWORD_LENGTH))).toBeNull();
  });

  it("menolak password terlalu pendek atau terlalu panjang", () => {
    expect(checkPassword("a".repeat(MIN_PASSWORD_LENGTH - 1))).toBe(
      "TOO_SHORT",
    );
    expect(checkPassword("a".repeat(MAX_PASSWORD_LENGTH + 1))).toBe("TOO_LONG");
  });
});

describe("hashPassword + verifyPassword", () => {
  it("membuat hash scrypt dengan format yang terdokumentasi", async () => {
    const hash = await hashPassword("sandi-uji-123");

    expect(hash).toMatch(
      /^scrypt\$\d+\$\d+\$\d+\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/,
    );
    expect(hash).not.toContain("sandi-uji-123");
  });

  it("dua hash untuk password sama berbeda karena salt acak", async () => {
    const [first, second] = await Promise.all([
      hashPassword("sandi-uji-123"),
      hashPassword("sandi-uji-123"),
    ]);

    expect(first).not.toBe(second);
    await expect(verifyPassword("sandi-uji-123", first)).resolves.toBe(true);
    await expect(verifyPassword("sandi-uji-123", second)).resolves.toBe(true);
  });

  it("menerima password benar dan menolak yang salah", async () => {
    const hash = await hashPassword("sandi-uji-123");

    await expect(verifyPassword("sandi-uji-123", hash)).resolves.toBe(true);
    await expect(verifyPassword("sandi-uji-124", hash)).resolves.toBe(false);
    await expect(verifyPassword("", hash)).resolves.toBe(false);
  });

  it("menolak hash rusak atau tidak dikenal tanpa melempar error", async () => {
    const broken = [
      "",
      "plaintext",
      "scrypt$16384$8$1$pendek$pendek",
      "bcrypt$16384$8$1$c2FsdA==$a2V5",
      "scrypt$bukan-angka$8$1$c2FsdA==$a2V5",
      "scrypt$16385$8$1$c2FsdA==$a2V5",
      "scrypt$16384$99$1$c2FsdA==$a2V5",
    ];

    for (const stored of broken) {
      await expect(verifyPassword("sandi-uji-123", stored)).resolves.toBe(
        false,
      );
    }
  });

  it("menolak password di luar batas walau hashnya sah", async () => {
    const hash = await hashPassword("sandi-uji-123");

    await expect(
      verifyPassword("a".repeat(MAX_PASSWORD_LENGTH + 1), hash),
    ).resolves.toBe(false);
  });
});
