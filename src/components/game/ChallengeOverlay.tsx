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
  /** Kirim jawaban siswa ke sisi game untuk dinilai. */
  onSubmit: (answer: Answer) => void;
  /** Tutup overlay dan lanjutkan cerita. */
  onResolve: () => void;
};

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
 * - Penunjuk pilihan aktif adalah **tangan menunjuk (glove) SVG** yang digambar
 *   sendiri (`Penunjuk` di bawah), bukan glyph font, supaya tajam dan presisi
 *   di semua perangkat. Ia berada **di luar** kotak (di kiri untuk daftar, di
 *   atas untuk kartu) dengan outline gelap + manset oranye, jadi tetap jelas di
 *   atas dunia terang maupun kotak gelap.
 * - Tombol aksi "Jawab" disejajarkan sempurna dengan kotak di atasnya dan
 *   memakai aksen oranye `#E8A87C` yang sama dengan nama di kotak dialog.
 * - Lebar seragam (fit text): bila salah satu opsi panjang, seluruh opsi dalam
 *   kolom menyesuaikan diri mengikuti lebar opsi yang paling panjang.
 * - Navigasi keyboard penuh: mendukung panah, WASD, angka 1-N, dan Enter.
 */
export function ChallengeOverlay({
  view,
  graded,
  onSubmit,
  onResolve,
}: ChallengeOverlayProps) {
  const [pilihan, setPilihan] = useState<string | null>(null);
  const [teks, setTeks] = useState("");
  // Indeks sorotan kursor keyboard (▶) untuk daftar pilihan dialog (MC / TF).
  const [sorot, setSorot] = useState(0);
  // Indeks baris yang disorot kursor keyboard untuk pengurutan (ordering).
  const [sorotUrutan, setSorotUrutan] = useState(0);

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

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
    if (view.type === "short_answer") {
      inputRef.current?.focus();
    }
  }, [view.type]);

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
    if (view.type === "multiple_choice") {
      onSubmit({
        challengeId: view.id,
        type: "multiple_choice",
        selectedId: idOpsi,
      });
      return;
    }
    if (view.type === "true_false") {
      onSubmit({
        challengeId: view.id,
        type: "true_false",
        answer: idOpsi === "benar",
      });
    }
  }

  function kirimJawabanManual() {
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
      onSubmit({ challengeId: view.id, type: "ordering", order: urutan });
      return;
    }
    if (view.type === "short_answer") {
      if (teks.trim().length === 0) return;
      onSubmit({
        challengeId: view.id,
        type: "short_answer",
        text: teks,
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

          {!graded && view.hints && view.hints.length > 0 && (
            <div className="mb-2 flex justify-end">
              <p
                className="inline-flex items-center gap-1.5 rounded-md border border-[#E8A87C]/25 bg-[#0b120e]/95 px-2.5 py-1 font-medium text-[#F7F4EC]"
                style={{
                  fontSize: ukuranHuruf(12, 11, 15),
                  lineHeight: 1.2,
                }}
              >
                <span>💡</span>
                {view.hints.map((hint) => (
                  <span key={hint}>{hint}</span>
                ))}
              </p>
            </div>
          )}

          {/* Opsi pilihan respons dialog yang melayang di kanan atas dialog — hanya sebelum dijawab */}
          {!graded && view.type === "multiple_choice" && (
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

          {!graded && view.type === "true_false" && (
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

          {!graded && view.type === "ordering" && (
            <div className="space-y-2">
              {/* Kotak item dan tombol Jawab berbagi lebar pas isi (fit text). */}
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
                                graded !== null || index === urutan.length - 1
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

              {/* Teks petunjuk berlatar navy dengan font terang agar selalu kontras;
                  ditaruh di luar grup agar tidak menentukan lebar kotak. */}
              <div className="flex w-full items-center justify-center pt-0.5">
                <p
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#E8A87C]/25 bg-[#0b120e]/95 px-3 py-1 font-medium text-[#F7F4EC]"
                  style={{
                    fontSize: ukuranHuruf(12, 11, 15),
                    lineHeight: 1.2,
                  }}
                >
                  [↑/↓] Pilih &nbsp; [←/→] Geser &nbsp; [Enter] Jawab
                </p>
              </div>
            </div>
          )}

          {!graded && view.type === "short_answer" && (
            <div className="space-y-2">
              {/* Input dan tombol Jawab berbagi lebar pas isi (fit text). */}
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
                      if (event.key === "Enter" && bisaJawab) {
                        event.preventDefault();
                        kirimJawabanManual();
                      }
                    }}
                    disabled={graded !== null}
                    autoComplete="off"
                    maxLength={60}
                    placeholder="Ketik jawaban lalu tekan Enter..."
                    className="w-full bg-transparent py-2 pl-7 pr-3 text-[#F7F4EC] placeholder:text-[#7C8A80] focus:outline-none disabled:opacity-60"
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

              {/* Teks petunjuk berlatar navy dengan font terang agar selalu kontras;
                  ditaruh di luar grup agar tidak menentukan lebar kotak. */}
              <div className="flex w-full items-center justify-center pt-0.5">
                <p
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#E8A87C]/25 bg-[#0b120e]/95 px-3 py-1 font-medium text-[#F7F4EC]"
                  style={{
                    fontSize: ukuranHuruf(12, 11, 15),
                    lineHeight: 1.2,
                  }}
                >
                  [Enter] Kirim Jawaban
                </p>
              </div>
            </div>
          )}

          {!graded && !BISA_DIJAWAB.has(view.type) && (
            <button
              type="button"
              onClick={onResolve}
              className="w-full rounded-lg border border-[#E8A87C]/25 bg-[#0b120e]/95 py-2 text-xs text-[#8FA396] transition-colors hover:border-[#E8A87C]/50 hover:text-[#F7F4EC]"
            >
              Lewati (tipe soal belum didukung)
            </button>
          )}

          {/* Kartu umpan balik cerita — menggantikan box jawaban setelah dinilai agar tidak memicu scrollbar */}
          {graded && (
            <div
              ref={feedbackRef}
              onClick={onResolve}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onResolve();
                }
              }}
              aria-label="Lanjut"
              className={`cursor-pointer rounded-lg border-2 bg-[#0b120e]/95 p-3.5 text-[#F7F4EC] transition-colors ${
                graded.correct ? "border-[#6F9B7A]" : "border-[#C9A227]"
              }`}
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
 * Tangan menunjuk (glove) sebagai penunjuk pilihan aktif.
 *
 * Digambar sendiri sebagai **SVG** — bukan glyph font atau emoji — supaya
 * bentuknya tajam, presisi, dan konsisten di semua perangkat: telapak krem
 * dengan outline gelap serta manset oranye `#E8A87C`, jadi tetap terbaca di
 * atas dunia terang maupun kotak pilihan gelap. Saat tidak aktif ia tetap
 * memakan ruang (`opacity-0`) supaya tata letak tidak bergeser.
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
      className={`inline-flex shrink-0 select-none transition-opacity ${
        aktif ? "opacity-100" : "opacity-0"
      } ${kelas}`}
      style={{
        filter: "drop-shadow(0 1px 0 rgba(11, 18, 14, 0.85))",
        transform: arah === "bawah" ? "rotate(90deg)" : undefined,
      }}
    >
      <svg
        width={17}
        height={17}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        {/* Manset oranye di pergelangan tangan. */}
        <rect
          x="1.2"
          y="8.4"
          width="5.4"
          height="7.2"
          rx="1.7"
          fill="#E8A87C"
          stroke="#0b120e"
          strokeWidth="1.5"
        />
        {/* Telapak + jari telunjuk dalam satu jalur supaya sambungannya mulus. */}
        <path
          d="M8.5 7.5 H14 V6.5 H20.25 A2.75 2.75 0 0 1 20.25 12 H14 V14 A3.5 3.5 0 0 1 10.5 17.5 H8.5 A3.5 3.5 0 0 1 5 14 V11 A3.5 3.5 0 0 1 8.5 7.5 Z"
          fill="#F7F4EC"
          stroke="#0b120e"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
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
