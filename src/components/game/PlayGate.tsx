"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";

import { masukKelas } from "@/app/play/join-actions";
import { GameShell } from "@/components/game/GameShell";
import type {
  JoinFailureReason,
  JoinGame,
  JoinNisCandidate,
  JoinOutcome,
  PlayClassroom,
  PlayPlayer,
  PlayStudent,
} from "@/server/contracts";
import type { Story } from "@/story/schema";

/** Batas NIS, sama dengan `MAX_NIS_LENGTH` di server. */
const MAX_NIS_LENGTH = 20;

/**
 * Pesan untuk setiap penolakan server. Statis, tanpa data dari input — kecuali
 * `nis_ambiguous`, yang daftar calonnya dirender terpisah (`CalonNis`).
 */
const PESAN_GALAT: Record<
  Exclude<JoinFailureReason, "nis_ambiguous">,
  string
> = {
  invalid_code:
    "Kode kelas harus berbentuk QST-XXXX, misalnya QST-7K3M. Periksa lagi dari papan tulis atau pesan gurumu.",
  not_found:
    "Kode kelas itu tidak dikenali. Periksa lagi huruf dan angkanya, atau minta kode baru dari gurumu.",
  no_games:
    "Kelas ini belum punya game yang diterbitkan. Minta gurumu menerbitkan game dulu, lalu coba lagi.",
  invalid_nis:
    "Isi NIS dulu. NIS hanya berisi huruf, angka, titik, dan strip, tanpa spasi.",
  nis_not_found:
    "NIS itu tidak ada di daftar murid gurumu. Periksa lagi nomornya, atau tanyakan NIS-mu ke guru. Kamu belum bisa masuk sebelum NIS-nya terdaftar.",
  story_not_found:
    "Game itu tidak bisa dibuka sekarang. Muat ulang halaman ini lalu coba lagi.",
  rate_limited:
    "Terlalu banyak percobaan masuk. Tunggu beberapa menit, lalu coba lagi.",
};

/** Data yang sudah lengkap untuk mulai bermain. */
type SesiMain = {
  story: Story;
  classroom: PlayClassroom;
  students: PlayStudent[];
  pemain: PlayPlayer;
};

/** Siswa yang NIS-nya cocok; ditampilkan untuk dikonfirmasi sebelum bermain. */
type Konfirmasi = {
  nis: string;
  studentId: string;
  name: string;
  story: Story;
  classroom: PlayClassroom;
  students: PlayStudent[];
};

/**
 * Gerbang siswa di `/play` — docs/05-frontend/game-player.md → Gerbang kode
 * kelas, dan ADR 0041.
 *
 * Siswa yang tidak membawa tautan guru mengetik **kode kelas** (paling atas)
 * lalu **NIS**-nya. Server mencari kelas itu, mencocokkan NIS dengan daftar
 * murid guru pemilik kelas, lalu:
 *
 * - NIS tidak ada di daftar → pesan "NIS tidak ada", siswa **tidak bisa masuk**;
 * - NIS cocok satu murid → layar konfirmasi nama lengkap ("ini kamu?");
 * - beberapa game terbit → siswa memilih game dulu, tetap setelah NIS cocok;
 * - kode salah / kelas tanpa game → pesan di bawah kolom, tanpa pindah halaman.
 *
 * Nama lengkap yang ditampilkan di konfirmasi berasal dari server (baris
 * `students`), bukan dari input siswa, lalu dipakai sebagai `pemainAwal` di
 * `GameShell` sehingga menu utama cerita guru tampil tanpa layar masuk kedua.
 *
 * Halaman ini sengaja tidak bernavigasi: kode dan NIS tidak pernah masuk URL
 * atau `sessionStorage`. Konsekuensinya refresh kembali ke kolom kode; progres
 * cerita tetap tersimpan di `localStorage` dan tombol "Lanjutkan" muncul lagi.
 */
