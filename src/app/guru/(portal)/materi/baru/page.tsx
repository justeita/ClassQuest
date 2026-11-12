import type { Metadata } from "next";

import { AiStudio } from "@/components/guru/AiStudio";
import { MAX_PDF_BYTES } from "@/server/upload";

export const metadata: Metadata = {
  title: "AI Studio",
};

/**
 * `/guru/materi/baru` — form unggah materi.
 *
 * Komponennya client karena seluruh alurnya berbasis state (berkas, isian,
 * status kirim). Batas ukuran diteruskan dari `src/server/upload/config.ts`
 * supaya angka 4 MB tetap punya satu sumber, bukan disalin ke browser.
 */
export default function MateriBaruPage() {
  return <AiStudio maxBytes={MAX_PDF_BYTES} />;
}
