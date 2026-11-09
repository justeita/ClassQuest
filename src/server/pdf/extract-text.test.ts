import { describe, expect, it, vi } from "vitest";
import {
  extractPdfText,
  MAX_PDF_PAGES,
  MIN_TEXT_LAYER_CHARS,
} from "./extract-text";
import { PdfExtractError } from "./errors";

/**
 * Pengganti `unpdf` yang meneruskan ke implementasi asli, kecuali test
 * sedang mengaktifkan error password/terenkripsi. Dibuat di top-level karena
 * `vi.mock` di-hoist; toggle-nya per test lewat variabel di bawah.
 */
let forcedProxyError: Error | null = null;

vi.mock("unpdf", async (importOriginal) => {
  const actual = await importOriginal<typeof import("unpdf")>();
  return {
    ...actual,
    getDocumentProxy: ((
      ...args: Parameters<typeof actual.getDocumentProxy>
    ) => {
      if (forcedProxyError) throw forcedProxyError;
      return actual.getDocumentProxy(...args);
    }) as typeof actual.getDocumentProxy,
  };
});

/* -------------------------------------------------------------------------- */
/* Builder PDF minimal (programatik, tanpa file biner dan tanpa jaringan)      */
/* -------------------------------------------------------------------------- */

/** Escape string untuk literal PDF di operator `Tj`. */
function escapePdfText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

/**
 * Susun PDF 1.4 minimal dengan satu content stream per halaman. Halaman
 * kosong tetap punya objek `Page` (content stream-nya kosong), supaya
 * `numPages` tetap benar dan nomor halaman tidak bergeser.
 */
