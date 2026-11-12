import { describe, expect, it } from "vitest";

import {
  academicYearHint,
  academicYearOptions,
  academicYearStart,
  currentAcademicYear,
  MAX_ACADEMIC_YEAR,
  MIN_ACADEMIC_YEAR,
  normalizeAcademicYear,
  YEAR_PICKER_SPAN,
} from "./academic-year";

/**
 * Tes aturan tahun ajaran. Fungsi ini dipakai dua sisi: picker di browser dan
 * validasi di server, jadi semua nilai yang "hampir benar" harus tegas ditolak
 * — bukan dipotong atau diperbaiki diam-diam.
 */

describe("normalizeAcademicYear", () => {
  it("menerima bentuk baku", () => {
    expect(normalizeAcademicYear("2026/2027")).toBe("2026/2027");
    expect(normalizeAcademicYear("2000/2001")).toBe("2000/2001");
    expect(
      normalizeAcademicYear(`${MAX_ACADEMIC_YEAR}/${MAX_ACADEMIC_YEAR + 1}`),
    ).toBe(`${MAX_ACADEMIC_YEAR}/${MAX_ACADEMIC_YEAR + 1}`);
  });

  it("menolak karakter aneh dan spasi", () => {
    const ditolak = [
      "",
      " ",
      "2026/2027 ",
      " 2026/2027",
      "2026 / 2027",
      "2026/2027\t",
      "2026/2027\n",
      "2026\u200b/2027",
      "2026/2027\u0000",
      "2026\u0000/2027",
      "2026/2027<script>",
      "<script>alert(1)</script>",
      "2026\\/2027",
      "２０２６/２０２７",
      "٢٠٢٦/٢٠٢٧",
      "2026/2027/",
      "2026//2027",
    ];

    for (const value of ditolak) {
      expect(normalizeAcademicYear(value), value).toBeNull();
    }
  });

  it("menolak bentuk yang mirip tapi bukan tahun ajaran", () => {
    expect(normalizeAcademicYear("2026-2027")).toBeNull();
    expect(normalizeAcademicYear("2026.2027")).toBeNull();
    expect(normalizeAcademicYear("26/27")).toBeNull();
    expect(normalizeAcademicYear("2026/2028")).toBeNull(); // bukan +1
    expect(normalizeAcademicYear("2027/2026")).toBeNull(); // terbalik
    expect(normalizeAcademicYear("1999/2000")).toBeNull(); // sebelum batas
    expect(normalizeAcademicYear("2099/2100")).not.toBeNull();
    expect(normalizeAcademicYear("2100/2101")).toBeNull(); // setelah batas
  });

  it("menolak nilai bukan string", () => {
    expect(normalizeAcademicYear(null)).toBeNull();
    expect(normalizeAcademicYear(undefined)).toBeNull();
    expect(normalizeAcademicYear(2026)).toBeNull();
    expect(normalizeAcademicYear({ year: "2026/2027" })).toBeNull();
    expect(normalizeAcademicYear(["2026/2027"])).toBeNull();
  });
});

describe("currentAcademicYear", () => {
  it("memakai Juli sebagai awal tahun ajaran", () => {
    expect(currentAcademicYear(new Date("2026-06-30T23:59:59Z"))).toBe(
      "2025/2026",
    );
    expect(currentAcademicYear(new Date("2026-07-01T00:00:00Z"))).toBe(
      "2026/2027",
    );
    expect(currentAcademicYear(new Date("2026-11-12T00:00:00Z"))).toBe(
      "2026/2027",
    );
    expect(currentAcademicYear(new Date("2027-01-05T00:00:00Z"))).toBe(
      "2026/2027",
    );
  });
});

describe("academicYearOptions", () => {
  it("memuat tahun berjalan dan beberapa tahun ke depan", () => {
    const options = academicYearOptions(new Date("2026-11-12T00:00:00Z"));

    expect(options).toContain("2026/2027");
    expect(options).toContain(
      `${2026 + YEAR_PICKER_SPAN}/${2026 + YEAR_PICKER_SPAN + 1}`,
    );
    expect(options).toContain("2023/2024");
    expect(options.at(-1)).toBe(
      `${2026 + YEAR_PICKER_SPAN}/${2026 + YEAR_PICKER_SPAN + 1}`,
    );
  });

  it("semua pilihannya lolos validasi server", () => {
    for (const option of academicYearOptions(
      new Date("2026-11-12T00:00:00Z"),
    )) {
      expect(normalizeAcademicYear(option)).toBe(option);
    }
  });

  it("tidak pernah keluar dari batas tahun", () => {
    const options = academicYearOptions(new Date("2001-01-05T00:00:00Z"));
    expect(Number(options[0]?.slice(0, 4))).toBe(MIN_ACADEMIC_YEAR);
    expect(
      options.every((option) => normalizeAcademicYear(option) !== null),
    ).toBe(true);
  });
});

describe("academicYearStart / academicYearHint", () => {
  it("mengambil tahun pertama dan rentang bulannya", () => {
    expect(academicYearStart("2026/2027")).toBe(2026);
    expect(academicYearHint("2026/2027")).toBe("Jul 2026 – Jun 2027");
  });

  it("mengembalikan null untuk nilai tidak sah", () => {
    expect(academicYearStart("2026-2027")).toBeNull();
    expect(academicYearHint("abc")).toBeNull();
  });
});
