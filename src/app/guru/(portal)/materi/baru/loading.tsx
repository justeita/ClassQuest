import { StudioSkeleton } from "@/components/guru/skeletons";

/**
 * Kerangka navigasi `/guru/materi/baru`.
 *
 * Halaman ini statis dan biasanya sudah ter-prefetch, jadi kerangka jarang
 * terlihat. Tetap disediakan agar saat jaringan lambat yang muncul bentuk form,
 * bukan kerangka daftar materi milik segmen induk.
 */
export default function StudioLoading() {
  return <StudioSkeleton />;
}
