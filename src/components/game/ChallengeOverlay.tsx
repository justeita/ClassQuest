"use client";

import { useEffect, useRef, useState } from "react";

import {
  KOTAK_DIALOG,
  KOTAK_DIALOG_AKTIF,
  KOTAK_DIALOG_FOKUS,
  KOTAK_DIALOG_HOVER,
} from "@/components/game/gayaDialog";
import type { ChallengeView } from "@/game/challengeView";
import { GAME_HEIGHT } from "@/game/constants";
import { CHALLENGE, cqw, TEXTBOX, ukuranHuruf } from "@/game/layout";
import type { Answer } from "@/story/scoring";

export type GradedView = {
  correct: boolean;
  explanation: string;
};

type ChallengeOverlayProps = {
  view: ChallengeView;
  /** Hasil penilaian dari sisi game; null selama belum dijawab. */
  graded: GradedView | null;
  /**
   * Soal sudah selesai diketik mesin tik. Pilihan jawaban, hint, dan chip
   * pintasan baru muncul setelah ini `true`, jadi siswa membaca/melihat soal
   * dulu (`GameScene` mengetik soal lewat `textbox.show`). Bila overlay tidak
   * punya dialog soal yang sedang diketik, nilainya dianggap `true`.
   */
  siap?: boolean;
  /** Kirim jawaban siswa ke sisi game untuk dinilai. */
  onSubmit: (answer: Answer) => void;
  /** Tutup overlay dan lanjutkan cerita. */
  onResolve: () => void;
};

/** Lamanya animasi keluar sebelum elemen dilepas dari DOM (ms). */
const KELUAR_MS = 180;

/**
 * Tahan elemen di DOM selama animasi keluarnya (docs/05-frontend/game-player.md
 * § Challenge). Saat `aktif` menjadi `false`, elemen diberi fase "keluar"
 * selama `durasi` ms baru dilepas, jadi pilihan jawaban/hint tidak hilang
 * mendadak ketika siswa mengirim jawaban.
 *
 * State disesuaikan saat prop berubah di fase render (pola resmi React
 * "adjusting state when a prop changes", sama seperti `DialogueBox`), bukan
 * lewat `setState` sinkron di dalam effect.
 */
function useTampilKeluar(aktif: boolean, durasi = KELUAR_MS) {
  const [tampil, setTampil] = useState(aktif);

  if (aktif && !tampil) setTampil(true);

  useEffect(() => {
    // Hanya jadwalkan pelepasan saat elemen sedang menyingkir; masuk kembali
    // membatalkan timer lewat cleanup.
    if (aktif || !tampil) return;
    const timer = window.setTimeout(() => setTampil(false), durasi);
    return () => window.clearTimeout(timer);
  }, [aktif, tampil, durasi]);

  return { tampil, keluar: tampil && !aktif };
}

/** Tipe yang punya UI jawaban sendiri; sisanya hanya punya tombol lewati. */
const BISA_DIJAWAB = new Set<ChallengeView["type"]>([
  "multiple_choice",
  "true_false",
  "ordering",
  "short_answer",
]);

/**
 * Overlay pilihan respon dialog di atas kotak dialog.
 *
 * Mengikuti estetika RPG 2D top-down (Undertale, Omori, RPG Maker) & prinsip
 * konsistensi HCI:
 * - Soal/pertanyaan berada di dalam kotak dialog NPC (DialogueBox).
 * - Yang melayang di atas kotak dialog HANYA pilihan responnya saat belum
 *   dinilai; setelah dinilai (`graded`), pilihan disembunyikan dan hanya kartu
 *   umpan balik yang tampil supaya tidak memicu scrollbar.
 * - Seluruh UI jawaban memakai **desain kotak dialog** (`KOTAK_DIALOG` di
 *   `gayaDialog.ts`): latar hijau-gelap `#0b120e`, bingkai tipis aksen oranye
 *   `#E8A87C`, sudut membulat, teks krem terang `#F7F4EC` — seragam dengan HUD
 *   dan DialogueBox (ADR 0029, ADR 0030).
 * - Penunjuk pilihan aktif adalah **tangan menunjuk (glove) pixel-art** yang
 *   digambar sendiri (`Penunjuk` di bawah), bukan glyph font, supaya tajam dan
 *   presisi di semua perangkat. Ia berada **di luar** kotak (di kiri untuk
 *   daftar, di atas untuk kartu) dengan outline gelap + bayangan abu, jadi
 *   tetap jelas di atas dunia terang maupun kotak gelap.
 * - Tombol aksi "Jawab" disejajarkan sempurna dengan kotak di atasnya dan
 *   memakai aksen oranye `#E8A87C` yang sama dengan nama di kotak dialog.
 * - Lebar seragam (fit text): bila salah satu opsi panjang, seluruh opsi dalam
 *   kolom menyesuaikan diri mengikuti lebar opsi yang paling panjang.
 * - Navigasi keyboard penuh: mendukung panah, WASD, angka 1-N, dan Enter.
 * - Hint tidak pernah terbuka sendiri: tombol "Lihat hint" di bawah pilihan
 *   jawaban membuka konfirmasi, dan hanya setelah dikonfirmasi teks hint tampil
 *   sambil menandai jawaban dengan `usedHint` (skor soal dipotong setengah).
 * - Chip pintasan keyboard duduk di **sebelah kiri** tombol hint pada baris yang
 *   sama, rata kanan, supaya petunjuk tombol dan aksi hint terbaca satu pandang.
 */
