import type { ReactNode } from "react";

/**
 * Animasi masuk untuk setiap halaman portal.
 *
 * `template.tsx` dipilih, bukan `layout.tsx`, karena template mendapat `key`
 * baru setiap navigasi (`node_modules/next/dist/docs/01-app/03-api-reference/
 * 03-file-conventions/template.md`). Artinya animasi diputar ulang saat guru
 * pindah menu, tanpa harus memasang kelas animasi di setiap halaman.
 *
 * Yang **tidak** ikut remount adalah `PortalShell` (sidebar, header, toast):
 * posisinya di layout, jadi tidak berkedip saat navigasi. Template hanya
 * membungkus isi konten, tepat di dalam area yang menggulir.
 *
 * Animasi ini murni CSS (`guru-page-enter` di `src/app/globals.css`) dan tidak
 * berjalan bila pengguna memakai `prefers-reduced-motion: reduce`.
 */
export default function PortalTemplate({ children }: { children: ReactNode }) {
  return <div className="guru-page-enter">{children}</div>;
}
