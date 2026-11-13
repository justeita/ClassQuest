import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";

/**
 * `/penafian` — batas peran AI dan skor gamifikasi.
 *
 * Klaim penting di sini: validator hanya menjaga bentuk cerita, bukan kebenaran
 * fakta. Jangan menulis "AI terjamin akurat" — itu bertentangan dengan
 * `docs/03-ai-pipeline/pipeline.md` dan alasan editor guru ada.
 */
export const metadata: Metadata = {
  title: "Penafian",
  description:
    "Batas peran AI, materi sumber, dan skor gamifikasi di Class Quest.",
};

export default function PenafianPage() {
  return (
    <LegalPage
      aktif="penafian"
      tone="siswa"
      badge="BATASAN PERAN TEKNOLOGI"
      judul="Penafian"
      ringkasan="Apa yang boleh dan tidak boleh dianggap benar dari hasil AI, cerita, dan skor permainan."
      notifikasi={{
        ikon: "fa-triangle-exclamation",
        judul: "Hasil AI wajib diperiksa guru.",
        isi: "Validator menjaga bentuk cerita dan referensi aset, bukan kebenaran isi. Guru tetap penentu terakhir sebelum cerita diberikan ke siswa.",
      }}
      bagian={[
        {
          judul: "1. AI dapat salah",
          isi: (
            <p>
              Model bahasa generatif bisa mengalami halusinasi: menambah detail
              yang tidak ada di materi, salah menyusun hubungan sebab-akibat,
              atau membuat soal dengan jawaban keliru. Validator menolak cerita
              yang bentuknya rusak, tetapi tidak bisa menilai apakah isinya
              benar secara ilmiah.
            </p>
          ),
        },
        {
          judul: "2. Materi guru adalah sumber tunggal",
          isi: (
            <>
              <p>
                AI tidak diberi kebebasan menambah fakta dari pengetahuannya
                sendiri. Kekurangan materi dicatat sebagai <code>gaps</code> di
                cerita supaya guru tahu bagian mana yang perlu dilengkapi.
              </p>
              <p>
                Bila generasi gagal, aplikasi memakai cerita cadangan agar demo
                tidak kosong. Cerita cadangan belum tentu cocok dengan materi
                yang baru diunggah, jadi periksa sebelum dipakai di kelas.
              </p>
            </>
          ),
        },
        {
          judul: "3. Skor bukan nilai resmi",
          isi: (
            <p>
              Jumlah jawaban benar, poin, dan daftar konsep lemah di layar hasil
              adalah evaluasi formatif internal. Metrik itu bukan pengganti
              rapor, ijazah, atau keputusan kelulusan, dan tidak boleh dipakai
              sebagai satu-satunya dasar penilaian.
            </p>
          ),
        },
        {
          judul: "4. Ketersediaan dan kehilangan data",
          isi: (
            <p>
              Aplikasi demo tidak menjamin ketersediaan. Progres di browser bisa
              hilang saat halaman ditutup atau penyimpanan dibersihkan, dan
              pengiriman hasil bisa gagal karena jaringan. Jangan mengandalkan
              aplikasi ini sebagai satu-satunya arsip nilai.
            </p>
          ),
        },
        {
          judul: "5. Tanggung jawab penggunaan",
          isi: (
            <p>
              Keputusan memakai cerita, soal, dan skor di kelas tetap tanggung
              jawab guru dan sekolah. Tim Class Quest tidak bertanggung jawab
              atas kerugian yang timbul dari penggunaan hasil AI yang belum
              diperiksa.
            </p>
          ),
        },
      ]}
    />
  );
}
