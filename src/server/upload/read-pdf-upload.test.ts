// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Modul upload tidak boleh menyentuh disk. Mock ini menjaga janji tersebut:
 * kalau implementasi suatu saat menulis file, test akan menangkapnya.
 */
vi.mock("node:fs/promises", () => ({
  appendFile: vi.fn(),
  mkdir: vi.fn(),
  open: vi.fn(),
  writeFile: vi.fn(),
}));

import * as fsPromises from "node:fs/promises";

import {
  MAX_FILENAME_LENGTH,
  MAX_PDF_BYTES,
  readPdfUpload,
  sanitizeFilename,
  UploadError,
} from ".";

const PDF_TEXT = "%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n";
const PDF_BYTES = new TextEncoder().encode(PDF_TEXT);

function pdfFile(
  name: string = "materi.pdf",
  body: string | Uint8Array = PDF_BYTES,
  type: string = "application/pdf",
): File {
  const part = typeof body === "string" ? body : (body.buffer as ArrayBuffer);
  return new File([part], name, { type });
}

async function captureUploadError(
  promise: Promise<unknown>,
): Promise<UploadError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(UploadError);
    return error as UploadError;
  }
  throw new Error("Fungsi seharusnya melempar UploadError.");
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("readPdfUpload — jalur sukses", () => {
  it("membaca PDF valid menjadi bytes di memori", async () => {
    const result = await readPdfUpload(pdfFile());

    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(Buffer.from(result.bytes).toString("utf8")).toBe(PDF_TEXT);
    expect(result.filename).toBe("materi.pdf");
    expect(result.sizeBytes).toBe(PDF_BYTES.byteLength);
  });

  it("memakai nama default untuk Blob tanpa nama", async () => {
    const blob = new Blob([PDF_BYTES], { type: "application/pdf" });

    const result = await readPdfUpload(blob);

    expect(result.filename).toBe("materi.pdf");
    expect(result.bytes.byteLength).toBe(PDF_BYTES.byteLength);
  });

  it("menerima PDF dengan ekstensi .pdf walau MIME browser kosong", async () => {
    const file = pdfFile("materi.pdf", PDF_BYTES, "");

    const result = await readPdfUpload(file);

    expect(result.filename).toBe("materi.pdf");
  });

  it("menerima PDF dengan MIME benar walau namanya tanpa ekstensi", async () => {
    const file = pdfFile("materi", PDF_BYTES, "application/pdf");

    const result = await readPdfUpload(file);

    expect(result.bytes.byteLength).toBe(PDF_BYTES.byteLength);
  });

  it("menerima MIME PDF dengan parameter", async () => {
    const file = pdfFile(
      "materi.pdf",
      PDF_BYTES,
      "application/pdf; charset=binary",
    );

    const result = await readPdfUpload(file);

    expect(result.filename).toBe("materi.pdf");
  });

  it("menerima file tepat pada batas 4 MB", async () => {
    const bytes = new Uint8Array(MAX_PDF_BYTES);
    bytes.set(new TextEncoder().encode("%PDF-1.7\n"));

    const result = await readPdfUpload(pdfFile("pas.pdf", bytes));

    expect(result.sizeBytes).toBe(MAX_PDF_BYTES);
  });
});

describe("readPdfUpload — penolakan", () => {
  it("menolak file yang kosong", async () => {
    const error = await captureUploadError(
      readPdfUpload(pdfFile("kosong.pdf", new Uint8Array(0))),
    );

    expect(error.code).toBe("FILE_MISSING");
    expect(error.status).toBe(400);
  });

  it("menolak input yang tidak ada", async () => {
    const error = await captureUploadError(readPdfUpload(null));

    expect(error.code).toBe("FILE_MISSING");
  });

  it("menolak file yang melebihi 4 MB", async () => {
    const tooLarge = new File(
      [new Uint8Array(MAX_PDF_BYTES + 1)],
      "besar.pdf",
      { type: "application/pdf" },
    );

    const error = await captureUploadError(readPdfUpload(tooLarge));

    expect(error.code).toBe("FILE_TOO_LARGE");
    expect(error.status).toBe(413);
    expect(error.details).toEqual({ maxBytes: MAX_PDF_BYTES });
  });

  it("menolak file yang bukan PDF (magic bytes salah)", async () => {
    const file = pdfFile("materi.pdf", "BUKAN PDF SAMA SEKALI");

    const error = await captureUploadError(readPdfUpload(file));

    expect(error.code).toBe("FILE_TYPE");
    expect(error.status).toBe(415);
  });

  it("menolak MIME application/pdf yang isinya bukan PDF", async () => {
    const file = pdfFile(
      "materi.pdf",
      "<html><body>halaman palsu</body></html>",
      "application/pdf",
    );

    const error = await captureUploadError(readPdfUpload(file));

    expect(error.code).toBe("FILE_TYPE");
  });

  it("menolak tipe dan ekstensi yang jelas bukan PDF", async () => {
    const file = pdfFile("materi.txt", "teks biasa", "text/plain");

    const error = await captureUploadError(readPdfUpload(file));

    expect(error.code).toBe("FILE_TYPE");
  });

  it("tidak membocorkan isi file di pesan error", async () => {
    const rahasia = "KONTEN-RAHASIA-YANG-TIDAK-BOLEH-BOCOR";
    const file = pdfFile("materi.pdf", rahasia);

    const error = await captureUploadError(readPdfUpload(file));

    expect(error.message).not.toContain(rahasia);
  });

  it("memetakan kegagalan baca menjadi PDF_UNREADABLE tanpa pesan internal", async () => {
    const broken = {
      size: PDF_BYTES.byteLength,
      type: "application/pdf",
      arrayBuffer: async () => {
        throw new Error("ENOENT: /home/guru/rahasia/materi.pdf");
      },
    } as unknown as Blob;

    const error = await captureUploadError(readPdfUpload(broken));

    expect(error.code).toBe("PDF_UNREADABLE");
    expect(error.status).toBe(422);
    expect(error.message).not.toContain("/home/guru");
  });
});

