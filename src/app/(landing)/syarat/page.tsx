import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/components/legal/LegalPage";

/**
 * `/syarat` — syarat dan ketentuan layanan.
 *
 * Dua hal yang sengaja berbeda dari templat asal: tidak menjanjikan anti-cheat
 * (jawaban benar memang bisa terlihat di jaringan, lihat
 * `docs/01-architecture/security-and-privacy.md`) dan tidak menyebut akun siswa
 * (siswa tetap tanpa akun; kode kelas di `/play` hanya jalan masuk).
 */
export const metadata: Metadata = {
  title: "Syarat & Ketentuan",
  description:
    "Aturan pemakaian portal guru, materi yang diunggah, dan permainan siswa di Class Quest.",
};

export default function SyaratPage() {
  return (
    <LegalPage
      aktif="syarat"
      tone="guru"
      badge="KESEPAKATAN PENGGUNA"
      judul="Syarat & Ketentuan"
      ringkasan="Aturan pemakaian portal guru, materi yang diunggah, dan permainan siswa di Class Quest."
      notifikasi={{
        ikon: "fa-scale-balanced",
        judul: "Ringkasan:",
        isi: "materi tetap milik guru dan sekolah, siswa mengerjakan sendiri, dan skor game bukan nilai rapor.",
      }}
      bagian={[
        {
          judul: "1. Akun guru",
          isi: (
            <>
              <p>
                Akun diberikan lewat <code>db:seed</code> oleh pengelola. Tidak
                ada pendaftaran mandiri atau reset sandi di UI. Jaga sandi dan
                jangan membagikan sesi login.
              </p>
              <p>
                Satu akun dipakai untuk mengelola materi, kelas, dan siswa milik
                guru tersebut. Aktivitas yang mengubah data selalu diperiksa
                kepemilikan akunnya di server.
              </p>
            </>
          ),
        },
        {
          judul: "2. Kepemilikan materi",
          isi: (
            <>
              <p>
                Modul, bahan tayang, dan soal yang diunggah tetap menjadi hak
                guru dan institusi sekolahnya. Class Quest hanya memperoleh izin
                operasional untuk mengubah bentuk materi menjadi game selama
                demo ini dipakai.
              </p>
              <p>
                Dengan mengunggah, guru menyatakan berhak atas materi tersebut
                dan tidak melanggar hak cipta pihak lain.
              </p>
            </>
          ),
        },
        {
          judul: "3. Batas unggahan dan pemakaian",
          isi: (
            <>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  PDF digital berisi teks, maksimum 4 MB. PDF hasil scan tanpa
                  lapisan teks ditolak.
                </li>
                <li>
                  Jangan mengunggah materi yang memuat malware, ujaran kebencian
                  SARA, perundungan, atau data pribadi orang lain tanpa izin.
                </li>
                <li>
                  Jangan mencoba membebani server, menembus rate limit, atau
                  mengakses data guru lain.
                </li>
              </ul>
              <p>
                Materi atau kelas yang melanggar dapat dinonaktifkan oleh
                pengelola.
              </p>
            </>
          ),
        },
        {
          judul: "4. Peran AI",
          isi: (
            <p>
              AI hanya mengubah bentuk materi menjadi cerita. AI tidak menambah
              fakta di luar materi dan tidak menggantikan penilaian guru. Semua
              hasil generasi wajib diperiksa sebelum diberikan kepada siswa;
              lihat halaman{" "}
              <Link
                href="/penafian"
                className="font-semibold text-guru-700 hover:underline"
              >
                Penafian
              </Link>
              .
            </p>
          ),
        },
        {
          judul: "5. Kejujuran akademik siswa",
          isi: (
            <>
              <p>
                Siswa mengerjakan tantangan sendiri, tanpa bot atau skrip. Skor,
                poin, dan ringkasan konsep di layar hasil adalah evaluasi
                formatif internal, bukan nilai rapor, ijazah, atau keputusan
                kelulusan.
              </p>
              <p>
                Game tidak memiliki anti-cheat. Siswa dengan kemampuan teknis
                dapat melihat data jawaban di jaringan, jadi jangan memakai skor
                game untuk ujian formal.
              </p>
            </>
          ),
        },
        {
          judul: "6. Ketersediaan layanan",
          isi: (
            <p>
              Ini aplikasi demo kompetisi. Fitur dapat berubah, dibatasi, atau
              dihentikan tanpa pemberitahuan, dan tidak ada jaminan ketersediaan
              (SLA).
            </p>
          ),
        },
        {
          judul: "7. Perubahan ketentuan",
          isi: (
            <p>
              Ketentuan dapat diperbarui bersama perubahan aplikasi. Tanggal
              pembaruan terakhir selalu ditampilkan di atas halaman ini.
            </p>
          ),
        },
      ]}
    />
  );
}