function buildPdf(pageTexts: string[]): Uint8Array {
  const objects = new Map<number, string>();
  const fontObjNum = 3;

  objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  const kids = pageTexts.map((_, index) => `${4 + index * 2} 0 R`).join(" ");
  objects.set(
    2,
    `<< /Type /Pages /Kids [${kids}] /Count ${pageTexts.length} >>`,
  );
  objects.set(
    fontObjNum,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  );

  pageTexts.forEach((text, index) => {
    const pageObjNum = 4 + index * 2;
    const contentObjNum = pageObjNum + 1;
    // Pdf.js hanya menampilkan bagian string yang jatuh di dalam MediaBox,
    // jadi teks panjang dipatahkan menjadi baris seperti PDF sungguhan.
    const lines = text.match(/.{1,64}/g) ?? [];
    const stream =
      lines.length === 0
        ? ""
        : `BT /F1 12 Tf 72 720 Td 14 TL` +
          lines.map((line) => ` (${escapePdfText(line)}) Tj T*`).join("") +
          ` ET`;
    objects.set(
      pageObjNum,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ` +
        `/Contents ${contentObjNum} 0 R /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> >>`,
    );
    objects.set(
      contentObjNum,
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    );
  });

  // Susun body sambil mencatat offset tiap objek untuk xref.
  let body = "%PDF-1.4\n";
  const offsets = new Map<number, number>();
  for (const [num, content] of objects) {
    offsets.set(num, body.length);
    body += `${num} 0 obj\n${content}\nendobj\n`;
  }

  const lastObjNum = Math.max(...objects.keys());
  let xref = `xref\n0 ${lastObjNum + 1}\n0000000000 65535 f \n`;
  for (let num = 1; num <= lastObjNum; num += 1) {
    const offset = offsets.get(num);
    xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${lastObjNum + 1} /Root 1 0 R >>\nstartxref\n${body.length}\n%%EOF\n`;

  return new TextEncoder().encode(body + xref + trailer);
}

/** Teks cukup panjang untuk lolos ambang NO_TEXT_LAYER. */
const longText = (label: string): string =>
  `${label}: fotosintesis mengubah karbon dioksida dan air menjadi glukosa dengan bantuan cahaya matahari, lalu menghasilkan oksigen sebagai sisa prosesnya untuk makhluk hidup di bumi. `.repeat(
    3,
  );

/* -------------------------------------------------------------------------- */
/* Test                                                                        */
/* -------------------------------------------------------------------------- */

describe("extractPdfText", () => {
  it("mengekstrak teks per halaman dari PDF satu halaman", async () => {
    const bytes = buildPdf([longText("Halaman satu")]);

    const result = await extractPdfText(bytes);

    expect(result.pageCount).toBe(1);
    expect(result.pages).toEqual([
      { pageNumber: 1, text: expect.stringContaining("fotosintesis") },
    ]);
    expect(result.totalChars).toBeGreaterThanOrEqual(MIN_TEXT_LAYER_CHARS);
  });

  it("menomori tiga halaman mulai dari 1 dengan urutan teks yang benar", async () => {
    const bytes = buildPdf([
      longText("Bab satu"),
      longText("Bab dua"),
      longText("Bab tiga"),
    ]);

    const result = await extractPdfText(bytes);

    expect(result.pageCount).toBe(3);
    expect(result.pages.map((page) => page.pageNumber)).toEqual([1, 2, 3]);
    expect(result.pages[0]?.text).toContain("Bab satu");
    expect(result.pages[1]?.text).toContain("Bab dua");
    expect(result.pages[2]?.text).toContain("Bab tiga");
  });

  it("tidak menggeser nomor halaman ketika ada halaman kosong di tengah", async () => {
    const bytes = buildPdf([
      longText("Pertama"),
      "", // halaman kosong: tetap dihitung, nomornya tetap
      longText("Ketiga"),
    ]);

    const result = await extractPdfText(bytes);

    expect(result.pageCount).toBe(3);
    expect(result.pages.map((page) => page.pageNumber)).toEqual([1, 2, 3]);
    expect(result.pages[1]?.text).toBe("");
    expect(result.pages[2]?.text).toContain("Ketiga");
  });

  it("meratakan whitespace dan membuang karakter kontrol tanpa mengubah kalimat", async () => {
    // \u0007 (bel) dan \u0000 dibuang; spasi ganda dan newline diratakan.
    const messy =
      `Fotosintesis\u0007 adalah\u0000   proses\n\n pembuatan\t\tmakanan pada tumbuhan hijau yang membutuhkan cahaya matahari dan klorofil, serta menghasilkan oksigen bagi makhluk hidup lain di bumi secara berkelanjutan. `.repeat(
        3,
      );
    const bytes = buildPdf([messy]);

    const result = await extractPdfText(bytes);

    const text = result.pages[0]?.text ?? "";
    expect(text).not.toMatch(/\s{2,}/);
    expect(text).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/);
    expect(text).toContain("adalah proses pembuatan makanan");
    expect(text.startsWith("Fotosintesis")).toBe(true);
    expect(text.endsWith("berkelanjutan.")).toBe(true);
  });

  it("melempar NO_TEXT_LAYER ketika total teks di bawah ambang", async () => {
    const bytes = buildPdf(["terlalu pendek"]);

    await expect(extractPdfText(bytes)).rejects.toMatchObject({
      name: "PdfExtractError",
      code: "NO_TEXT_LAYER",
    });
  });

  it("melempar NO_TEXT_LAYER untuk PDF tanpa teks sama sekali", async () => {
    const bytes = buildPdf(["", ""]);

    await expect(extractPdfText(bytes)).rejects.toBeInstanceOf(PdfExtractError);
    await expect(extractPdfText(bytes)).rejects.toMatchObject({
      code: "NO_TEXT_LAYER",
    });
  });

  it("melempar TOO_MANY_PAGES ketika jumlah halaman melebihi batas", async () => {
    const bytes = buildPdf(
      Array.from({ length: 4 }, () => longText("Hanya pengisi")),
    );

    // Batas diturunkan supaya test cepat; batas asli tetap dieksport dan
    // ditegakkan di jalur produksi (tanpa opsi).
    await expect(extractPdfText(bytes, { maxPages: 3 })).rejects.toMatchObject({
      code: "TOO_MANY_PAGES",
    });
  });

  it("menegakkan batas halaman bawaan dari docs", async () => {
    expect(MAX_PDF_PAGES).toBe(40);
  });

  it("melempar PDF_UNREADABLE untuk bytes sampah", async () => {
    const garbage = new TextEncoder().encode(
      "ini bukan pdf, hanya teks biasa yang kebetulan diawali %PDF- tetapi tidak punya objek apa pun",
    );

    await expect(extractPdfText(garbage)).rejects.toMatchObject({
      code: "PDF_UNREADABLE",
    });
  });

  it("melempar PDF_UNREADABLE untuk PDF terpotong", async () => {
    const full = buildPdf([longText("Utuh")]);
    // Buang setengah ekor: xref, trailer, dan sebagian objek hilang.
    const truncated = full.slice(0, Math.floor(full.byteLength / 2));

    await expect(extractPdfText(truncated)).rejects.toMatchObject({
      code: "PDF_UNREADABLE",
    });
  });

  it("memetakan error password/terenkripsi dari unpdf ke PDF_UNREADABLE", async () => {
    const passwordError = new Error("No password given");
    passwordError.name = "PasswordException";
    forcedProxyError = passwordError;
    try {
      await expect(
        extractPdfText(buildPdf([longText("Rahasia")])),
      ).rejects.toMatchObject({ code: "PDF_UNREADABLE" });
    } finally {
      forcedProxyError = null;
    }
  });

  it("tidak mengubah buffer yang diberikan pemanggil", async () => {
    const bytes = buildPdf([longText("Sama")]);
    const before = new Uint8Array(bytes);

    await extractPdfText(bytes);
    await extractPdfText(bytes); // bytes masih bisa dipakai lagi

    expect(bytes.byteLength).toBe(before.byteLength);
    expect(Array.from(bytes)).toEqual(Array.from(before));
  });

  it("tidak membocorkan isi PDF atau pesan mentah parser di pesan error", async () => {
    const secret = "RAHASIA-FOTOSINTESIS-XYZ";
    const bytes = buildPdf([longText(secret)]);
    // Buat gagal terbaca dengan menghapus seluruh ekor dokumen.
    const truncated = bytes.slice(0, 60);

    const error = await extractPdfText(truncated).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(PdfExtractError);
    const message = (error as PdfExtractError).message;
    expect(message).not.toContain(secret);
    expect(message).not.toContain("startxref");
    expect(message).not.toContain("obj");
    expect(message).toBe(
      "File PDF tidak bisa dibaca. Coba simpan ulang file lalu unggah lagi.",
    );
  });
});
