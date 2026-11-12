import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { ReactNode } from "react";

import { PortalShell } from "@/components/guru/PortalShell";
import { AuthError, requireTeacher } from "@/server/auth";

/**
 * Layout halaman portal (`/guru`, `/guru/materi`, `/guru/kelas`, `/guru/game`).
 *
 * Route group `(portal)` dipakai supaya `/guru/masuk` tetap berada di bawah
 * `src/app/guru/layout.tsx` (font + notifikasi) tetapi tidak mendapat sidebar.
 *
 * Otorisasi dipasang di sini, sesuai `docs/05-frontend/routes.md` ("Otorisasi
 * halaman guru: `requireTeacher()` di layout `(portal)`"): sesi yang tidak sah
 * diarahkan ke `/guru/masuk` sebelum halaman mana pun dirender. Setiap page dan
 * Server Action tetap memanggil `requireTeacher()` sendiri — layout bukan batas
 * keamanan untuk request langsung.
 *
 * `instant = false` adalah pola resmi Next 16 untuk segmen yang membaca sesi
 * (`cookies()`), lihat `node_modules/next/dist/docs/01-app/02-guides/
 * authentication-with-cache-components.md`. Tanpa itu, pembacaan sesi di layout
 * dianggap memblokir render.
 *
 * `await connection()` menandai segmen ini dirender per request. Tanpa itu,
 * `verifySessionToken()` memanggil `Date.now()` saat prerender dan Next
 * melaporkan `blocking-prerender-current-time` (lihat `docs/01-app/
 * 01-getting-started/08-caching.md`).
 */
export const instant = false;

export default async function PortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  await connection();

  let teacher;
  try {
    teacher = await requireTeacher();
  } catch (error) {
    if (error instanceof AuthError) redirect("/guru/masuk");
    throw error;
  }

  // Nama tampilan diambil dari token sesi (diisi saat login dari baris
  // `teachers`), jadi sidebar menampilkan nama guru yang benar-benar masuk.
  return (
    <PortalShell teacherName={teacher.displayName}>{children}</PortalShell>
  );
}