export function PlayGate() {
  const [kode, setKode] = useState("");
  const [nis, setNis] = useState("");
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [calon, setCalon] = useState<JoinNisCandidate[] | null>(null);
  const [pilihan, setPilihan] = useState<{
    classroom: PlayClassroom;
    games: JoinGame[];
  } | null>(null);
  const [konfirmasi, setKonfirmasi] = useState<Konfirmasi | null>(null);
  const [sesi, setSesi] = useState<SesiMain | null>(null);

  const idKode = useId();
  const idNis = useId();
  const idGalat = useId();
  const kodeRef = useRef<HTMLInputElement>(null);
  const nisRef = useRef<HTMLInputElement>(null);

  function terapkan(hasil: JoinOutcome) {
    if (!hasil.ok) {
      if (hasil.reason === "nis_ambiguous") {
        setCalon(hasil.candidates);
        setGalat(null);
        return;
      }
      setCalon(null);
      setGalat(PESAN_GALAT[hasil.reason]);
      return;
    }

    setCalon(null);
    setGalat(null);

    if (hasil.jenis === "pilih") {
      setPilihan({ classroom: hasil.classroom, games: hasil.games });
      return;
    }

    setKonfirmasi({
      nis,
      studentId: hasil.pemain.studentId ?? "",
      name: hasil.pemain.name,
      story: hasil.story,
      classroom: hasil.classroom,
      students: hasil.students,
    });
  }

  async function minta(aksi: () => Promise<JoinOutcome>) {
    setMemuat(true);
    setGalat(null);
    setCalon(null);
    try {
      terapkan(await aksi());
    } catch {
      // Jaringan putus atau action gagal dimuat: jangan tampilkan error mentah.
      setGalat(
        "Tidak bisa menghubungi server. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setMemuat(false);
    }
  }

  /** NIS yang sedang dipakai: hasil pilihan calon, atau yang diketik siswa. */
  const nisAktif = konfirmasi?.nis ?? nis.trim();

  function masuk(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (memuat) return;
    const nisBersih = nis.trim();
    if (kode.trim() === "") {
      setGalat(PESAN_GALAT.invalid_code);
      kodeRef.current?.focus({ preventScroll: true });
      return;
    }
    if (nisBersih === "") {
      setGalat(PESAN_GALAT.invalid_nis);
      nisRef.current?.focus({ preventScroll: true });
      return;
    }
    void minta(() => masukKelas({ kode: kode.trim(), nis: nisBersih }));
  }

  function pilihGame(game: JoinGame) {
    if (memuat) return;
    void minta(() =>
      masukKelas({ kode: kode.trim(), nis: nisAktif, storyId: game.storyId }),
    );
  }

  /** Pilih NIS lengkap saat server menemukan beberapa murid yang mirip. */
  function pilihCalon(candidate: JoinNisCandidate) {
    if (memuat) return;
    setNis(candidate.nis);
    setCalon(null);
    // Kalau siswa sudah memilih game, pilihan itu dibawa lagi supaya ia tidak
    // diminta memilih dua kali; tanpa `storyId` server mengulang dari awal.
    const storyId =
      pilihan?.games.length === 1 ? pilihan.games[0].storyId : undefined;
    void minta(() =>
      masukKelas({
        kode: kode.trim(),
        nis: candidate.nis,
        ...(storyId === undefined ? {} : { storyId }),
      }),
    );
  }

  function mulaiMain() {
    if (konfirmasi === null) return;
    setSesi({
      story: konfirmasi.story,
      classroom: konfirmasi.classroom,
      students: konfirmasi.students,
      pemain: { studentId: konfirmasi.studentId, name: konfirmasi.name },
    });
  }

  function salahOrang() {
    setKonfirmasi(null);
    setNis("");
    queueMicrotask(() => nisRef.current?.focus({ preventScroll: true }));
  }

  function gantiKelas() {
    setSesi(null);
    setPilihan(null);
    setKonfirmasi(null);
    setGalat(null);
    setCalon(null);
    setKode("");
    setNis("");
    queueMicrotask(() => kodeRef.current?.focus({ preventScroll: true }));
  }

  if (sesi !== null) {
    return (
      <div className="relative h-full w-full overflow-hidden">
        <GameShell
          key={sesi.story.meta.id}
          story={sesi.story}
          classroom={sesi.classroom}
          students={sesi.students}
          pemainAwal={sesi.pemain}
        />
        <button
          type="button"
          onClick={gantiKelas}
          className="absolute right-3 top-3 z-40 border border-[#3D4B41] bg-[#0b120e]/90 px-2.5 py-1 text-[10px] uppercase tracking-wider text-[#8FA396] hover:border-[#E8A87C] hover:text-[#F7F4EC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C]"
        >
          Ganti kelas
        </button>
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-[#14201a] bg-cover"
      style={{
        backgroundImage: "url(/menu/desa.webp)",
        backgroundPosition: "62% center",
      }}
    >
      {/* Latar dan kabut yang sama dengan menu `/demo` (`MainMenu`), supaya
          gerbang kode kelas terasa satu keluarga dengan layar pembuka siswa.
          `map_village.jpg` sengaja tidak dipakai di sini: itu peta permainan
          (top-down), bukan ilustrasi layar pembuka. */}
      <div className="absolute inset-0 bg-[#04120b]/55" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#04120b]/75 via-transparent to-[#04120b]/40" />

      <div className="relative flex h-full w-full items-center justify-center overflow-y-auto p-4 font-sans text-[#F7F4EC] sm:p-6">
        {konfirmasi !== null ? (
          <KonfirmasiNama
            konfirmasi={konfirmasi}
            memuat={memuat}
            galat={galat}
            idGalat={idGalat}
            onMulai={mulaiMain}
            onSalahOrang={salahOrang}
          />
        ) : pilihan === null ? (
          <form
            onSubmit={masuk}
            className="w-full max-w-md border-2 border-[#3D4B41] bg-[#0b120e]/85 p-5 shadow-[4px_4px_0_0_rgba(0,0,0,0.45)] sm:p-6"
          >
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#E8A87C]">
              Sebelum mulai
            </p>
            <h1 className="mt-2 text-lg leading-tight sm:text-xl">
              Masuk dengan kode kelas
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-[#D9E4DA]">
              Minta kode kelas dari gurumu, lalu ketik NIS-mu. Kamu tidak perlu
              membuat akun.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor={idKode}
                  className="mb-1 block text-[10px] uppercase tracking-widest text-[#8FA396]"
                >
                  Kode kelas
                </label>
                <input
                  ref={kodeRef}
                  id={idKode}
                  type="text"
                  value={kode}
                  onChange={(event) => setKode(event.target.value)}
                  placeholder="QST-7K3M"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  aria-invalid={galat !== null}
                  aria-describedby={galat !== null ? idGalat : undefined}
                  className="w-full border-2 border-[#3D4B41] bg-[#14201a] px-3 py-2 font-mono text-sm tracking-[0.15em] text-[#F7F4EC] uppercase placeholder:text-[#6F7F73] focus:border-[#E8A87C] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor={idNis}
                  className="mb-1 block text-[10px] uppercase tracking-widest text-[#8FA396]"
                >
                  NIS
                </label>
                <input
                  ref={nisRef}
                  id={idNis}
                  type="text"
                  value={nis}
                  onChange={(event) => setNis(event.target.value)}
                  maxLength={MAX_NIS_LENGTH}
                  placeholder="Contoh: 1001"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  inputMode="text"
                  aria-invalid={galat !== null}
                  aria-describedby={galat !== null ? idGalat : undefined}
                  className="w-full border-2 border-[#3D4B41] bg-[#14201a] px-3 py-2 font-mono text-sm tracking-[0.15em] text-[#F7F4EC] uppercase placeholder:text-[#6F7F73] focus:border-[#E8A87C] focus:outline-none"
                />
                <p className="mt-1 text-[10px] leading-relaxed text-[#8FA396]">
                  Pakai NIS yang terdaftar di kelas gurumu. NIS yang tidak ada
                  di daftar tidak bisa masuk.
                </p>
              </div>
            </div>

            {galat !== null ? (
              <p
                id={idGalat}
                role="alert"
                className="mt-3 border border-[#E8A87C]/60 bg-[#E8A87C]/10 px-2.5 py-2 text-[11px] leading-relaxed text-[#E8A87C]"
              >
                {galat}
              </p>
            ) : null}

            {calon !== null ? (
              <div className="mt-3 border border-[#E8A87C]/60 bg-[#E8A87C]/10 px-2.5 py-2">
                <p className="text-[11px] leading-relaxed text-[#E8A87C]">
                  Ada beberapa murid dengan NIS yang mirip. Pilih NIS lengkapmu:
                </p>
                <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto pr-1">
                  {calon.map((candidate) => (
                    <li key={candidate.studentId}>
                      <button
                        type="button"
                        disabled={memuat}
                        onClick={() => pilihCalon(candidate)}
                        className="w-full border-2 border-[#3D4B41] px-2.5 py-1.5 text-left text-[11px] transition-colors hover:border-[#E8A87C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C] disabled:cursor-wait"
                      >
                        <span className="font-mono font-bold">
                          {candidate.nis}
                        </span>
                        <span className="ml-2 text-[#8FA396]">
                          {candidate.name}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={memuat}
              className="mt-5 w-full border-2 border-[#F7F4EC] px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-[#14201a] transition-colors enabled:bg-[#E8A87C] enabled:hover:bg-[#F7F4EC] disabled:cursor-wait disabled:border-[#3D4B41] disabled:text-[#6F7F73] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C]"
            >
              {memuat ? "Memeriksa NIS…" : "Masuk ke cerita"}
            </button>

            <p className="mt-3 text-[10px] leading-relaxed text-[#8FA396]">
              Punya tautan dari guru? Buka tautannya langsung — kelasmu sudah
              terbawa di tautan itu.
            </p>

            <Link
              href="/demo"
              className="mt-2 inline-block text-[11px] text-[#8FA396] underline underline-offset-2 hover:text-[#F7F4EC]"
            >
              Coba demo tanpa kode kelas
            </Link>
          </form>
        ) : (
          <div className="w-full max-w-md border-2 border-[#3D4B41] bg-[#0b120e]/85 p-5 shadow-[4px_4px_0_0_rgba(0,0,0,0.45)] sm:p-6">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#E8A87C]">
              Pilih game
            </p>
            <h2 className="mt-2 text-lg leading-tight sm:text-xl">
              {pilihan.classroom.name}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-[#D9E4DA]">
              Gurumu punya beberapa game. Pilih yang mau kamu mainkan dulu.
            </p>

            <ul className="mt-4 max-h-64 space-y-1.5 overflow-y-auto pr-1">
              {pilihan.games.map((game) => (
                <li key={game.storyId}>
                  <button
                    type="button"
                    disabled={memuat}
                    onClick={() => pilihGame(game)}
                    className="w-full border-2 border-[#3D4B41] px-3 py-2 text-left transition-colors hover:border-[#E8A87C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C] disabled:cursor-wait"
                  >
                    <span className="block text-xs font-bold">
                      {game.title}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-[#8FA396]">
                      {[game.subject, game.gradeLevel]
                        .filter((bagian) => bagian !== "")
                        .join(" · ")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {galat !== null ? (
              <p
                role="alert"
                className="mt-3 border border-[#E8A87C]/60 bg-[#E8A87C]/10 px-2.5 py-2 text-[11px] leading-relaxed text-[#E8A87C]"
              >
                {galat}
              </p>
            ) : null}

            <button
              type="button"
              onClick={gantiKelas}
              className="mt-4 text-[11px] text-[#8FA396] underline underline-offset-2 hover:text-[#F7F4EC]"
            >
              Kode kelas salah? Ketik ulang
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Konfirmasi nama lengkap                                                    */
/* -------------------------------------------------------------------------- */

type KonfirmasiNamaProps = {
  konfirmasi: Konfirmasi;
  memuat: boolean;
  galat: string | null;
  idGalat: string;
  onMulai: () => void;
  onSalahOrang: () => void;
};

/**
 * Langkah kedua gerbang: "NIS ini benar orang ini?".
 *
 * Nama lengkap di sini datang dari server (baris `students`), jadi siswa
 * melihat persis nama yang akan tercatat di analytics guru. Tombol utama
 * melanjutkan ke menu utama cerita; tombol kedua kembali ke kolom NIS supaya
 * siswa yang salah ketik tidak terjebak dengan identitas orang lain.
 */
function KonfirmasiNama({
  konfirmasi,
  memuat,
  galat,
  idGalat,
  onMulai,
  onSalahOrang,
}: KonfirmasiNamaProps) {
  return (
    <div className="w-full max-w-md border-2 border-[#3D4B41] bg-[#0b120e]/85 p-5 shadow-[4px_4px_0_0_rgba(0,0,0,0.45)] sm:p-6">
      <p className="text-[10px] uppercase tracking-[0.3em] text-[#E8A87C]">
        Konfirmasi nama
      </p>
      <h2 className="mt-2 text-lg leading-tight sm:text-xl">
        Ini kamu, benar?
      </h2>

      <dl className="mt-4 space-y-2 border-y border-[#3D4B41] py-3">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-[10px] uppercase tracking-widest text-[#8FA396]">
            Nama lengkap
          </dt>
          <dd className="text-right text-sm font-bold text-[#F7F4EC]">
            {konfirmasi.name}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-[10px] uppercase tracking-widest text-[#8FA396]">
            NIS
          </dt>
          <dd className="text-right font-mono text-sm font-bold text-[#F7F4EC]">
            {konfirmasi.nis}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-[10px] uppercase tracking-widest text-[#8FA396]">
            Kelas
          </dt>
          <dd className="text-right text-xs text-[#D9E4DA]">
            {konfirmasi.classroom.name}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-[10px] leading-relaxed text-[#8FA396]">
        Hasil mainmu akan tercatat atas nama ini di analytics guru.
      </p>

      {galat !== null ? (
        <p
          id={idGalat}
          role="alert"
          className="mt-3 border border-[#E8A87C]/60 bg-[#E8A87C]/10 px-2.5 py-2 text-[11px] leading-relaxed text-[#E8A87C]"
        >
          {galat}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onMulai}
        disabled={memuat}
        className="mt-5 w-full border-2 border-[#F7F4EC] px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-[#14201a] transition-colors enabled:bg-[#E8A87C] enabled:hover:bg-[#F7F4EC] disabled:cursor-wait disabled:border-[#3D4B41] disabled:text-[#6F7F73] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C]"
      >
        Benar, lanjut main
      </button>

      <button
        type="button"
        onClick={onSalahOrang}
        disabled={memuat}
        className="mt-2 w-full border-2 border-[#3D4B41] px-3 py-2 text-[11px] text-[#D9E4DA] transition-colors hover:border-[#E8A87C] hover:text-[#F7F4EC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C] disabled:cursor-wait"
      >
        Bukan saya — ketik NIS lain
      </button>
    </div>
  );
}
