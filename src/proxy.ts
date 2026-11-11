import { NextResponse, type NextRequest } from "next/server";

import { getPlayableStory } from "@/server/stories";

/**
 * Gerbang status untuk `/play/[storyId]`.
 *
 * `docs/05-frontend/routes.md` mewajibkan **404** untuk cerita yang tidak ada
 * atau belum terbit. Dengan Cache Components + Partial Prefetching, halaman
 * `/play/[storyId]` adalah route `◐` (partial prerender): App Shell sudah
 * dikirim dengan status 200 sebelum `notFound()` di halaman berjalan, sehingga
 * respons akhirnya tetap 200 (soft 404). Next.js menyarankan pemeriksaan awal
 * di Proxy untuk kasus ini — lihat
 * `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md`
 * bagian "Status codes" dan `.../04-functions/not-found.md`.
 *
 * Yang dilakukan di sini hanya satu hal: bila cerita tidak boleh dimainkan,
 * tulis ulang ke `/_not-found` (route bawaan Next yang mengembalikan 404)
 * sebelum halaman dirender. Pemeriksaan kepemilikan/status tetap di
 * `getPlayableStory`, jadi tidak ada aturan yang diduplikasi.
 *
 * Proxy berjalan di Node.js runtime (default Next 16) dan hanya cocok untuk
 * satu segmen `/play/<id>`; aset dan API tidak tersentuh.
 */
export async function proxy(request: NextRequest) {
  const storyId = request.nextUrl.pathname.slice("/play/".length);

  // Hanya satu segmen; biarkan sub-path lain (mis. aset) lewat.
  if (storyId === "" || storyId.includes("/")) return NextResponse.next();

  let story;
  try {
    story = await getPlayableStory(decodeURIComponent(storyId));
  } catch {
    // Gagal membaca database bukan bukti cerita tidak ada. Biarkan halaman
    // menanganinya (dan menampilkan error yang ramah), jangan jadi 404 palsu.
    return NextResponse.next();
  }

  if (story === null) {
    return NextResponse.rewrite(new URL("/_not-found", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/play/:storyId",
};
