import type { Metadata } from "next";

import { PlayGate } from "@/components/game/PlayGate";

export const metadata: Metadata = {
  title: "Masuk dengan kode kelas — ClassQuest",
  // Pintu masuk memakai kode kelas; tidak ada isi untuk mesin pencari dan kode
  // kelas tidak boleh ikut terindeks.
  robots: { index: false, follow: false },
};

/**
 * `/play` — gerbang siswa tanpa tautan guru (docs/05-frontend/game-player.md →
 * Gerbang kode kelas, ADR 0039).
 *
 * Berbeda dari `/play/[storyId]`: route ini tidak menerima `storyId` dan tidak
 * menyentuh database sama sekali. Ia hanya memasang `PlayGate`; pencarian
 * kelas dan cerita terjadi lewat Server Action `masukKelas` setelah siswa
 * mengirim form. Dengan begitu halaman tetap statis, dan kode kelas yang salah
 * tidak pernah membuat 404 — semuanya dijawab sebagai pesan di form.
 *
 * Route ini tidak perlu dijaga `src/proxy.ts`: proxy hanya mencegat
 * `/play/:storyId`.
 */
export default function PlayGatePage() {
  return (
    // Bingkai yang sama dengan halaman siswa lain: margin tipis + `.area-game`
    // supaya HUD dan tombol sentuh tidak tertutup notch/bar sistem (globals.css).
    <main className="area-game h-dvh w-full overflow-hidden bg-[#0b120e]">
      <h1 className="sr-only">ClassQuest — masuk dengan kode kelas</h1>
      <div className="h-full w-full overflow-hidden rounded-lg bg-[#14201a] ring-1 ring-white/10 sm:rounded-xl">
        <PlayGate />
      </div>
    </main>
  );
}
