import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";

/**
 * `/privasi` — kebijakan privasi.
 *
 * Isi mengikuti perilaku aplikasi yang benar-benar ada
 * (`docs/01-architecture/security-and-privacy.md` dan
 * `docs/06-backend/persistence.md`), bukan templat legal umum. Karena itu tidak
 * ada klaim XP, leaderboard, token kelas, atau email sekolah yang tidak dipakai
 * kode.
 */
export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description:
    "Data apa yang diproses Class Quest, di mana disimpan, dan batasannya sebagai demo hackathon.",
};

export default function PrivasiPage() {
  return (
    <LegalPage
      aktif="privasi"
      tone="guru"
      badge="DOKUMEN PRIVASI DATA"
      judul="Kebijakan Privasi"
      ringkasan="Data apa yang diproses Class Quest, di mana disimpan, dan batasannya sebagai demo hackathon. Acuan: UU PDP No. 27 Tahun 2022."
      notifikasi={{
        ikon: "fa-shield-halved",
        judul: "Class Quest adalah demo, bukan sistem produksi.",
        isi: "Jangan mengunggah data siswa nyata atau dokumen yang tidak boleh diproses pihak ketiga. Halaman ini menjelaskan perilaku aplikasi apa adanya, termasuk hal yang belum ada.",
      }}
      bagian={[
        {
          judul: "1. Data akun guru",
          isi: (
            <>
              <p>
                Akun guru dibuat oleh pengelola lewat <code>db:seed</code>,
                bukan pendaftaran mandiri. Yang disimpan: nama tampilan,
                username, dan hash sandi scrypt. Tidak ada email, nomor telepon,
                atau foto profil.
              </p>
              <p>
                Sesi login memakai cookie <code>httpOnly</code> bertanda tangan
                HMAC-SHA256 yang berlaku 8 jam. Isinya hanya id dan nama
                tampilan guru, bukan sandi atau hash-nya.
              </p>
            </>
          ),
        },
        {
          judul: "2. Data kelas dan siswa",
          isi: (
            <>
              <p>
                Guru dapat membuat kelas dan menambahkan siswa. Data yang
                tersimpan:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Kelas: nama, mata pelajaran, jenjang, tahun ajaran, dan kode
                  label <code>QST-XXXX</code>.
                </li>
                <li>
                  Siswa: nama tampilan dan NIS opsional (unik per guru, bukan
                  global).
                </li>
              </ul>
              <p>
                Siswa tidak membuat akun dan tidak memasukkan kode kelas. Kode
                kelas hanya label tampilan.
              </p>
            </>
          ),
        },
        {
          judul: "3. Materi dan cerita",
          isi: (
            <>
              <p>
                Isi PDF diproses di memori server untuk mengekstrak teks, lalu
                tidak disimpan ke disk, bucket, atau database. Yang tersimpan
                hanya nama file, jumlah halaman, dan cerita hasil olahan (bab,
                dialog, soal) beserta versinya.
              </p>
              <p>
                Nama dan isi materi tidak dikirim ke prompt AI bersama data
                siswa. Identitas siswa tidak pernah masuk ke prompt.
              </p>
            </>
          ),
        },
        {
          judul: "4. Ringkasan hasil bermain",
          isi: (
            <p>
              Bila ringkasan hasil disimpan, isinya hanya id dan versi cerita,
              jumlah jawaban benar dan total soal, poin, konsep yang lemah,
              serta nama panggilan opsional. Tidak ada IP mentah, user agent,
              atau jawaban per opsi yang disimpan bersama hasil.
            </p>
          ),
        },
        {
          judul: "5. Data teknis",
          isi: (
            <p>
              Pembatas laju menyimpan HMAC-SHA256 dari alamat IP, bukan alamat
              aslinya, dan baris lama dihapus otomatis setelah jendelanya lewat.
              Pengaturan volume musik dan efek suara disimpan di browser dengan
              kunci <code>classquest:settings:v1</code>.
            </p>
          ),
        },
        {
          judul: "6. Yang tidak dilakukan",
          isi: (
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Tidak menjual atau membagikan data ke broker data komersial.
              </li>
              <li>
                Tidak memakai cookie iklan atau pelacak pihak ketiga. Tidak ada
                analytics.
              </li>
              <li>
                Tidak memakai materi guru untuk melatih model AI publik tanpa
                persetujuan tertulis.
              </li>
            </ul>
          ),
        },
        {
          judul: "7. Hak dan penghapusan",
          isi: (
            <>
              <p>
                Guru dapat menghapus cerita dari portal. Versi cerita, job
                generasi, dan hasil main yang terkait ikut terhapus mengikuti
                relasi database. Data kelas dan siswa belum punya tombol hapus
                di UI demo; permintaan penghapusan disampaikan lewat kanal resmi
                tim.
              </p>
              <p>
                Pengaturan audio di browser dapat dihapus sendiri lewat menu
                pengaturan peramban (Clear Browsing Data).
              </p>
            </>
          ),
        },
        {
          judul: "8. Batasan demo",
          isi: (
            <p>
              Aplikasi ini dibuat untuk kompetisi, bukan untuk operasional
              sekolah. Untuk penggunaan nyata dibutuhkan penyedia autentikasi,
              kebijakan retensi, dan persetujuan sekolah.
            </p>
          ),
        },
      ]}
    />
  );
}
