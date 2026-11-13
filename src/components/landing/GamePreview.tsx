import Image from "next/image";

/**
 * Jendela "tangkapan layar" game di hero halaman peran (`/`).
 *
 * Halaman `/` adalah kesan pertama juri, dan produk ini game pixel — tapi
 * sebelumnya tidak ada satu pun gambar permainan di halaman itu. Panel ini
 * menampilkan peta yang benar-benar dipakai game (`public/assets/map/`) beserta
 * potret dan satu baris dialog dari contoh cerita
 * (`docs/02-data-model/story.example.json`).
 *
 * Semua gambar memakai berkas yang sudah ada di `public/assets/` — tidak ada
 * aset baru, dan tidak ada `assetId` karangan: halaman ini tidak memilih aset
 * untuk cerita, jadi manifest tidak terlibat. Teks dialog sengaja ditulis
 * sebagai teks asli (bukan gambar) supaya tetap tajam di semua layar dan bisa
 * dibaca pembaca layar.
 */
export function GamePreview() {
  return (
    <div className="landing-pixel-frame landing-bob relative overflow-hidden rounded-2xl bg-slate-900">
      <div className="relative aspect-16/10">
        <Image
          src="/assets/map/halaman_sekolah.png"
          alt="Peta halaman sekolah di dalam game: jalan setapak, pohon, kolam, dan ayunan."
          fill
          priority
          sizes="(min-width: 1024px) 520px, 100vw"
          className="object-cover object-center"
        />

        {/* Lapisan supaya dialog di bawah tetap terbaca di atas peta terang. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/10 to-slate-900/25"
        />
        <div
          aria-hidden="true"
          className="landing-scanlines absolute inset-0"
        />

        <p className="absolute left-3 top-3 rounded-md border-2 border-slate-900 bg-white/95 px-2 py-0.5 font-pixel text-[10px] font-bold uppercase tracking-[0.14em] text-slate-800">
          Bab 1 · Evaporasi
        </p>

        {/* Dialog meniru kotak dialog game (ADR 0007): panel gelap, potret di
            kiri, nama pembicara di atas teks. */}
        <div className="absolute inset-x-3 bottom-3 flex items-start gap-2.5 rounded-lg border-2 border-slate-900 bg-slate-900/92 p-2.5 sm:inset-x-4 sm:bottom-4 sm:gap-3 sm:p-3">
          <span className="shrink-0 overflow-hidden rounded border-2 border-slate-700 bg-slate-800">
            <Image
              src="/assets/portrait/pak_bima.png"
              alt=""
              width={64}
              height={64}
              className="h-10 w-10 sm:h-12 sm:w-12"
              style={{ imageRendering: "pixelated" }}
            />
          </span>

          <div className="min-w-0">
            <p className="font-pixel text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-300">
              Pak Bima
            </p>
            <p className="font-game text-[13px] leading-snug text-slate-100 sm:text-sm">
              Genangan itu tadi pagi masih penuh. Ke mana airnya?
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
