import type { ReactNode } from "react";

import { PortalShell } from "@/components/guru/PortalShell";

/**
 * Layout halaman portal (`/guru`, `/guru/materi`, `/guru/kelas`, `/guru/game`).
 *
 * Route group `(portal)` dipakai supaya `/guru/masuk` tetap berada di bawah
 * `src/app/guru/layout.tsx` (font + notifikasi) tetapi tidak mendapat sidebar.
 */
export default function PortalLayout({ children }: { children: ReactNode }) {
  return <PortalShell>{children}</PortalShell>;
}
