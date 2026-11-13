"use client";

import { useRef, useState } from "react";

import { savePlayResult } from "@/app/play/actions";
import { GameCanvas } from "@/components/game/GameCanvas";
import {
  ResultScreen,
  type StatusSimpanHasil,
} from "@/components/game/ResultScreen";
import { TitleScreen } from "@/components/game/TitleScreen";
import type { Story } from "@/story/schema";
import type { Answer, PlayResult } from "@/story/scoring";

type GameShellProps = {
  /** Cerita sudah tervalidasi di sisi server. */
  story: Story;
};

/** Layar yang dipegang `GameShell`; fase cerita tetap milik Phaser. */
type Layar = "judul" | "main" | "hasil";

/**
 * Shell halaman siswa (docs/05-frontend/game-player.md). Memegang state layar,
 * bukan state cerita: fase permainan dilacak `StoryRunner` di dalam Phaser.
 *
 * `GameCanvas` sengaja baru dipasang setelah "Mulai", jadi Phaser (dan memori
 * kanvasnya) tidak berjalan di belakang layar judul. Key `sesi` memaksa
 * remount saat "Main lagi" supaya cerita dimulai dari awal.
 *
 * Progres `localStorage` belum ada di sini — menyusul bersama sinkronisasi
 * `storyVersion` dengan tim backend.
 */
export function GameShell({ story }: GameShellProps) {
  const [layar, setLayar] = useState<Layar>("judul");
  const [hasil, setHasil] = useState<PlayResult | null>(null);
  const [sesi, setSesi] = useState(0);
  const [statusSimpan, setStatusSimpan] =
    useState<StatusSimpanHasil>("menyimpan");
  /** Nomor penyimpanan terakhir; mencegah hasil sesi lama menimpa status baru. */
  const simpanTerakhir = useRef(0);

  function mulai() {
    setHasil(null);
    setLayar("main");
  }

  /**
   * Cerita selesai: tampilkan hasil lebih dulu, lalu simpan di latar belakang.
   *
   * Server Action hanya menerima jawaban mentah (`answers`); skor dihitung
   * ulang di server. Kegagalan simpan tidak boleh menghalangi siswa melihat
   * hasilnya — layar hasil tetap tampil dan status simpan ditulis apa adanya.
   */
  async function selesai(result: PlayResult, answers: Answer[]) {
    setHasil(result);
    setLayar("hasil");
    setStatusSimpan("menyimpan");

    const nomor = simpanTerakhir.current + 1;
    simpanTerakhir.current = nomor;

    try {
      const outcome = await savePlayResult({
        storyId: story.meta.id,
        result: { answers },
      });
      if (simpanTerakhir.current === nomor) {
        setStatusSimpan(outcome.ok ? "tersimpan" : "gagal");
      }
    } catch {
      // Jaringan putus atau action gagal dimuat: jangan pernah menjatuhkan
      // layar hasil hanya karena penyimpanan.
      if (simpanTerakhir.current === nomor) setStatusSimpan("gagal");
    }
  }

  function mainLagi() {
    setHasil(null);
    setSesi((nilai) => nilai + 1);
    setLayar("main");
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {layar === "judul" ? (
        <TitleScreen story={story} onStart={mulai} />
      ) : (
        <GameCanvas key={sesi} story={story} onFinished={selesai} />
      )}
      {layar === "hasil" && hasil && (
        <ResultScreen
          result={hasil}
          statusSimpan={statusSimpan}
          onMainLagi={mainLagi}
        />
      )}
    </div>
  );
}
