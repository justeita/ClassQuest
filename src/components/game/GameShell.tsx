"use client";

import { useRef, useState } from "react";

import { savePlayResult } from "@/app/play/actions";
import { EntryScreen, type Pemain } from "@/components/game/EntryScreen";
import { GameCanvas } from "@/components/game/GameCanvas";
import { MainMenu } from "@/components/game/MainMenu";
import {
  ResultScreen,
  type StatusSimpanHasil,
} from "@/components/game/ResultScreen";
import { TitleScreen } from "@/components/game/TitleScreen";
import type { PlayClassroom, PlayStudent } from "@/server/contracts";
import type { Story } from "@/story/schema";
import type { Answer, PlayResult } from "@/story/scoring";

type GameShellProps = {
  /** Cerita sudah tervalidasi di sisi server. */
  story: Story;
  /**
   * Tampilkan menu utama sebelum layar judul. Dipakai `/game` sebagai pintu
   * masuk demo; `/play/[storyId]` langsung membuka layar judul cerita.
   */
  menuUtama?: boolean;
  /**
   * Kelas dari tautan `?kelas=`. Bila diisi (atau `classLinkInvalid`),
   * `GameShell` menampilkan layar masuk lebih dulu supaya guru bisa melihat
   * hasil per kelas di `/guru/analitik`.
   */
  classroom?: PlayClassroom | null;
  /** Daftar siswa kelas untuk dipilih di layar masuk. */
  students?: PlayStudent[];
  /** Query `?kelas=` ada tetapi tidak sah / bukan milik guru cerita. */
  classLinkInvalid?: boolean;
  /**
   * Wajibkan layar masuk walau tautan tanpa kelas. Dipakai bila guru ingin
   * setiap hasil punya nama.
   */
  requireIdentity?: boolean;
};

/** Layar yang dipegang `GameShell`; fase cerita tetap milik Phaser. */
type Layar = "masuk" | "menu" | "judul" | "main" | "hasil";

/**
 * Shell halaman siswa (docs/05-frontend/game-player.md). Memegang state layar,
 * bukan state cerita: fase permainan dilacak `StoryRunner` di dalam Phaser.
 *
 * `GameCanvas` sengaja baru dipasang setelah "Mulai", jadi Phaser (dan memori
 * kanvasnya) tidak berjalan di belakang layar judul. Key `sesi` memaksa
 * remount saat "Main lagi" supaya cerita dimulai dari awal.
 *
 * Identitas pemain dipegang di sini (bukan di `GameCanvas`) karena yang
 * mengirim hasil ke server adalah `selesai()`.
 *
 * Progres `localStorage` belum ada di sini — menyusul bersama sinkronisasi
 * `storyVersion` dengan tim backend.
 */
export function GameShell({
  story,
  menuUtama = false,
  classroom = null,
  students = [],
  classLinkInvalid = false,
  requireIdentity = false,
}: GameShellProps) {
  const perluMasuk =
    requireIdentity ||
    classroom !== null ||
    classLinkInvalid ||
    students.length > 0;
  const layarAwal: Layar = perluMasuk ? "masuk" : menuUtama ? "menu" : "judul";

  const [layar, setLayar] = useState<Layar>(layarAwal);
  const [pemain, setPemain] = useState<Pemain | null>(null);
  const [hasil, setHasil] = useState<PlayResult | null>(null);
  const [sesi, setSesi] = useState(0);
  const [statusSimpan, setStatusSimpan] =
    useState<StatusSimpanHasil>("menyimpan");
  /** Nomor penyimpanan terakhir; mencegah hasil sesi lama menimpa status baru. */
  const simpanTerakhir = useRef(0);

  function masuk(pilihan: Pemain) {
    setPemain(pilihan);
    setLayar(menuUtama ? "menu" : "judul");
  }

  function mulai() {
    setHasil(null);
    setLayar("main");
  }

  /**
   * Cerita selesai: tampilkan hasil lebih dulu, lalu simpan di latar belakang.
   *
   * Server Action hanya menerima jawaban mentah (`answers`) dan identitas
   * pemain pilihan layar masuk; skor dihitung ulang di server. Kegagalan simpan
   * tidak boleh menghalangi siswa melihat hasilnya — layar hasil tetap tampil
   * dan status simpan ditulis apa adanya.
   */
  async function selesai(result: PlayResult, answers: Answer[]) {
    setHasil(result);
    setLayar("hasil");
    setStatusSimpan("menyimpan");

    const nomor = simpanTerakhir.current + 1;
    simpanTerakhir.current = nomor;

    const identitas =
      pemain === null
        ? {}
        : pemain.studentId !== null
          ? { studentId: pemain.studentId }
          : { nickname: pemain.name };

    try {
      const outcome = await savePlayResult({
        storyId: story.meta.id,
        result: { ...identitas, answers },
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

  /**
   * Kembali dari permainan. `menuUtama` (`/game`) kembali ke menu utama supaya
   * siswa bisa memilih Mulai lagi tanpa memuat ulang halaman; halaman siswa
   * (`/play/[storyId]`) kembali ke layar judul cerita.
   */
  function batalMain() {
    setLayar(menuUtama ? "menu" : "judul");
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {layar === "masuk" ? (
        <EntryScreen
          story={story}
          classroom={classroom}
          students={students}
          classLinkInvalid={classLinkInvalid}
          onMasuk={masuk}
        />
      ) : layar === "menu" ? (
        <MainMenu onMulai={() => setLayar("judul")} />
      ) : layar === "judul" ? (
        <TitleScreen story={story} onStart={mulai} />
      ) : (
        <GameCanvas
          key={sesi}
          story={story}
          onFinished={selesai}
          onBatal={batalMain}
        />
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
