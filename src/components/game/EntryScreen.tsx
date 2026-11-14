"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import type {
  PlayClassroom,
  PlayPlayer,
  PlayStudent,
} from "@/server/contracts";
import type { Story } from "@/story/schema";

/**
 * Identitas yang dipilih sebelum cerita dimulai.
 *
 * Satu definisi dengan gerbang `/play` (`PlayPlayer` di
 * `src/server/contracts.ts`): `studentId` kosong berarti siswa mengetik nama
 * bebas (tidak ada di daftar kelas).
 */
export type Pemain = PlayPlayer;

type EntryScreenProps = {
  story: Story;
  /** Kelas dari tautan `?kelas=`; `null` bila tautan tanpa kelas / kode salah. */
  classroom: PlayClassroom | null;
  /** Daftar siswa kelas; kosong bila tidak ada kelas. */
  students: PlayStudent[];
  /** Query `?kelas=` ada tetapi tidak sah / bukan milik guru cerita ini. */
  classLinkInvalid: boolean;
  /** Dipanggil saat siswa menekan "Masuk"; cerita baru dimulai setelahnya. */
  onMasuk: (pemain: Pemain) => void;
};

/** Batas nama, sama dengan `MAX_NICKNAME_LENGTH` di server. */
const MAX_NAME_LENGTH = 40;

const rapikan = (value: string): string =>
  value.replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH);

/**
 * Layar masuk siswa (docs/05-frontend/game-player.md → Layar masuk).
 *
 * Guru membagikan tautan per kelas (`/play/[storyId]?kelas=QST-XXXX`). Siswa
 * memilih namanya dari daftar kelas itu supaya hasil main bisa masuk analytics
 * kelas tanpa akun/login. Bila namanya tidak ada di daftar (atau tautan tidak
 * membawa kelas), siswa boleh mengetik nama bebas — hasilnya tetap disimpan,
 * hanya tidak terhubung ke baris `students`.
 *
 * Nama hanya disimpan di state `GameShell`/`sessionStorage`; tidak ada cookie
 * atau identitas lain yang dikirim ke server selain `studentId`/`nickname`.
 */