export function ChallengeOverlay({
  view,
  graded,
  siap = true,
  onSubmit,
  onResolve,
}: ChallengeOverlayProps) {
  const [pilihan, setPilihan] = useState<string | null>(null);
  const [teks, setTeks] = useState("");
  // Indeks sorotan kursor keyboard (▶) untuk daftar pilihan dialog (MC / TF).
  const [sorot, setSorot] = useState(0);
  // Indeks baris yang disorot kursor keyboard untuk pengurutan (ordering).
  const [sorotUrutan, setSorotUrutan] = useState(0);
  // Hint tersembunyi sampai siswa mengonfirmasi. Memakai hint menandai
  // jawaban dengan `usedHint`, sehingga skor soal ini dipotong setengah
  // (`scoreAnswer` di `src/story/scoring.ts`).
  const [konfirmasiHint, setKonfirmasiHint] = useState(false);
  const [hintTerbuka, setHintTerbuka] = useState(false);
  const [hintDipakai, setHintDipakai] = useState(false);

  // Urutan awal teracak (challenge-types.md): jangan tampilkan urutan benar.
  const [urutan, setUrutan] = useState<string[]>(() =>
    acakDeterministik(
      (view.items ?? []).map((item) => item.id),
      view.id,
    ),
  );

  const panelRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  // Pilihan jawaban/hint hanya tampil setelah soal selesai diketik, lalu
  // menyingkir beranimasi saat jawaban dinilai. Kartu umpan balik masuk setelah
  // penilaian tiba.
  const jawaban = useTampilKeluar(siap && !graded);
  const umpanBalik = useTampilKeluar(graded !== null);

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
    // Input isian baru ada setelah soal selesai diketik; jangan minta fokus ke
    // elemen yang belum ter-render.
    if (view.type === "short_answer" && siap) {
      inputRef.current?.focus();
    }
  }, [view.type, siap]);

  // Saat feedback aktif, langsung fokuskan kartu umpan balik agar Spasi/Enter langsung lanjut
  useEffect(() => {
    if (graded) {
      feedbackRef.current?.focus({ preventScroll: true });
    }
  }, [graded]);

  /** Jarak tepi bawah panel dari dasar ruang game = atas dialog − celah. */
  const bawahPanel = GAME_HEIGHT - (TEXTBOX.y - CHALLENGE.gapDialog);

  const bisaJawab =
    view.type === "short_answer"
      ? teks.trim().length > 0
      : view.type === "ordering"
        ? urutan.length > 0
        : pilihan !== null;

  function kirimJawabanOpsi(idOpsi: string) {
    const tandaHint = hintDipakai ? { usedHint: true } : {};
    if (view.type === "multiple_choice") {
      onSubmit({
        challengeId: view.id,
        type: "multiple_choice",
        selectedId: idOpsi,
        ...tandaHint,
      });
      return;
    }
    if (view.type === "true_false") {
      onSubmit({
        challengeId: view.id,
        type: "true_false",
        answer: idOpsi === "benar",
        ...tandaHint,
      });
    }
  }

  function kirimJawabanManual() {
    const tandaHint = hintDipakai ? { usedHint: true } : {};
    if (view.type === "multiple_choice") {
      if (pilihan === null) return;
      kirimJawabanOpsi(pilihan);
      return;
    }
    if (view.type === "true_false") {
      if (pilihan === null) return;
      kirimJawabanOpsi(pilihan);
      return;
    }
    if (view.type === "ordering") {
      if (urutan.length === 0) return;
      onSubmit({
        challengeId: view.id,
        type: "ordering",
        order: urutan,
        ...tandaHint,
      });
      return;
    }
    if (view.type === "short_answer") {
      if (teks.trim().length === 0) return;
      onSubmit({
        challengeId: view.id,
        type: "short_answer",
        text: teks,
        ...tandaHint,
      });
    }
  }

  function geser(index: number, arah: -1 | 1) {
    const tujuan = index + arah;
    if (tujuan < 0 || tujuan >= urutan.length) return;
    setUrutan((sebelum) => {
      const berikut = [...sebelum];
      [berikut[index], berikut[tujuan]] = [berikut[tujuan]!, berikut[index]!];
      return berikut;
    });
  }

  const itemById = new Map((view.items ?? []).map((item) => [item.id, item]));
  const daftarHint = view.hints ?? [];
  const opsiPilihan =
    view.type === "multiple_choice"
      ? (view.options ?? [])
      : view.type === "true_false"
        ? [
            { id: "benar", text: "Benar" },
            { id: "salah", text: "Salah" },
          ]
        : [];

  const modeLayout = tentukanLayoutOpsi(
    opsiPilihan.map((o) => ({ id: o.id, label: o.text })),
  );

  /**
   * Teks pintasan keyboard untuk tipe soal yang memilikinya. Ditampilkan di
   * sebelah kiri tombol hint supaya keduanya satu baris; `null` untuk tipe yang
   * tidak punya pintasan khusus.
   */
  const pintasanKeyboard =
    view.type === "ordering" ? (
      <>[↑/↓] Pilih &nbsp; [←/→] Geser &nbsp; [Enter] Jawab</>
    ) : view.type === "short_answer" ? (
      <>[Enter] Kirim Jawaban</>
    ) : null;

  /**
   * Navigasi keyboard ala RPG (minimalkan penggunaan mouse/touchpad):
   * - Opsi ganda / Benar-Salah:
   *   • `1`–`5`: pilih opsi dan kirim langsung
   *   • Panah / WASD: geser kursor ▶
   *   • `Enter` / `Spasi`: pilih opsi aktif & kirim
   * - Pengurutan (ordering):
   *   • `↑`/`↓` atau `W`/`S`: pilih baris item
   *   • `←`/`→` atau `A`/`D` atau `[`/`]`: geser posisi item naik/turun
   *   • `Enter`: kirim jawaban urutan
   * - Isian singkat:
   *   • Input otomatis terfokus; `Enter` langsung mengirim jawaban
   * - Selesai dinilai:
   *   • `Enter` atau `Spasi` langsung melanjutkan dialog
   */
  function tanganiOpsi(event: React.KeyboardEvent<HTMLElement>) {
    // Selama soal masih diketik, pilihan jawaban belum tampil. Jangan pernah
    // mengirim jawaban dari sini: biarkan Space/Enter diteruskan ke scene
    // supaya hanya menuntaskan ketikan dialog lebih dulu. Pilihan baru boleh
    // dipilih setelah teks soal tampil penuh (`siap`).
    if (!siap) return;

    // Tombol hint dan konfirmasinya memakai perilaku native (Enter/Spasi
    // mengklik tombol). Jangan ikut memilih/mengirim jawaban dari event yang
    // sama saat fokus berada di area hint.
    if ((event.target as HTMLElement).closest("[data-hint-ui]")) return;

    // Auto-repeat saat tombol ditahan tidak boleh memilih/mengirim berulang.
    // Satu tekanan fisik = satu aksi; untuk aksi berikutnya harus lepas & tekan.
    if (event.repeat) return;

    const targetTag = (event.target as HTMLElement).tagName;
    const isInput = targetTag === "INPUT";

    if (graded) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onResolve();
      }
      return;
    }

    if (isInput) {
      if (event.key === "Enter" && bisaJawab) {
        event.preventDefault();
        kirimJawabanManual();
      }
      return;
    }

    if (view.type === "ordering") {
      const total = urutan.length;
      if (total === 0) return;

      if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
        event.preventDefault();
        setSorotUrutan((idx) => Math.max(0, idx - 1));
        return;
      }
      if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
        event.preventDefault();
        setSorotUrutan((idx) => Math.min(total - 1, idx + 1));
        return;
      }
      if (
        event.key === "ArrowLeft" ||
        event.key === "a" ||
        event.key === "A" ||
        event.key === "[" ||
        event.key === "-"
      ) {
        event.preventDefault();
        if (sorotUrutan > 0) {
          geser(sorotUrutan, -1);
          setSorotUrutan((idx) => idx - 1);
        }
        return;
      }
      if (
        event.key === "ArrowRight" ||
        event.key === "d" ||
        event.key === "D" ||
        event.key === "]" ||
        event.key === "+" ||
        event.key === "="
      ) {
        event.preventDefault();
        if (sorotUrutan < total - 1) {
          geser(sorotUrutan, 1);
          setSorotUrutan((idx) => idx + 1);
        }
        return;
      }
      const angka = Number.parseInt(event.key, 10);
      if (angka >= 1 && angka <= total) {
        event.preventDefault();
        setSorotUrutan(angka - 1);
        return;
      }
      if (event.key === "Enter" && bisaJawab) {
        event.preventDefault();
        kirimJawabanManual();
        return;
      }
      return;
    }

    if (opsiPilihan.length === 0) {
      if (event.key === "Enter" && bisaJawab) {
        event.preventDefault();
        kirimJawabanManual();
      }
      return;
    }

    const angka = Number.parseInt(event.key, 10);
    if (angka >= 1 && angka <= opsiPilihan.length) {
      event.preventDefault();
      const opsi = opsiPilihan[angka - 1]!;
      setPilihan(opsi.id);
      setSorot(angka - 1);
      kirimJawabanOpsi(opsi.id);
      return;
    }

    if (
      event.key === "ArrowDown" ||
      event.key === "ArrowRight" ||
      event.key === "s" ||
      event.key === "S" ||
      event.key === "d" ||
      event.key === "D"
    ) {
      event.preventDefault();
      const berikut = (sorot + 1) % opsiPilihan.length;
      setSorot(berikut);
      return;
    }

    if (
      event.key === "ArrowUp" ||
      event.key === "ArrowLeft" ||
      event.key === "w" ||
      event.key === "W" ||
      event.key === "a" ||
      event.key === "A"
    ) {
      event.preventDefault();
      const berikut = (sorot - 1 + opsiPilihan.length) % opsiPilihan.length;
      setSorot(berikut);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const opsi = opsiPilihan[sorot];
      if (!opsi) return;
      setPilihan(opsi.id);
      kirimJawabanOpsi(opsi.id);
    }
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10 font-game">
      <section
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-label="Tantangan"
        aria-modal="true"
        aria-live="polite"
        aria-busy={!siap}
        onKeyDown={tanganiOpsi}
        className="challenge-panel pointer-events-auto flex flex-col font-game text-[#F7F4EC] focus-visible:outline-none"
        style={{
          // Tepi kanan panel sejajar dengan tepi kanan dialog (dialog selalu
          // center), jadi panel terlihat menempel rapi di atasnya.
          right: `calc(50% - ${cqw(TEXTBOX.width / 2)})`,
          width:
            modeLayout === "kartu" ? cqw(TEXTBOX.width) : cqw(CHALLENGE.width),
          maxWidth: "calc(100% - 32px)",
          ["--challenge-bottom" as string]: cqw(bawahPanel),
          ["--challenge-max-h" as string]: cqw(CHALLENGE.maxHeight),
        }}
      >
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-2 sm:p-3">
          {/* Judul soal untuk pembaca layar (teks soal visual ada di DialogueBox) */}
          <h2 className="sr-only">{view.prompt}</h2>

          {/* Area jawaban: opsi, tombol, hint, dan chip pintasan. Muncul
              beranimasi setelah soal selesai diketik, lalu menyingkir
              beranimasi saat jawaban dinilai supaya kartu umpan balik tampil. */}
          {jawaban.tampil && (
            <div
              className={
                jawaban.keluar
                  ? "animate-challenge-keluar"
                  : "animate-challenge-masuk"
              }
            >
              {/* Opsi pilihan respons dialog yang melayang di kanan atas dialog */}
              {view.type === "multiple_choice" && (
                <OpsiList
                  opsi={(view.options ?? []).map((option) => ({
                    id: option.id,
                    label: option.text,
                  }))}
                  mode={modeLayout}
                  pilihan={pilihan}
                  sorot={sorot}
                  onPilih={(id, index) => {
                    setPilihan(id);
                    setSorot(index);
                    kirimJawabanOpsi(id);
                  }}
                  onSorot={setSorot}
                  disabled={graded !== null}
                />
              )}

              {view.type === "true_false" && (
                <OpsiList
                  opsi={[
                    { id: "benar", label: "Benar" },
                    { id: "salah", label: "Salah" },
                  ]}
                  mode={modeLayout}
                  pilihan={pilihan}
                  sorot={sorot}
                  onPilih={(id, index) => {
                    setPilihan(id);
                    setSorot(index);
                    kirimJawabanOpsi(id);
                  }}
                  onSorot={setSorot}
                  disabled={graded !== null}
                />
              )}

              {view.type === "ordering" && (
                <div className="space-y-2">
                  {/* Kotak item dan tombol Jawab berbagi lebar pas isi (fit text),
                  lalu diratakan ke kanan supaya tepi kanannya sejajar dengan
                  dialog dan pilihan jawaban tipe lain. */}
                  <div className="flex w-full justify-end">
                    <div className="flex w-fit max-w-full flex-col gap-1.5">
                      <ol className="flex flex-col gap-1.5">
                        {urutan.map((itemId, index) => {
                          const disorot = sorotUrutan === index;
                          return (
                            <li
                              key={itemId}
                              onClick={() => setSorotUrutan(index)}
                              className="relative flex w-full items-center"
                            >
                              {/* Segitiga kursor ▶ berada di LUAR kotak di sebelah kiri */}
                              <Penunjuk aktif={disorot} kelas="mr-2" />

                              {/* Kotak item urutan memakai desain kotak dialog (ADR 0029) */}
                              <div
                                className={`flex flex-1 items-center gap-2 px-3 py-1.5 transition-colors select-none ${
                                  disorot
                                    ? KOTAK_DIALOG_AKTIF
                                    : `${KOTAK_DIALOG} ${KOTAK_DIALOG_HOVER}`
                                }`}
                                style={{
                                  fontSize: ukuranHuruf(13.5, 12, 20),
                                  lineHeight: 1.3,
                                }}
                              >
                                <span className="w-5 text-center font-bold text-[#E8A87C]">
                                  {index + 1}.
                                </span>
                                <span className="flex-1 leading-snug break-words">
                                  {itemById.get(itemId)?.text ?? itemId}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      geser(index, -1);
                                      setSorotUrutan(index - 1);
                                    }}
                                    disabled={graded !== null || index === 0}
                                    aria-label={`Naikkan "${itemById.get(itemId)?.text ?? itemId}"`}
                                    className="rounded border border-[#E8A87C]/30 bg-[#1c2a22] px-2 py-0.5 text-xs text-[#F7F4EC] hover:border-[#E8A87C]/60 hover:bg-[#24352c] disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-[#E8A87C]"
                                  >
                                    ▲
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      geser(index, 1);
                                      setSorotUrutan(index + 1);
                                    }}
                                    disabled={
                                      graded !== null ||
                                      index === urutan.length - 1
                                    }
                                    aria-label={`Turunkan "${itemById.get(itemId)?.text ?? itemId}"`}
                                    className="rounded border border-[#E8A87C]/30 bg-[#1c2a22] px-2 py-0.5 text-xs text-[#F7F4EC] hover:border-[#E8A87C]/60 hover:bg-[#24352c] disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-[#E8A87C]"
                                  >
                                    ▼
                                  </button>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ol>

                      {/* Tombol Jawab disejajarkan dengan kotak jawaban dengan spacer seimbang */}
                      <div className="flex w-full items-center">
                        <Penunjuk aktif={false} kelas="mr-2" />
                        <button
                          type="button"
                          onClick={kirimJawabanManual}
                          className="flex-1 rounded-lg border border-[#E8A87C] bg-[#0b120e]/95 py-1.5 font-bold uppercase tracking-wider text-[#E8A87C] transition-colors hover:bg-[#E8A87C] hover:text-[#0b120e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E8A87C]"
                          style={{
                            fontSize: ukuranHuruf(14, 12, 20),
                            lineHeight: 1.2,
                          }}
                        >
                          Jawab
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {view.type === "short_answer" && (
                <div className="space-y-2">
                  {/* Input dan tombol Jawab berbagi lebar pas isi (fit text),
                  lalu diratakan ke kanan supaya sejajar dengan pilihan
                  jawaban tipe lain dan tepi kanan dialog. */}
                  <div className="flex w-full justify-end">
                    <div className="flex w-fit max-w-full flex-col gap-1.5">
                      <div className="relative rounded-lg border border-[#E8A87C]/30 bg-[#0b120e]/95 focus-within:border-[#E8A87C]">
                        <Penunjuk
                          aktif
                          kelas="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"
                        />
                        <input
                          ref={inputRef}
                          autoFocus
                          id="jawaban-singkat"
                          aria-label="Tulis jawabanmu"
                          type="text"
                          size={32}
                          value={teks}
                          onChange={(event) => setTeks(event.target.value)}
                          onKeyDown={(event) => {
                            event.stopPropagation();
                            if (event.repeat) return;
                            if (event.key === "Enter" && bisaJawab) {
                              event.preventDefault();
                              kirimJawabanManual();
                            }
                          }}
                          disabled={graded !== null}
                          autoComplete="off"
                          maxLength={60}
                          placeholder="Ketik jawaban lalu tekan Enter..."
                          className="w-full bg-transparent py-2 pl-9 pr-3 text-[#F7F4EC] placeholder:text-[#7C8A80] focus:outline-none disabled:opacity-60"
                          style={{
                            fontSize: ukuranHuruf(13.5, 12, 20),
                            lineHeight: 1.3,
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={kirimJawabanManual}
                        disabled={!bisaJawab}
                        className="w-full rounded-lg border border-[#E8A87C] bg-[#0b120e]/95 py-1.5 font-bold uppercase tracking-wider text-[#E8A87C] transition-colors hover:bg-[#E8A87C] hover:text-[#0b120e] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E8A87C]"
                        style={{
                          fontSize: ukuranHuruf(14, 12, 20),
                          lineHeight: 1.2,
                        }}
                      >
                        Jawab
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!BISA_DIJAWAB.has(view.type) && (
                <button
                  type="button"
                  onClick={onResolve}
                  className="w-full rounded-lg border border-[#E8A87C]/25 bg-[#0b120e]/95 py-2 text-xs text-[#8FA396] transition-colors hover:border-[#E8A87C]/50 hover:text-[#F7F4EC]"
                >
                  Lewati (tipe soal belum didukung)
                </button>
              )}

              {/* Baris bawah: chip pintasan keyboard di sebelah kiri tombol hint,
                  keduanya rata kanan. Hint sengaja tersembunyi sampai siswa
                  mengonfirmasi; memakai hint menandai jawaban dengan `usedHint`,
                  jadi skor soal ini dipotong setengah (`scoreAnswer`). */}
              {(pintasanKeyboard !== null || daftarHint.length > 0) && (
                <div
                  data-hint-ui
                  className="mt-2 flex flex-col items-end gap-1.5"
                >
                  <div className="flex w-full flex-wrap items-center justify-end gap-2">
                    {pintasanKeyboard !== null && (
                      <p
                        className="inline-flex items-center gap-1.5 rounded-md border border-[#E8A87C]/25 bg-[#0b120e]/95 px-3 py-1 font-medium text-[#F7F4EC]"
                        style={{
                          fontSize: ukuranHuruf(12, 11, 15),
                          lineHeight: 1.2,
                        }}
                      >
                        {pintasanKeyboard}
                      </p>
                    )}

                    {daftarHint.length > 0 &&
                      !hintTerbuka &&
                      !konfirmasiHint && (
                        <button
                          type="button"
                          onClick={() => setKonfirmasiHint(true)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-[#E8A87C]/40 bg-[#0b120e]/95 px-2.5 py-1 font-medium text-[#E8A87C] transition-colors hover:border-[#E8A87C] hover:bg-[#1c2a22] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E8A87C]"
                          style={{
                            fontSize: ukuranHuruf(12, 11, 15),
                            lineHeight: 1.2,
                          }}
                        >
                          <span aria-hidden="true">💡</span>
                          <span>Lihat hint</span>
                          <span className="text-[#8FA396]">
                            (poin dipotong)
                          </span>
                        </button>
                      )}
                  </div>

                  {daftarHint.length > 0 && konfirmasiHint && !hintTerbuka && (
                    <div
                      role="group"
                      aria-label="Konfirmasi hint"
                      className="w-full animate-challenge-masuk rounded-lg border-2 border-[#C9A227] bg-[#0b120e]/95 p-2.5 text-[#F7F4EC]"
                    >
                      <p
                        style={{
                          fontSize: ukuranHuruf(12, 11, 15),
                          lineHeight: 1.3,
                        }}
                      >
                        Pakai hint? Poin soal ini akan berkurang setengah.
                      </p>
                      <div className="mt-2 flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setKonfirmasiHint(false)}
                          className="rounded-md border border-[#3D4B41] px-2.5 py-1 text-[#D9E4DA] transition-colors hover:border-[#8FA396] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E8A87C]"
                          style={{
                            fontSize: ukuranHuruf(12, 11, 15),
                            lineHeight: 1.2,
                          }}
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setHintTerbuka(true);
                            setKonfirmasiHint(false);
                            setHintDipakai(true);
                            // Kembalikan fokus ke panel: tulisan hint tidak
                            // menahan fokus, jadi pintasan angka/panah tetap jalan.
                            panelRef.current?.focus({ preventScroll: true });
                          }}
                          className="rounded-md border border-[#E8A87C] bg-[#E8A87C] px-2.5 py-1 font-bold text-[#0b120e] transition-colors hover:bg-[#f0bd97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E8A87C]"
                          style={{
                            fontSize: ukuranHuruf(12, 11, 15),
                            lineHeight: 1.2,
                          }}
                        >
                          Tampilkan hint
                        </button>
                      </div>
                    </div>
                  )}

                  {daftarHint.length > 0 && hintTerbuka && (
                    <div
                      aria-live="polite"
                      className="w-full animate-challenge-masuk rounded-md border border-[#E8A87C]/25 bg-[#0b120e]/95 px-2.5 py-1.5 text-[#F7F4EC]"
                    >
                      <p
                        className="flex items-start gap-1.5"
                        style={{
                          fontSize: ukuranHuruf(12, 11, 15),
                          lineHeight: 1.3,
                        }}
                      >
                        <span aria-hidden="true">💡</span>
                        <span>{daftarHint.join(" ")}</span>
                      </p>
                      <p
                        className="mt-1 text-[#C9A227]"
                        style={{
                          fontSize: ukuranHuruf(11.5, 10.5, 14),
                          lineHeight: 1.2,
                        }}
                      >
                        Poin soal ini dipotong setengah karena hint dipakai.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Kartu umpan balik cerita — menggantikan box jawaban setelah dinilai agar tidak memicu scrollbar */}
          {graded && umpanBalik.tampil && (
            <div
              ref={feedbackRef}
              onClick={onResolve}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.repeat) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  // Hentikan gelembung ke handler panel: satu tekanan cukup
                  // sekali resolve, bukan dua kali.
                  event.stopPropagation();
                  onResolve();
                }
              }}
              aria-label="Lanjut"
              className={`cursor-pointer rounded-lg border-2 bg-[#0b120e]/95 p-3.5 text-[#F7F4EC] transition-colors ${
                umpanBalik.keluar
                  ? "animate-challenge-keluar"
                  : "animate-challenge-masuk"
              } ${graded.correct ? "border-[#6F9B7A]" : "border-[#C9A227]"}`}
            >
              <p
                className={`mb-1.5 flex items-center gap-1.5 font-bold ${
                  graded.correct ? "text-[#6F9B7A]" : "text-[#C9A227]"
                }`}
                style={{
                  fontSize: ukuranHuruf(14, 12, 21),
                  lineHeight: 1.3,
                }}
              >
                <span>✦</span>
                <span>{graded.correct ? "Tepat." : "Belum tepat."}</span>
              </p>
              <p
                className="break-words whitespace-pre-wrap leading-relaxed text-[#F7F4EC]"
                style={{
                  fontSize: ukuranHuruf(13.5, 12, 20),
                  lineHeight: 1.3,
                }}
              >
                {graded.explanation}
              </p>
              <div className="mt-2.5 flex items-center justify-end gap-1 text-[11px] text-[#E8A87C]">
                <span className="animate-pulse">
                  Klik atau tekan Spasi untuk lanjut
                </span>
                <span aria-hidden="true" className="animate-pulse">
                  ▼
                </span>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/**
 * Tentukan mode layout:
 * - "baris": 1 baris horizontal jika opsi pendek (Foto 3)
 * - "kolom": bertumpuk vertikal jika teks normal/panjang (Foto 2)
 * - "kartu": kartu berjejer jika matriks/matematika (Foto 1)
 */
function tentukanLayoutOpsi(
  opsi: { id: string; label: string }[],
): "baris" | "kolom" | "kartu" {
  if (opsi.length === 0) return "kolom";
  const adaMatriks = opsi.some(
    (o) =>
      o.label.includes("\n") ||
      o.label.includes("\\") ||
      o.label.includes("matrix") ||
      o.label.includes("="),
  );
  if (adaMatriks) return "kartu";

  const semuaPendek = opsi.every((o) => o.label.trim().length <= 6);
  if (semuaPendek && opsi.length <= 4) return "baris";

  return "kolom";
}

/**
 * Acak berbasis benih tetap: soal yang sama selalu tampil dalam urutan sama.
 */
export function acakDeterministik(ids: string[], seed: string): string[] {
  let state = 2166136261;
  for (const karakter of seed) {
    state ^= karakter.codePointAt(0) ?? 0;
    state = Math.imul(state, 16777619) >>> 0;
  }

  const hasil = [...ids];
  for (let i = hasil.length - 1; i > 0; i -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [hasil[i], hasil[j]] = [hasil[j]!, hasil[i]!];
  }
  return hasil;
}

/**
 * Bentuk sarung tangan penunjuk dalam peta piksel, satu karakter = satu piksel.
 *
 * `w` telapak krem, `a` bayangan abu (pergelangan + tepi bawah), `.` kosong.
 * Gambar menghadap ke kanan: jari telunjuk di kanan, manset di kiri. Outline
 * dibuat otomatis dari bentuknya supaya garis tepi selalu rapi satu piksel.
 */
const BENTUK_GLOVE = [
  "..................",
  "..................",
  "......wwww........",
  "......wwww........",
  "...wwwwwwww.......",
  "...wwwwwwwwwwwwww.",
  ".gggwwwwwwwwwwwww.",
  ".gggwwwwwwwgggggg.",
  ".gggwwwwwwg.......",
  ".gggwwwwwwg.......",
  ".gggwwwwwwg.......",
  ".gggwwwwwwg.......",
  ".gggwwwwwwg.......",
  "....gggggg........",
  "..................",
  "..................",
] as const;

/** Peta kontur: sel kosong yang bersentuhan (8 arah) dengan bentuk glove. */
function petaKontur(bentuk: readonly string[]): string[] {
  const lebar = Math.max(...bentuk.map((baris) => baris.length));
  const adaIsi = (x: number, y: number) =>
    y >= 0 &&
    y < bentuk.length &&
    x >= 0 &&
    x < lebar &&
    (bentuk[y]?.[x] ?? ".") !== ".";

  return bentuk.map((_, y) =>
    Array.from({ length: lebar }, (_, x) => {
      if (adaIsi(x, y)) return ".";
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (adaIsi(x + dx, y + dy)) return "#";
        }
      }
      return ".";
    }).join(""),
  );
}

/**
 * Rangkaian subpath `M x y h lebar v1 H x Z` — satu kotak piksel per rentetan
 * sel berurutan, jadi tiap warna cukup satu `<path>` ringkas.
 */
function jalurPiksel(
  peta: readonly string[],
  cocok: (sel: string) => boolean,
): string {
  const bagian: string[] = [];
  peta.forEach((baris, y) => {
    let x = 0;
    while (x < baris.length) {
      if (!cocok(baris[x] ?? ".")) {
        x += 1;
        continue;
      }
      const mulai = x;
      while (x < baris.length && cocok(baris[x] ?? ".")) x += 1;
      bagian.push(`M${mulai} ${y}h${x - mulai}v1H${mulai}Z`);
    }
  });
  return bagian.join("");
}

const GLOVE_LEBAR = 18;
const GLOVE_TINGGI = 16;
const GLOVE_KONTUR = jalurPiksel(
  petaKontur(BENTUK_GLOVE),
  (sel) => sel === "#",
);
const GLOVE_KREM = jalurPiksel(BENTUK_GLOVE, (sel) => sel === "w");
const GLOVE_ABU = jalurPiksel(BENTUK_GLOVE, (sel) => sel === "a");

/**
 * Tangan menunjuk (glove) pixel-art sebagai penunjuk pilihan aktif.
 *
 * Digambar sendiri sebagai **SVG piksel** — bukan glyph font atau emoji —
 * supaya bentuknya tajam di semua perangkat: telapak krem, outline gelap
 * `#0b120e`, dan bayangan abu di pergelangan serta tepi bawah. Ukurannya
 * dibatasi `clamp(15px, …, 22px)` mengikuti lebar kanvas: cukup besar untuk
 * terbaca, tetap muat di margin panel tanpa menabrak kotak pilihan. Saat tidak
 * aktif ia tetap memakan ruang (`opacity-0`) supaya tata letak tidak bergeser.
 *
 * `arah="bawah"` memutar tangan 90° untuk kartu jawaban yang penunjuknya duduk
 * di atas kotaknya.
 */
function Penunjuk({
  aktif,
  arah = "kanan",
  kelas = "",
}: {
  aktif: boolean;
  arah?: "kanan" | "bawah";
  /** Kelas tata letak tambahan, mis. `mr-2`, `mb-1.5`, atau penempatan absolut. */
  kelas?: string;
}) {
  return (
    <span
      aria-hidden="true"
      data-penunjuk={aktif ? "aktif" : "diam"}
      className={`inline-flex shrink-0 select-none items-center justify-center transition-opacity ${
        aktif ? "opacity-100" : "opacity-0"
      } ${kelas}`}
      style={{
        // Batas 22 px menjaga glove tetap di dalam padding panel; tanpa batas
        // atas, `cqw` bisa membesar sampai melewati margin kotak pilihan.
        width: `clamp(15px, ${cqw(18)}, 22px)`,
        aspectRatio: `${GLOVE_LEBAR} / ${GLOVE_TINGGI}`,
        filter: "drop-shadow(0 1px 0 rgba(11, 18, 14, 0.85))",
        transform: arah === "bawah" ? "rotate(90deg)" : undefined,
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${GLOVE_LEBAR} ${GLOVE_TINGGI}`}
        fill="none"
        shapeRendering="crispEdges"
        aria-hidden="true"
        focusable="false"
      >
        <path d={GLOVE_KONTUR} fill="#0b120e" />
        <path d={GLOVE_KREM} fill="#F7F4EC" />
        <path d={GLOVE_ABU} fill="#BFB9AA" />
      </svg>
    </span>
  );
}

type OpsiListProps = {
  opsi: { id: string; label: string }[];
  mode: "baris" | "kolom" | "kartu";
  pilihan: string | null;
  /** Indeks yang sedang disorot kursor keyboard (▶). */
  sorot: number;
  onPilih: (id: string, index: number) => void;
  onSorot: (index: number) => void;
  disabled: boolean;
};

/**
 * Komponen daftar opsi dengan:
 * - Penunjuk pilihan aktif (tangan menunjuk SVG) di LUAR kotak — kiri untuk
 *   daftar, atas untuk kartu — lewat komponen `Penunjuk` supaya tajam.
 * - Desain kotak memakai token kotak dialog (`KOTAK_DIALOG*` di `gayaDialog.ts`):
 *   latar hijau-gelap `#0b120e`, bingkai tipis aksen oranye `#E8A87C`, teks krem
 *   `#F7F4EC`.
 *   Keadaan terpilih dan keadaan diam dipilih dengan percabangan, bukan ditumpuk,
 *   supaya tidak ada kelas warna Tailwind yang bentrok.
 * - Ukuran huruf proporsional dan nyaman dibaca (`ukuranHuruf(13.5, 12, 20)`).
 * - Lebar seragam (fit text): seluruh opsi dalam kolom melebar mengikuti opsi terpanjang.
 */
function OpsiList({
  opsi,
  mode,
  pilihan,
  sorot,
  onPilih,
  onSorot,
  disabled,
}: OpsiListProps) {
  // Mode kolom: dibungkus w-full items-end dengan list w-fit items-stretch
  // agar semua box memiliki lebar yang sama persis mengikuti opsi terpanjang.
  if (mode === "kolom") {
    return (
      <div className="flex w-full flex-col items-end">
        <ul className="inline-flex w-fit max-w-full flex-col items-stretch gap-2 font-game">
          {opsi.map((option, index) => {
            const terpilih = pilihan === option.id;
            const disorot = sorot === index;

            return (
              <li key={option.id} className="relative flex w-full items-center">
                {/* Penunjuk pilihan aktif di luar kotak sebelah kiri */}
                <Penunjuk aktif={terpilih || disorot} kelas="mr-2" />

                <button
                  type="button"
                  onClick={() => onPilih(option.id, index)}
                  onMouseEnter={() => !disabled && onSorot(index)}
                  disabled={disabled}
                  aria-pressed={terpilih}
                  className={`group flex w-full flex-1 items-center justify-start px-4 py-2 text-left font-medium transition-colors select-none disabled:cursor-default ${KOTAK_DIALOG_FOKUS} ${
                    terpilih || disorot
                      ? KOTAK_DIALOG_AKTIF
                      : `${KOTAK_DIALOG} ${KOTAK_DIALOG_HOVER}`
                  }`}
                  style={{
                    fontSize: ukuranHuruf(13.5, 12, 20),
                    lineHeight: 1.3,
                  }}
                >
                  <span className="sr-only">{index + 1}. </span>
                  <span className="leading-snug break-words">
                    {option.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  // Mode baris: horizontal row untuk jawaban pendek
  if (mode === "baris") {
    return (
      <ul className="flex w-full flex-row flex-wrap items-center justify-end gap-3 font-game">
        {opsi.map((option, index) => {
          const terpilih = pilihan === option.id;
          const disorot = sorot === index;

          return (
            <li key={option.id} className="relative flex items-center">
              <Penunjuk aktif={terpilih || disorot} kelas="mr-2" />

              <button
                type="button"
                onClick={() => onPilih(option.id, index)}
                onMouseEnter={() => !disabled && onSorot(index)}
                disabled={disabled}
                aria-pressed={terpilih}
                className={`group flex min-w-[3.5rem] items-center justify-center px-4 py-1.5 text-center font-semibold transition-colors select-none disabled:cursor-default ${KOTAK_DIALOG_FOKUS} ${
                  terpilih || disorot
                    ? KOTAK_DIALOG_AKTIF
                    : `${KOTAK_DIALOG} ${KOTAK_DIALOG_HOVER}`
                }`}
                style={{
                  fontSize: ukuranHuruf(13.5, 12, 20),
                  lineHeight: 1.3,
                }}
              >
                <span className="sr-only">{index + 1}. </span>
                <span className="leading-snug">{option.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  // Mode kartu: grid untuk rumus matematika / matriks
  return (
    <ul className="grid w-full grid-cols-3 gap-3 font-game">
      {opsi.map((option, index) => {
        const terpilih = pilihan === option.id;
        const disorot = sorot === index;

        return (
          <li key={option.id} className="relative flex flex-col items-center">
            <Penunjuk aktif={terpilih || disorot} arah="bawah" kelas="mb-1.5" />

            <button
              type="button"
              onClick={() => onPilih(option.id, index)}
              onMouseEnter={() => !disabled && onSorot(index)}
              disabled={disabled}
              aria-pressed={terpilih}
              className={`group flex min-h-[5.5rem] w-full items-center justify-center p-3 text-center transition-colors select-none disabled:cursor-default ${KOTAK_DIALOG_FOKUS} ${
                terpilih || disorot
                  ? KOTAK_DIALOG_AKTIF
                  : `${KOTAK_DIALOG} ${KOTAK_DIALOG_HOVER}`
              }`}
              style={{
                fontSize: ukuranHuruf(13.5, 12, 20),
                lineHeight: 1.3,
              }}
            >
              <span className="sr-only">{index + 1}. </span>
              <span className="leading-snug">{option.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
