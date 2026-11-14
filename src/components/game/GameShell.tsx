"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { savePlayResult } from "@/app/play/actions";
import { EntryScreen, type Pemain } from "@/components/game/EntryScreen";
import { GameCanvas } from "@/components/game/GameCanvas";
import { MainMenu } from "@/components/game/MainMenu";
import {
  ResultScreen,
  type StatusSimpanHasil,
} from "@/components/game/ResultScreen";
import { bacaProgres, hapusProgres } from "@/game/progress";
import {
  bacaKursorProgres,
  kabariProgres,
  langgananProgres,
} from "@/game/progressStore";
import type { PlayClassroom, PlayStudent } from "@/server/contracts";
import type { Story } from "@/story/schema";
import type { Answer, PlayResult } from "@/story/scoring";

type GameShellProps = {
  /** Cerita sudah tervalidasi di sisi server. */
  story: Story;
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
  /**
   * Identitas yang sudah dikonfirmasi sebelum shell dipasang.
   *
   * Dipakai gerbang `/play`: siswa sudah mengetik kode kelas + NIS dan
   * mengonfirmasi nama lengkapnya, jadi
   * `EntryScreen` dilewati dan menu utama langsung tampil. Bila kosong
   * (jalur tautan guru), layar masuk tetap berjalan seperti biasa.
   */
  pemainAwal?: Pemain | null;
};

/** Layar yang dipegang `GameShell`; fase cerita tetap milik Phaser. */
type Layar = "masuk" | "menu" | "main" | "hasil";

/**
 * Shell halaman siswa (docs/05-frontend/game-player.md). Memegang state layar,
 * bukan state cerita: fase permainan dilacak `StoryRunner` di dalam Phaser.
 *
 * `pemainAwal` dipakai gerbang `/play`: identitas sudah dipilih di luar shell,
 * jadi menu utama langsung tampil dan `EntryScreen` tidak pernah dipasang.
 *
 * `GameCanvas` sengaja baru dipasang setelah "Mulai", jadi Phaser (dan memori
 * kanvasnya) tidak berjalan di belakang menu. Key `sesi` memaksa remount saat
 * "Main lagi" supaya cerita dimulai dari awal.
 *
 * Identitas pemain dipegang di sini (bukan di `GameCanvas`) karena yang
 * mengirim hasil ke server adalah `selesai()`.
 *
 * Progres `localStorage` (`src/game/progress.ts`) dibaca di sini: siswa yang
 * me-refresh di tengah permainan kembali ke layar masuk/menu dengan tombol
 * "Lanjutkan", bukan ke awal cerita. Nilainya datang dari
 * `useSyncExternalStore` (`src/game/progressStore.ts`) supaya snapshot server
 * (`null`) dan render klien pertama sama; kursor itu lalu diberikan ke
 * `GameCanvas` sebagai `mulaiDari`, sedangkan sesi baru mengirim `null`.
 *
 * Satu menu untuk semua route: `MainMenu` yang sama dipakai `/demo` (demo) dan
 * `/play/[storyId]` (tautan guru), jadi tampilan sebelum mulai selalu sinkron.
 */
export function GameShell({
  story,
  classroom = null,
  students = [],
  classLinkInvalid = false,
  requireIdentity = false,
  pemainAwal = null,
}: GameShellProps) {
  const perluMasuk =
    pemainAwal === null &&
    (requireIdentity ||
      classroom !== null ||
      classLinkInvalid ||
      students.length > 0);
  const layarAwal: Layar = perluMasuk ? "masuk" : "menu";

  const [layar, setLayar] = useState<Layar>(layarAwal);
  const [pemain, setPemain] = useState<Pemain | null>(pemainAwal);
  const [hasil, setHasil] = useState<PlayResult | null>(null);
  const [sesi, setSesi] = useState(0);
  const [statusSimpan, setStatusSimpan] =
    useState<StatusSimpanHasil>("menyimpan");
  /**
   * Progres tersimpan yang bisa dilanjutkan; `null` = mulai dari awal.
   * `getServerSnapshot` sengaja `null` agar HTML server dan render klien
   * pertama identik — React membacanya lagi setelah hydration.
   */
  const lanjutan = useSyncExternalStore(
    langgananProgres,
    () => bacaKursorProgres(story),
    () => null,
  );
  /** Nomor penyimpanan terakhir; mencegah hasil sesi lama menimpa status baru. */
  const simpanTerakhir = useRef(0);

  const storage = useCallback(
    () => (typeof window === "undefined" ? null : window.localStorage),
    [],
  );

  /**
   * Buang simpanan yang tidak bisa dipakai (JSON rusak atau cerita sudah
   * disunting). Ini sinkronisasi dengan sistem luar, bukan state React:
   * `bacaKursorProgres()` sudah mengembalikan `null` untuk kasus itu.
   */
  useEffect(() => {
    if (bacaProgres(storage(), story).status === "kedaluwarsa") {
      hapusProgres(storage(), story.meta.id);
    }
  }, [storage, story]);

  function masuk(pilihan: Pemain) {
    setPemain(pilihan);
    setLayar("menu");
  }

  /**
   * Mulai dari awal. Progres lama dihapus supaya refresh berikutnya tidak
   * menawarkan "Lanjutkan" ke cerita yang sudah ditinggalkan.
   */
  function mulai() {
    hapusProgres(storage(), story.meta.id);
    kabariProgres();
    setHasil(null);
    setSesi((nilai) => nilai + 1);
    setLayar("main");
  }

  /** Lanjutkan progres tersimpan: kursor dikirim ke `GameCanvas`. */
  function lanjutkan() {
    setHasil(null);
    setSesi((nilai) => nilai + 1);
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

    // Cerita sudah tamat: tidak ada yang bisa dilanjutkan. Progres dibuang
    // sebelum menunggu jaringan supaya refresh di layar hasil tidak
    // menawarkan "Lanjutkan" ke cerita yang sudah selesai.
    hapusProgres(storage(), story.meta.id);
    kabariProgres();

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
    // Hasil sudah tampil; "Main lagi" selalu mulai dari awal.
    hapusProgres(storage(), story.meta.id);
    kabariProgres();
    setHasil(null);
    setSesi((nilai) => nilai + 1);
    setLayar("main");
  }

  /**
   * Kembali dari permainan: kembali ke menu utama supaya siswa bisa memilih
   * Mulai lagi tanpa memuat ulang halaman, baik di `/demo` maupun
   * `/play/[storyId]`.
   *
   * Progres dibaca ulang lewat notifikasi store: `GameCanvas` menyimpannya tiap
   * beat berubah, jadi menu bisa langsung menawarkan "Lanjutkan" dari titik
   * terakhir.
   */
  function batalMain() {
    kabariProgres();
    setLayar("menu");
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
        <MainMenu
          onMulai={mulai}
          adaProgres={lanjutan !== null}
          onLanjut={lanjutkan}
        />
      ) : (
        <GameCanvas
          key={sesi}
          story={story}
          mulaiDari={lanjutan}
          onFinished={selesai}
          onBatal={batalMain}
          aktif={layar === "main"}
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