export function EntryScreen({
  story,
  classroom,
  students,
  classLinkInvalid,
  onMasuk,
}: EntryScreenProps) {
  const [cari, setCari] = useState("");
  const [terpilih, setTerpilih] = useState<string | null>(null);
  const [modeBebas, setModeBebas] = useState(students.length === 0);
  const [namaBebas, setNamaBebas] = useState("");
  const cariRef = useRef<HTMLInputElement>(null);
  const namaRef = useRef<HTMLInputElement>(null);

  const idCari = useId();
  const idNama = useId();

  const siswaTersaring = useMemo(() => {
    const kata = cari.trim().toLowerCase();
    if (kata === "") return students;
    return students.filter(
      (student) =>
        student.name.toLowerCase().includes(kata) ||
        (student.nis?.toLowerCase().includes(kata) ?? false),
    );
  }, [cari, students]);

  // Fokus awal: kolom cari bila ada daftar, kalau tidak kolom nama.
  useEffect(() => {
    if (students.length > 0) cariRef.current?.focus({ preventScroll: true });
    else namaRef.current?.focus({ preventScroll: true });
  }, [students.length]);

  const siswaTerpilih =
    students.find((student) => student.id === terpilih) ?? null;

  const nama = modeBebas ? rapikan(namaBebas) : (siswaTerpilih?.name ?? "");
  const bisaMasuk = modeBebas ? nama !== "" : siswaTerpilih !== null;

  function masuk(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bisaMasuk) return;

    onMasuk(
      modeBebas
        ? { studentId: null, name: nama }
        : { studentId: siswaTerpilih!.id, name: siswaTerpilih!.name },
    );
  }

  function gantiKeBebas() {
    setModeBebas(true);
    setTerpilih(null);
    // Fokus dipindah setelah input dirender.
    queueMicrotask(() => namaRef.current?.focus({ preventScroll: true }));
  }

  function gantiKeDaftar() {
    setModeBebas(false);
    setNamaBebas("");
    queueMicrotask(() => cariRef.current?.focus({ preventScroll: true }));
  }

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-[#14201a] bg-cover bg-center"
      style={{
        backgroundImage: "url(/assets/world/map_village.jpg)",
        imageRendering: "pixelated",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-[#0b120e]/95 via-[#14201a]/90 to-[#14201a]/40" />

      <div className="relative flex h-full w-full items-center justify-center overflow-y-auto p-4 font-sans text-[#F7F4EC] sm:p-6">
        <form
          onSubmit={masuk}
          className="w-full max-w-md border-2 border-[#3D4B41] bg-[#0b120e]/85 p-5 shadow-[4px_4px_0_0_rgba(0,0,0,0.45)] sm:p-6"
        >
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#E8A87C]">
            Sebelum mulai
          </p>
          <h1 className="mt-2 text-lg leading-tight sm:text-xl">
            Siapa yang akan bermain?
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-[#D9E4DA]">
            {story.meta.title}
          </p>

          {classroom !== null ? (
            <p className="mt-3 border border-[#3D4B41] px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-[#8FA396]">
              Kelas {classroom.name} · {classroom.code}
            </p>
          ) : null}

          {classLinkInvalid ? (
            <p
              role="status"
              className="mt-3 border border-[#E8A87C]/60 bg-[#E8A87C]/10 px-2.5 py-2 text-[11px] leading-relaxed text-[#E8A87C]"
            >
              Tautan kelas tidak dikenali. Kamu tetap bisa bermain, tetapi hasil
              main tidak masuk ke analytics kelas. Minta tautan baru dari
              gurumu.
            </p>
          ) : null}

          {!modeBebas && students.length > 0 ? (
            <div className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor={idCari}
                  className="mb-1 block text-[10px] uppercase tracking-widest text-[#8FA396]"
                >
                  Cari namamu
                </label>
                <input
                  ref={cariRef}
                  id={idCari}
                  type="search"
                  value={cari}
                  onChange={(event) => setCari(event.target.value)}
                  placeholder="Ketik nama atau NIS…"
                  autoComplete="off"
                  className="w-full border-2 border-[#3D4B41] bg-[#14201a] px-3 py-2 text-xs text-[#F7F4EC] placeholder:text-[#6F7F73] focus:border-[#E8A87C] focus:outline-none"
                />
              </div>

              <fieldset>
                <legend className="sr-only">Pilih namamu</legend>
                <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
                  {siswaTersaring.map((student) => (
                    <li key={student.id}>
                      <label
                        className={`flex cursor-pointer items-center justify-between gap-2 border-2 px-3 py-2 text-xs transition-colors ${
                          terpilih === student.id
                            ? "border-[#E8A87C] bg-[#E8A87C] text-[#14201a]"
                            : "border-[#3D4B41] text-[#F7F4EC] hover:border-[#8FA396]"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <input
                            type="radio"
                            name="siswa"
                            value={student.id}
                            checked={terpilih === student.id}
                            onChange={() => setTerpilih(student.id)}
                            className="sr-only"
                          />
                          <span className="truncate font-bold">
                            {student.name}
                          </span>
                        </span>
                        {student.nis !== null ? (
                          <span
                            className={`shrink-0 text-[10px] ${
                              terpilih === student.id
                                ? "text-[#14201a]/70"
                                : "text-[#8FA396]"
                            }`}
                          >
                            {student.nis}
                          </span>
                        ) : null}
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>

              {siswaTersaring.length === 0 ? (
                <p className="text-[11px] text-[#8FA396]">
                  Nama itu tidak ada di daftar kelas.
                </p>
              ) : null}

              <button
                type="button"
                onClick={gantiKeBebas}
                className="text-[11px] text-[#8FA396] underline underline-offset-2 hover:text-[#F7F4EC]"
              >
                Nama saya tidak ada di daftar
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              <label
                htmlFor={idNama}
                className="block text-[10px] uppercase tracking-widest text-[#8FA396]"
              >
                Nama atau username
              </label>
              <input
                ref={namaRef}
                id={idNama}
                type="text"
                value={namaBebas}
                onChange={(event) => setNamaBebas(event.target.value)}
                maxLength={MAX_NAME_LENGTH}
                placeholder="Ketik namamu…"
                autoComplete="off"
                className="w-full border-2 border-[#3D4B41] bg-[#14201a] px-3 py-2 text-xs text-[#F7F4EC] placeholder:text-[#6F7F73] focus:border-[#E8A87C] focus:outline-none"
              />
              <p className="text-[10px] leading-relaxed text-[#8FA396]">
                Maksimal {MAX_NAME_LENGTH} karakter. Nama ini tampil di
                analytics kelas gurumu.
              </p>

              {students.length > 0 ? (
                <button
                  type="button"
                  onClick={gantiKeDaftar}
                  className="text-[11px] text-[#8FA396] underline underline-offset-2 hover:text-[#F7F4EC]"
                >
                  Kembali pilih dari daftar kelas
                </button>
              ) : null}
            </div>
          )}

          <button
            type="submit"
            disabled={!bisaMasuk}
            className="mt-5 w-full border-2 border-[#F7F4EC] px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-[#14201a] transition-colors enabled:bg-[#E8A87C] enabled:hover:bg-[#F7F4EC] disabled:cursor-not-allowed disabled:border-[#3D4B41] disabled:text-[#6F7F73] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C]"
          >
            Masuk ke cerita
          </button>

          <p className="mt-3 text-[10px] leading-relaxed text-[#8FA396]">
            Tidak perlu akun. Nama hanya dipakai untuk mencatat hasil main di
            kelasmu.
          </p>
        </form>
      </div>
    </div>
  );
}
