import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";

/**
 * `/cookie` — cookie dan penyimpanan lokal.
 *
 * Tabel di bawah hanya memuat kunci yang benar-benar dipakai kode:
 * `TEACHER_SESSION_COOKIE` (`src/server/auth.ts`) dan `KUNCI_PENGATURAN`
 * (`src/game/audioSettings.ts`). Kunci dari desain HTML asal (`cq_session_auth`,
 * `cq_class_token`, `eduacademic_teacher_draft`) tidak dipakai dan sengaja tidak
 * dicantumkan.
 */
export const metadata: Metadata = {
  title: "Kebijakan Cookie",
  description:
    "Cookie sesi guru dan penyimpanan lokal yang benar-benar dipakai Class Quest.",
};

const PENYIMPANAN = [
  {
    kunci: "classquest_teacher_session",
    jenis: "Cookie httpOnly, SameSite=Lax",
    tujuan: "Menjaga sesi login guru agar tidak keluar saat menyusun materi.",
    masa: "8 jam",
  },
  {
    kunci: "classquest:settings:v1",
    jenis: "localStorage",
    tujuan: "Menyimpan volume musik dan efek suara yang dipilih pemain.",
    masa: "Sampai dihapus pengguna",
  },
] as const;

export default function CookiePage() {
  return (
    <LegalPage
      aktif="cookie"
      tone="netral"
      badge="PENYIMPANAN SESI & LOKAL"
      judul="Kebijakan Cookie & Penyimpanan Lokal"
      ringkasan="Cookie dan localStorage yang benar-benar dipakai aplikasi ini, serta cara menghapusnya."
      notifikasi={{
        ikon: "fa-cookie",
        judul: "Tanpa pelacak iklan.",
        isi: "Class Quest hanya memakai cookie fungsional untuk sesi guru dan penyimpanan lokal untuk pengaturan suara.",
      }}
      bagian={[
        {
          judul: "1. Komponen yang dipakai",
          isi: (
            <>
              {/* Tabel hanya untuk layar >= sm. Di ponsel, kolom "Tujuan"
                  tidak terbaca dalam tabel selebar 390 px, jadi baris yang sama
                  dirender sebagai kartu (ui-conventions: tabel → kartu). */}
              <div className="hidden overflow-x-auto rounded-xl border-2 border-slate-900 sm:block">
                <table className="w-full border-collapse text-left text-xs">
                  <caption className="sr-only">
                    Daftar cookie dan penyimpanan lokal Class Quest
                  </caption>
                  <thead className="border-b-2 border-slate-900 bg-slate-100 font-pixel text-slate-800">
                    <tr>
                      <th scope="col" className="p-2.5">
                        Kunci
                      </th>
                      <th scope="col" className="p-2.5">
                        Jenis
                      </th>
                      <th scope="col" className="p-2.5">
                        Tujuan
                      </th>
                      <th scope="col" className="p-2.5">
                        Masa simpan
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {PENYIMPANAN.map((baris) => (
                      <tr key={baris.kunci}>
                        <td className="p-2.5 font-mono font-bold text-slate-900">
                          {baris.kunci}
                        </td>
                        <td className="p-2.5 text-slate-600">{baris.jenis}</td>
                        <td className="p-2.5 text-slate-600">{baris.tujuan}</td>
                        <td className="p-2.5 font-mono text-slate-600">
                          {baris.masa}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="space-y-2 sm:hidden">
                {PENYIMPANAN.map((baris) => (
                  <li
                    key={baris.kunci}
                    className="rounded-xl border border-slate-300 bg-white p-3"
                  >
                    <p className="break-all font-mono text-xs font-bold text-slate-900">
                      {baris.kunci}
                    </p>
                    <dl className="mt-2 space-y-1 text-xs">
                      <div className="flex gap-2">
                        <dt className="w-20 shrink-0 font-semibold text-slate-500">
                          Jenis
                        </dt>
                        <dd className="text-slate-600">{baris.jenis}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="w-20 shrink-0 font-semibold text-slate-500">
                          Tujuan
                        </dt>
                        <dd className="text-slate-600">{baris.tujuan}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="w-20 shrink-0 font-semibold text-slate-500">
                          Masa
                        </dt>
                        <dd className="text-slate-600">{baris.masa}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            </>
          ),
        },
        {
          judul: "2. Yang tidak dipakai",
          isi: (
            <ul className="list-disc space-y-1 pl-5">
              <li>Cookie iklan, pelacak lintas situs, atau analytics.</li>
              <li>
                Token kelas di browser: kode <code>QST-XXXX</code> dipakai siswa
                sebagai jalan masuk di <code>/play</code>, tetapi tidak disimpan
                di cookie atau penyimpanan peramban — kode hanya hidup selama
                form terbuka.
              </li>
              <li>
                Draf ketikan guru di browser: penyimpanan otomatis draf belum
                ada.
              </li>
            </ul>
          ),
        },
        {
          judul: "3. Cara menghapus",
          isi: (
            <>
              <p>
                Keluar dari portal guru menghapus cookie sesi. Menghapus data
                situs lewat menu peramban (Clear Browsing Data) juga menghapus
                cookie dan pengaturan audio.
              </p>
              <p>
                Setelah cookie dihapus, guru harus masuk kembali. Setelah
                localStorage dihapus, volume musik dan efek suara kembali ke
                nilai awal.
              </p>
            </>
          ),
        },
        {
          judul: "4. Bukan pelacak",
          isi: (
            <p>
              Cookie sesi hanya dikirim ke server Class Quest dan tidak dipakai
              untuk membangun profil lintas situs. Tidak ada data penyimpanan
              yang dijual atau dibagikan ke pihak ketiga.
            </p>
          ),
        },
      ]}
    />
  );
}
