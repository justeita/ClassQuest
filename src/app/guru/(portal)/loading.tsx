/**
 * Indikator navigasi portal.
 *
 * Segmen `(portal)` tidak tahu halaman mana yang sedang dituju. Kerangka di
 * sini akan salah bentuk — menguji di jaringan lambat, kerangka dashboard
 * sempat muncul di halaman materi. Karena itu boundary ini memakai **loading
 * biasa** yang netral: spinner kecil + teks berkonteks, bukan skeleton.
 *
 * Skeleton tetap dipakai di segmen yang tahu bentuk halamannya
 * (`materi/loading.tsx`, `kelas/loading.tsx`, `game/loading.tsx`, dan
 * seterusnya), sesuai `docs/05-frontend/ui-conventions.md`.
 *
 * Indikator ini biasanya hanya terlihat sekejap: shell halaman portal statis
 * dan langsung dirender, lalu kerangka segmen yang mengambil alih.
 */
export default function PortalLoading() {
  return (
    <div className="mx-auto flex max-w-6xl items-center gap-2 pt-2 text-xs font-semibold text-slate-500">
      <i
        className="fa-solid fa-spinner animate-spin text-brand-600 motion-reduce:animate-none"
        aria-hidden
      />
      <span role="status">Memuat halaman…</span>
    </div>
  );
}
