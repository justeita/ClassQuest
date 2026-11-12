import type { Metadata } from "next";

import { ClassesBrowser } from "@/components/guru/ClassesBrowser";

export const metadata: Metadata = {
  title: "My Classes",
};

/** `/guru/kelas` — daftar kelas, detail kelas, dan modal kelas baru. */
export default function KelasPage() {
  return <ClassesBrowser />;
}
