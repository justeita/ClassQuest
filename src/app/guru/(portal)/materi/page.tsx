import type { Metadata } from "next";

import { MaterialsBrowser } from "@/components/guru/MaterialsBrowser";

export const metadata: Metadata = {
  title: "Learning Materials",
};

/** `/guru/materi` — daftar materi, penyaring, dan modal detail. */
export default function MateriPage() {
  return <MaterialsBrowser />;
}
