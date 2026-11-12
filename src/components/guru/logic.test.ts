// @vitest-environment node

import { describe, expect, it } from "vitest";

import { MATERIALS, THEMES } from "./data";
import {
  EMPTY_FILTER,
  EMPTY_AI_STUDIO_DRAFT,
  buatKodeKelas,
  buildStructuredPrompt,
  filterMaterials,
  formatFileSize,
  parseAiStudioDraft,
  parseAiStudioSeed,
  validateJsonText,
} from "./logic";

/**
 * Logika Portal Guru masih dipakai halaman tampilan, jadi yang diuji di sini
 * hanya perilaku yang tampak ke pengguna: hasil penyaringan, teks prompt, dan
 * penguraian draf dari penyimpanan browser.
 */

describe("filterMaterials", () => {
  it("mengembalikan semua materi bila filter kosong", () => {
    expect(filterMaterials(MATERIALS, EMPTY_FILTER)).toHaveLength(
      MATERIALS.length,
    );
  });

  it("mencocokkan nama berkas tanpa peduli huruf besar/kecil", () => {
    const hasil = filterMaterials(MATERIALS, {
      ...EMPTY_FILTER,
      query: "  PYTHON ",
    });

    expect(hasil.map((item) => item.name)).toEqual([
      "Dasar_Algoritma_Python.pdf",
    ]);
  });

  it("mencocokkan deskripsi, bukan hanya nama berkas", () => {
    const hasil = filterMaterials(MATERIALS, {
      ...EMPTY_FILTER,
      query: "carnot",
    });

    expect(hasil).toHaveLength(1);
    expect(hasil[0]?.subject).toBe("Fisika");
  });

  it("menggabungkan filter mata pelajaran, kelas, dan format", () => {
    expect(
      filterMaterials(MATERIALS, {
        ...EMPTY_FILTER,
        subject: "Biologi",
        grade: "SMA Grade 10",
        format: "PDF",
      }).map((item) => item.name),
    ).toEqual(["Modul_Ekosistem_Karang.pdf"]);

    expect(
      filterMaterials(MATERIALS, {
        ...EMPTY_FILTER,
        subject: "Biologi",
        format: "DOCX",
      }),
    ).toEqual([]);
  });

  it("mengembalikan daftar kosong bila tidak ada yang cocok", () => {
    expect(
      filterMaterials(MATERIALS, { ...EMPTY_FILTER, query: "kalkulus" }),
    ).toEqual([]);
  });
});

describe("buildStructuredPrompt", () => {
  it("memakai isian form apa adanya", () => {
    const prompt = buildStructuredPrompt({
      subject: "Biologi",
      grade: "SMA Grade 10",
      objective: "Menganalisis ekosistem",
      theme: "pbl",
    });

    expect(prompt).toContain("- Bidang Studi: Biologi");
    expect(prompt).toContain("- Tingkat Pendidikan Target: SMA Grade 10");
    expect(prompt).toContain(`- Kerangka Pendekatan: ${THEMES.pbl.name}`);
    expect(prompt).toContain("- Capaian Pembelajaran: Menganalisis ekosistem");
  });

  it("mengganti isian kosong dengan penanda", () => {
    const prompt = buildStructuredPrompt({
      subject: "   ",
      grade: "",
      objective: "",
      theme: "case_study",
    });

    expect(prompt).toContain("[Mata Pelajaran]");
    expect(prompt).toContain("[Tingkat Pendidikan]");
    expect(prompt).toContain("[Capaian Pembelajaran]");
  });
});

describe("formatFileSize", () => {
  it("memakai dua desimal seperti label form", () => {
    expect(formatFileSize(2.4 * 1024 * 1024)).toBe("2.40 MB");
    expect(formatFileSize(0)).toBe("0.00 MB");
  });
});

describe("validateJsonText", () => {
  it("menerima objek JSON dan melaporkan jumlah atribut", () => {
    expect(validateJsonText('{"title":"x","nodes":[]}')).toEqual({
      ok: true,
      keys: 2,
    });
  });

  it("menolak sintaks yang rusak", () => {
    const hasil = validateJsonText("{ oops: }");

    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.message).not.toBe("");
  });

  it("menolak JSON yang sah tetapi bukan objek", () => {
    expect(validateJsonText("[1,2,3]")).toEqual({
      ok: false,
      message: "Isi berkas bukan objek JSON.",
    });
  });
});

describe("buatKodeKelas", () => {
  it("selalu tiga digit dengan awalan QST-", () => {
    expect(buatKodeKelas(() => 0)).toBe("QST-100");
    expect(buatKodeKelas(() => 0.999999)).toBe("QST-999");
    expect(buatKodeKelas(() => 0.5)).toMatch(/^QST-\d{3}$/);
  });
});

describe("parseAiStudioDraft", () => {
  it("mengembalikan null untuk data kosong atau rusak", () => {
    expect(parseAiStudioDraft(null)).toBeNull();
    expect(parseAiStudioDraft("bukan json")).toBeNull();
    expect(parseAiStudioDraft("42")).toBeNull();
  });

  it("mempertahankan isian yang sah", () => {
    const draft = {
      subject: "Biologi",
      grade: "SMA Grade 10",
      objective: "Tujuan",
      theme: "problem_solving" as const,
      file: { name: "modul.pdf", size: "1.00 MB" },
    };

    expect(parseAiStudioDraft(JSON.stringify(draft))).toEqual(draft);
  });

  it("menambal kolom yang hilang atau bertipe salah", () => {
    expect(
      parseAiStudioDraft(
        JSON.stringify({ subject: "Fisika", theme: "entah", file: "x" }),
      ),
    ).toEqual({
      subject: "Fisika",
      grade: "",
      objective: "",
      theme: "case_study",
      file: null,
    });
  });
});

describe("parseAiStudioSeed", () => {
  const seed = {
    subject: "Informatika",
    grade: "SMA Grade 10",
    objective: "Menyusun flowchart",
    file: { name: "Dasar_Algoritma.pdf", size: "5.40 MB" },
  };

  it("menerima seed lengkap dari kartu materi", () => {
    expect(parseAiStudioSeed(JSON.stringify(seed))).toEqual(seed);
  });

  it("menolak seed tanpa berkas referensi", () => {
    const tanpaBerkas = {
      subject: seed.subject,
      grade: seed.grade,
      objective: seed.objective,
    };
    expect(parseAiStudioSeed(JSON.stringify(tanpaBerkas))).toBeNull();
  });

  it("memakai draf kosong yang aman sebagai nilai awal", () => {
    expect(EMPTY_AI_STUDIO_DRAFT).toEqual({
      subject: "",
      grade: "",
      objective: "",
      theme: "case_study",
      file: null,
    });
  });
});
