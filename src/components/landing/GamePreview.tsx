import Image from "next/image";

/**
 * Jendela "tangkapan layar" game di hero halaman peran (`/`).
 *
 * Halaman `/` adalah kesan pertama juri, dan produk ini game pixel — tapi
 * sebelumnya tidak ada satu pun gambar permainan di halaman itu. Panel ini
 * menampilkan peta desa yang benar-benar dipakai game
 * (`public/assets/world/map_village.jpg`) beserta potret dan satu baris dialog
 * dari contoh cerita (`docs/02-data-model/story.example.json`).
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
          src="/assets/world/map_village.jpg"
          alt="Peta desa di dalam game: rumah-rumah warga, jalan setapak, pohon, dan balai desa."
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
          Bab 1 · Perbandingan
        </p>

        {/* Dialog meniru gaya Persona (ADR 0023): dua potret tanpa bingkai
            berdiri di **atas** panel, dasarnya menempel tepi atas kotak. NPC
            yang bicara di kiri menyala; potret MC di kanan dicerminkan dan
            diredupkan sebagai lawan bicara. */}
        <div className="absolute inset-x-3 bottom-3 sm:inset-x-4 sm:bottom-4">
          <div className="relative">
            <Image
              src="/assets/portrait/mc/neutral.png"
              alt="Potret Kael"
              width={456}
              height={360}
              className="pointer-events-none absolute bottom-full right-0 h-24 w-[50%] -scale-x-100 object-contain object-bottom brightness-50 sm:h-32"
            />
            <Image
              src="/assets/portrait/npc_1/thinking.png"
              alt="Potret Elian"
              width={456}
              height={360}
              className="pointer-events-none absolute bottom-full left-0 h-24 w-[50%] object-contain object-bottom sm:h-32"
            />

            <div className="relative rounded-xl border border-white/5 bg-slate-900/95 px-3 pb-2.5 pt-2 sm:px-4">
              <p className="font-pixel text-[10px] font-bold uppercase tracking-[0.14em] text-[#55D0A5]">
                Elian
              </p>
              <p className="font-game text-[13px] leading-snug text-[#EFF2F7] sm:text-sm">
                Tiga bagian tinta biru, dua bagian tinta emas. Berapa cangkir
                tinta emas untuk sembilan cangkir biru?
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