describe("nama file berbahaya", () => {
  it("membuang path traversal dan hanya menyisakan nama tampilan", async () => {
    const file = pdfFile("../../etc/passwd.pdf");

    const result = await readPdfUpload(file);

    expect(result.filename).toBe("passwd.pdf");
    expect(result.filename).not.toContain("/");
    expect(result.filename).not.toContain("..");
  });

  it("membuang path Windows", async () => {
    const file = pdfFile("C:\\Users\\guru\\materi.pdf");

    const result = await readPdfUpload(file);

    expect(result.filename).toBe("materi.pdf");
    expect(result.filename).not.toContain("\\");
  });

  it("membuang karakter kontrol", () => {
    expect(sanitizeFilename("materi\u0000\u0007\u001b.pdf")).toBe("materi.pdf");
    expect(sanitizeFilename("materi\u009b.pdf")).toBe("materi.pdf");
  });

  it("membuang penanda bidi yang bisa menyamarkan nama", () => {
    expect(sanitizeFilename("materi\u202e.pdf")).toBe("materi.pdf");
    expect(sanitizeFilename("materi\u200e.pdf")).toBe("materi.pdf");
  });

  it("membatasi panjang nama tetapi mempertahankan ekstensi", () => {
    const longName = `${"a".repeat(300)}.pdf`;

    const result = sanitizeFilename(longName);

    expect(Array.from(result).length).toBeLessThanOrEqual(MAX_FILENAME_LENGTH);
    expect(result.endsWith(".pdf")).toBe(true);
  });

  it("tidak membelah emoji saat memotong nama", () => {
    const longName = `${"😀".repeat(300)}.pdf`;

    const result = sanitizeFilename(longName);

    expect(Array.from(result).length).toBeLessThanOrEqual(MAX_FILENAME_LENGTH);
    expect(result).not.toContain("\ufffd");
    expect(result.endsWith(".pdf")).toBe(true);
  });

  it("tidak pernah melebihi batas panjang yang diberikan", () => {
    const result = sanitizeFilename("materi.abcdefghij", 5);

    expect(Array.from(result).length).toBeLessThanOrEqual(5);
  });

  it("memakai nama default untuk nama kosong, titik, atau path saja", () => {
    expect(sanitizeFilename("")).toBe("materi.pdf");
    expect(sanitizeFilename("   ")).toBe("materi.pdf");
    expect(sanitizeFilename(".")).toBe("materi.pdf");
    expect(sanitizeFilename("..")).toBe("materi.pdf");
    expect(sanitizeFilename("../../")).toBe("materi.pdf");
    expect(sanitizeFilename(null)).toBe("materi.pdf");
    expect(sanitizeFilename(undefined)).toBe("materi.pdf");
  });

  it("menormalkan pemisah path fullwidth sebelum mengambil nama", () => {
    expect(sanitizeFilename("folder／materi.pdf")).toBe("materi.pdf");
  });
});

describe("tidak ada penulisan file", () => {
  it("tidak memanggil node:fs/promises saat membaca PDF valid", async () => {
    await readPdfUpload(pdfFile());

    expect(fsPromises.writeFile).not.toHaveBeenCalled();
    expect(fsPromises.appendFile).not.toHaveBeenCalled();
    expect(fsPromises.mkdir).not.toHaveBeenCalled();
    expect(fsPromises.open).not.toHaveBeenCalled();
  });

  it("tidak memanggil node:fs/promises saat upload ditolak", async () => {
    await captureUploadError(readPdfUpload(pdfFile("materi.pdf", "bukan pdf")));

    expect(fsPromises.writeFile).not.toHaveBeenCalled();
    expect(fsPromises.appendFile).not.toHaveBeenCalled();
    expect(fsPromises.mkdir).not.toHaveBeenCalled();
    expect(fsPromises.open).not.toHaveBeenCalled();
  });
});
