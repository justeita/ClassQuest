"use client";

import { useEffect, useRef, useState } from "react";

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
 * Mengikuti estetika RPG 2D top-down (Undertale, Omori, RPG Maker) & prinsip konsistensi HCI:
 * - Soal/pertanyaan berada di dalam kotak dialog NPC (DialogueBox).
 * - Yang melayang di atas kotak dialog HANYA pilihan responnya saat belum dinilai.
 * - Setelah menjawab (graded), seluruh box pilihan jawaban disembunyikan dan HANYA
 *   kartu umpan balik (tepat/belum tepat) yang tampil sehingga tidak memicu scrollbar.
 * - Desain box konsisten dengan DialogueBox:
 *   • Latar: #14201a (warna latar panel dialog).
 *   • Bingkai: border-2 solid #F7F4EC (bingkai panel dialog), tanpa drop shadow.
 *   • Ukuran huruf rapi dan proporsional (`ukuranHuruf(13.5, 12, 20)` & `lineHeight: 1.3`).
 * - Bentuk segitiga penunjuk (▶) berada di LUAR kotak jawaban di sebelah kiri,
 *   dan saat aktif berwarna gelap/hitam (#0b120e) agar kontras terhadap dunia game.
 * - Tombol aksi "Jawab" disejajarkan sempurna dengan kotak-kotak jawaban di atasnya.
 * - Teks petunjuk interaksi (keyboard shortcut/hints) dibungkus latar gelap (#0b120e)
 *   dengan font putih (#F7F4EC) agar selalu kontras di atas latar belakang permainan apa pun.
 * - Lebar seragam (fit text): bila salah satu opsi panjang, seluruh opsi dalam kolom
 *   menyesuaikan diri mengikuti lebar opsi yang paling panjang.
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
                className="inline-flex items-center gap-1.5 rounded-md border border-[#F7F4EC]/30 bg-[#0b120e]/95 px-2.5 py-1 font-medium text-[#F7F4EC]"
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
              <ol className="space-y-1.5">
                {urutan.map((itemId, index) => {
                  const disorot = sorotUrutan === index;
                  return (
                    <li
                      key={itemId}
                      onClick={() => setSorotUrutan(index)}
                      className="relative flex w-full items-center"
                    >
                      {/* Segitiga kursor ▶ berada di LUAR kotak di sebelah kiri */}
                      <span
                        aria-hidden="true"
                        className={`mr-2 text-xs font-black transition-opacity select-none sm:text-sm ${
                          disorot
                            ? "scale-110 text-[#0b120e] opacity-100"
                            : "opacity-0"
                        }`}
                      >
                        ▶
                      </span>

                      {/* Kotak item urutan konsisten dengan DialogueBox */}
                      <div
                        className={`flex flex-1 items-center gap-2 rounded-lg border-2 px-3 py-1.5 transition-colors select-none ${
                          disorot
                            ? "border-[#F7F4EC] bg-[#14201a] text-[#F7F4EC]"
                            : "border-[#F7F4EC]/40 bg-[#14201a]/95 text-[#D9E4DA] hover:border-[#F7F4EC]"
                        }`}
                        style={{
                          fontSize: ukuranHuruf(13.5, 12, 20),
                          lineHeight: 1.3,
                        }}
                      >
                        <span className="w-5 text-center font-bold text-[#F7F4EC]">
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
                            className="rounded border border-[#F7F4EC]/50 bg-[#14201a] px-2 py-0.5 text-xs text-[#F7F4EC] hover:border-[#F7F4EC] hover:bg-[#1f3027] disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-[#F7F4EC]"
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
                            className="rounded border border-[#F7F4EC]/50 bg-[#14201a] px-2 py-0.5 text-xs text-[#F7F4EC] hover:border-[#F7F4EC] hover:bg-[#1f3027] disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-[#F7F4EC]"
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>

              {/* Baris tombol aksi dan petunjuk shortcut */}
              <div className="space-y-1.5 pt-0.5">
                {/* Tombol Jawab disejajarkan dengan kotak jawaban dengan spacer seimbang */}
                <div className="flex w-full items-center">
                  <span
                    aria-hidden="true"
                    className="mr-2 text-xs select-none opacity-0 sm:text-sm"
                  >
                    ▶
                  </span>
                  <button
                    type="button"
                    onClick={kirimJawabanManual}
                    className="flex-1 rounded-lg border-2 border-[#F7F4EC] bg-[#14201a] py-1.5 font-bold uppercase tracking-wider text-[#F7F4EC] hover:bg-[#F7F4EC] hover:text-[#14201a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F7F4EC]"
                    style={{
                      fontSize: ukuranHuruf(14, 12, 20),
                      lineHeight: 1.2,
                    }}
                  >
                    Jawab
                  </button>
                </div>

                {/* Teks petunjuk berlatar gelap dengan font putih agar kontras maksimal */}
                <div className="flex w-full items-center justify-center pt-0.5">
                  <p
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#F7F4EC]/30 bg-[#0b120e]/95 px-3 py-1 font-medium text-[#F7F4EC]"
                    style={{
                      fontSize: ukuranHuruf(12, 11, 15),
                      lineHeight: 1.2,
                    }}
                  >
                    [↑/↓] Pilih &nbsp; [←/→] Geser &nbsp; [Enter] Jawab
                  </p>
                </div>
              </div>
            </div>
          )}

          {!graded && view.type === "short_answer" && (
            <div className="space-y-2">
              <div className="relative rounded-lg border-2 border-[#F7F4EC]/60 bg-[#14201a]/95 focus-within:border-[#F7F4EC]">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-bold text-[#F7F4EC]">
                  &gt;
                </span>
                <input
                  ref={inputRef}
                  autoFocus
                  id="jawaban-singkat"
                  aria-label="Tulis jawabanmu"
                  type="text"
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

              <div className="space-y-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={kirimJawabanManual}
                  disabled={!bisaJawab}
                  className="w-full rounded-lg border-2 border-[#F7F4EC] bg-[#14201a] py-1.5 font-bold uppercase tracking-wider text-[#F7F4EC] hover:bg-[#F7F4EC] hover:text-[#14201a] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F7F4EC]"
                  style={{
                    fontSize: ukuranHuruf(14, 12, 20),
                    lineHeight: 1.2,
                  }}
                >
                  Jawab
                </button>
                {/* Teks petunjuk berlatar gelap dengan font putih agar kontras maksimal */}
                <div className="flex w-full items-center justify-center pt-0.5">
                  <p
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#F7F4EC]/30 bg-[#0b120e]/95 px-3 py-1 font-medium text-[#F7F4EC]"
                    style={{
                      fontSize: ukuranHuruf(12, 11, 15),
                      lineHeight: 1.2,
                    }}
                  >
                    [Enter] Kirim Jawaban
                  </p>
                </div>
              </div>
            </div>
          )}

          {!graded && !BISA_DIJAWAB.has(view.type) && (
            <button
              type="button"
              onClick={onResolve}
              className="w-full rounded-lg border-2 border-[#F7F4EC]/40 bg-[#14201a]/95 py-2 text-xs text-[#8FA396] hover:border-[#F7F4EC] hover:text-[#F7F4EC]"
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
              className={`cursor-pointer rounded-lg border-2 p-3.5 transition-colors ${
                graded.correct
                  ? "border-[#6F9B7A] bg-[#14201a]/95 text-[#F7F4EC]"
                  : "border-[#C9A227] bg-[#14201a]/95 text-[#F7F4EC]"
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
                className="break-words whitespace-pre-wrap leading-relaxed text-[#D9E4DA]"
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
 * - Segitiga kursor (▶) di LUAR box jawaban (di sebelah kiri), warna gelap/hitam (#0b120e) saat aktif.
 * - Desain box konsisten dengan DialogueBox: border-2 solid #F7F4EC, bg #14201a, tanpa shadow.
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
        <ul className="inline-flex w-fit min-w-[13rem] max-w-full flex-col items-stretch gap-2 font-game">
          {opsi.map((option, index) => {
            const terpilih = pilihan === option.id;
            const disorot = sorot === index;

            return (
              <li key={option.id} className="relative flex w-full items-center">
                {/* Segitiga kursor ▶ di luar box sebelah kiri, berwarna gelap/hitam pekat saat aktif */}
                <span
                  aria-hidden="true"
                  className={`mr-2 text-xs font-black transition-opacity select-none sm:text-sm ${
                    terpilih || disorot
                      ? "scale-110 text-[#0b120e] opacity-100"
                      : "opacity-0"
                  }`}
                >
                  ▶
                </span>

                <button
                  type="button"
                  onClick={() => onPilih(option.id, index)}
                  onMouseEnter={() => !disabled && onSorot(index)}
                  disabled={disabled}
                  aria-pressed={terpilih}
                  className={`group flex w-full flex-1 items-center justify-start rounded-lg border-2 px-4 py-2 text-left font-medium transition-colors select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F7F4EC] disabled:cursor-default ${
                    terpilih || disorot
                      ? "border-[#F7F4EC] bg-[#14201a] text-[#F7F4EC]"
                      : "border-[#F7F4EC]/40 bg-[#14201a]/95 text-[#D9E4DA] hover:border-[#F7F4EC] hover:bg-[#14201a] hover:text-[#F7F4EC]"
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
              <span
                aria-hidden="true"
                className={`mr-2 text-xs font-black transition-opacity select-none sm:text-sm ${
                  terpilih || disorot
                    ? "scale-110 text-[#0b120e] opacity-100"
                    : "opacity-0"
                }`}
              >
                ▶
              </span>

              <button
                type="button"
                onClick={() => onPilih(option.id, index)}
                onMouseEnter={() => !disabled && onSorot(index)}
                disabled={disabled}
                aria-pressed={terpilih}
                className={`group flex min-w-[3.5rem] items-center justify-center rounded-lg border-2 px-4 py-1.5 text-center font-semibold transition-colors select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F7F4EC] disabled:cursor-default ${
                  terpilih || disorot
                    ? "border-[#F7F4EC] bg-[#14201a] text-[#F7F4EC]"
                    : "border-[#F7F4EC]/40 bg-[#14201a]/95 text-[#D9E4DA] hover:border-[#F7F4EC] hover:bg-[#14201a] hover:text-[#F7F4EC]"
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
            <span
              aria-hidden="true"
              className={`mb-1 text-xs font-black transition-opacity select-none sm:text-sm ${
                terpilih || disorot
                  ? "scale-110 text-[#0b120e] opacity-100"
                  : "opacity-0"
              }`}
            >
              ▼
            </span>

            <button
              type="button"
              onClick={() => onPilih(option.id, index)}
              onMouseEnter={() => !disabled && onSorot(index)}
              disabled={disabled}
              aria-pressed={terpilih}
              className={`group flex min-h-[5.5rem] w-full items-center justify-center rounded-lg border-2 p-3 text-center transition-colors select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F7F4EC] disabled:cursor-default ${
                terpilih || disorot
                  ? "border-[#F7F4EC] bg-[#14201a] text-[#F7F4EC]"
                  : "border-[#F7F4EC]/40 bg-[#14201a]/95 text-[#D9E4DA] hover:border-[#F7F4EC] hover:bg-[#14201a] hover:text-[#F7F4EC]"
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
