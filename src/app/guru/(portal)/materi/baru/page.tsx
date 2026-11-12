import type { Metadata } from "next";

import { AiStudio } from "@/components/guru/AiStudio";

export const metadata: Metadata = {
  title: "AI Studio",
};

/**
 * `/guru/materi/baru` — form AI Studio.
 *
 * Komponennya client karena seluruh alurnya berbasis state (draf, pratinjau,
 * validasi JSON). Halaman ini hanya menempelkan metadata.
 */
export default function MateriBaruPage() {
  return <AiStudio />;
}
