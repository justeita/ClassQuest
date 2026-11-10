"use client";

import { useEffect, useRef, useState } from "react";

import type { ChallengeView } from "@/game/challengeView";
import { GAME_HEIGHT, GAME_WIDTH } from "@/game/constants";
import { CHALLENGE, cqw, TEXTBOX } from "@/game/layout";
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
 * Overlay tantangan di atas canvas (docs/05-frontend/game-player.md).
 * Komponen ini **tidak** menilai jawaban: ia hanya menampilkan `ChallengeView`
 * dan mengirim jawaban. `Esc` sengaja tidak menutup overlay.
 *
 * `ordering` memakai tombol naik/turun, bukan drag-and-drop, supaya bisa
 * diselesaikan dengan keyboard (docs/04-game/accessibility.md).
 */
export function ChallengeOverlay({
  view,
  graded,
  onSubmit,
  onResolve,
}: ChallengeOverlayProps) {
  const [pilihan, setPilihan] = useState<string | null>(null);
  const [teks, setTeks] = useState("");
  // Indeks sorotan keyboard untuk daftar opsi (bukan item terpilih).
  const [sorot, setSorot] = useState(0);
  // Urutan awal teracak (challenge-types.md): jangan tampilkan urutan benar.
  const [urutan, setUrutan] = useState<string[]>(() =>
    acakDeterministik(
      (view.items ?? []).map((item) => item.id),
      view.id,
    ),
  );

  // Fokus masuk ke panel saat muncul (accessibility.md § Keyboard). Panel
  // memakai `tabIndex={-1}` supaya bisa difokus tanpa masuk urutan Tab.
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, []);

  /** Jarak tepi bawah panel dari dasar ruang game = atas dialog − celah. */
  const bawahPanel = GAME_HEIGHT - (TEXTBOX.y - CHALLENGE.gapDialog);

  const bisaJawab =
    view.type === "short_answer"
      ? teks.trim().length > 0
      : view.type === "ordering"
        ? urutan.length > 0
        : pilihan !== null;

  function kirimJawaban() {
    if (view.type === "multiple_choice") {
      if (pilihan === null) return;
      onSubmit({
        challengeId: view.id,
        type: "multiple_choice",
        selectedId: pilihan,
      });
      return;
    }
    if (view.type === "true_false") {
      if (pilihan === null) return;
      onSubmit({
        challengeId: view.id,
        type: "true_false",
        answer: pilihan === "benar",
      });
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

  /**
   * Navigasi keyboard daftar opsi (accessibility.md): `1`–`5` memilih
   * langsung, panah naik/turun memindah sorotan, Enter menjawab.
   */
  function tanganiOpsi(event: React.KeyboardEvent<HTMLElement>) {
    if (opsiPilihan.length === 0) return;

    const angka = Number.parseInt(event.key, 10);
    if (angka >= 1 && angka <= opsiPilihan.length) {
      event.preventDefault();
      setPilihan(opsiPilihan[angka - 1]!.id);
      setSorot(angka - 1);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const arah = event.key === "ArrowDown" ? 1 : -1;
      const berikut = (sorot + arah + opsiPilihan.length) % opsiPilihan.length;
      setSorot(berikut);
      return;
    }

    if (event.key === "Enter" && !graded) {
      event.preventDefault();
      const opsi = opsiPilihan[sorot];
      if (!opsi) return;
      setPilihan(opsi.id);
      if (view.type === "multiple_choice") {
        onSubmit({
          challengeId: view.id,
          type: "multiple_choice",
          selectedId: opsi.id,
        });
      } else if (view.type === "true_false") {
        onSubmit({
          challengeId: view.id,
          type: "true_false",
          answer: opsi.id === "benar",
        });
      }
    }
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <section
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-label="Tantangan"
        aria-modal="true"
        aria-live="polite"
        onKeyDown={tanganiOpsi}
        className="challenge-panel pointer-events-auto flex w-full flex-col border-2 border-[#F7F4EC] bg-[#14201a]/[0.97] font-sans text-[#F7F4EC] shadow-[4px_4px_0_0_rgba(0,0,0,0.45)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C]"
        style={{
          left: cqw(CHALLENGE.insetX),
          width: cqw(GAME_WIDTH - CHALLENGE.insetX * 2),
          ["--challenge-bottom" as string]: cqw(bawahPanel),
          ["--challenge-max-h" as string]: cqw(CHALLENGE.maxHeight),
        }}
      >
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <p className="mb-1 text-[10px] uppercase tracking-widest text-[#8FA396]">
            {view.conceptTag}
          </p>
          <h2 className="mb-3 text-sm leading-snug">{view.prompt}</h2>

          {view.hints && view.hints.length > 0 && (
            <ul className="mb-3 border-l-2 border-[#3D4B41] pl-2 text-[11px] leading-relaxed text-[#8FA396]">
              {view.hints.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          )}

          {view.type === "multiple_choice" && (
            <OpsiList
              opsi={(view.options ?? []).map((option) => ({
                id: option.id,
                label: option.text,
              }))}
              pilihan={pilihan}
              sorot={sorot}
              onPilih={(id) => {
                setPilihan(id);
                setSorot(
                  (view.options ?? []).findIndex((option) => option.id === id),
                );
              }}
              disabled={graded !== null}
            />
          )}

          {view.type === "true_false" && (
            <div className="mb-3">
              <p className="mb-2 text-xs italic text-[#D9E4DA]">
                {view.statement}
              </p>
              <OpsiList
                opsi={[
                  { id: "benar", label: "Benar" },
                  { id: "salah", label: "Salah" },
                ]}
                pilihan={pilihan}
                sorot={sorot}
                onPilih={(id) => {
                  setPilihan(id);
                  setSorot(id === "benar" ? 0 : 1);
                }}
                disabled={graded !== null}
              />
            </div>
          )}

          {view.type === "ordering" && (
            <div className="mb-3">
              <p className="mb-2 text-[11px] text-[#8FA396]">
                Susun urutan dengan tombol naik/turun.
              </p>
              <ol className="space-y-1.5">
                {urutan.map((itemId, index) => (
                  <li
                    key={itemId}
                    className="flex items-center gap-1.5 border border-[#3D4B41] px-2 py-1.5"
                  >
                    <span className="text-[11px] text-[#8FA396]">
                      {index + 1}.
                    </span>
                    <span className="flex-1 text-xs leading-snug">
                      {itemById.get(itemId)?.text ?? itemId}
                    </span>
                    <button
                      type="button"
                      onClick={() => geser(index, -1)}
                      disabled={graded !== null || index === 0}
                      aria-label={`Naikkan "${itemById.get(itemId)?.text ?? itemId}"`}
                      className="border border-[#3D4B41] px-1.5 text-xs leading-5 hover:border-[#8FA396] disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#E8A87C]"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => geser(index, 1)}
                      disabled={graded !== null || index === urutan.length - 1}
                      aria-label={`Turunkan "${itemById.get(itemId)?.text ?? itemId}"`}
                      className="border border-[#3D4B41] px-1.5 text-xs leading-5 hover:border-[#8FA396] disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#E8A87C]"
                    >
                      ↓
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {view.type === "short_answer" && (
            <div className="mb-3">
              <label
                htmlFor="jawaban-singkat"
                className="mb-1 block text-[11px] text-[#8FA396]"
              >
                Tulis jawabanmu
              </label>
              <input
                id="jawaban-singkat"
                type="text"
                value={teks}
                onChange={(event) => setTeks(event.target.value)}
                disabled={graded !== null}
                autoComplete="off"
                maxLength={60}
                className="w-full border border-[#3D4B41] bg-[#0b120e] px-2 py-1.5 text-xs text-[#F7F4EC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#E8A87C] disabled:opacity-60"
              />
            </div>
          )}

          {!BISA_DIJAWAB.has(view.type) && (
            <p className="mb-3 text-xs text-[#8FA396]">
              Tipe soal ini belum tersedia di overlay. Lanjutkan untuk melewati.
            </p>
          )}

          {graded && (
            <div className="mt-2">
              <p
                className={`mb-1 text-xs font-bold ${
                  graded.correct ? "text-[#6F9B7A]" : "text-[#C9A227]"
                }`}
              >
                {graded.correct ? "Tepat." : "Belum tepat."}
              </p>
              <p className="text-xs leading-relaxed text-[#D9E4DA]">
                {graded.explanation}
              </p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 border-t border-[#3D4B41] px-3 py-2">
          {graded ? (
            <button
              type="button"
              onClick={onResolve}
              className="w-full border-2 border-[#F7F4EC] px-3 py-2 text-xs font-bold uppercase tracking-wider hover:bg-[#F7F4EC] hover:text-[#14201a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C]"
            >
              Lanjut
            </button>
          ) : (
            <button
              type="button"
              onClick={BISA_DIJAWAB.has(view.type) ? kirimJawaban : onResolve}
              disabled={BISA_DIJAWAB.has(view.type) && !bisaJawab}
              className="w-full border-2 border-[#F7F4EC] px-3 py-2 text-xs font-bold uppercase tracking-wider enabled:hover:bg-[#F7F4EC] enabled:hover:text-[#14201a] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C]"
            >
              {BISA_DIJAWAB.has(view.type) ? "Jawab" : "Lewati"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

/**
 * Acak berbasis benih tetap: soal yang sama selalu tampil dalam urutan sama,
 * tetapi urutannya bukan `items[]` dari cerita. Dipakai karena `items[]`
 * ditulis penulis dalam urutan yang benar.
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
  pilihan: string | null;
  /** Indeks yang sedang disorot panah keyboard. */
  sorot: number;
  onPilih: (id: string) => void;
  disabled: boolean;
};

function OpsiList({ opsi, pilihan, sorot, onPilih, disabled }: OpsiListProps) {
  return (
    <ul className="mb-3 space-y-1.5">
      {opsi.map((option, index) => {
        const terpilih = pilihan === option.id;
        const disorot = sorot === index;
        return (
          <li key={option.id}>
            <button
              type="button"
              onClick={() => onPilih(option.id)}
              disabled={disabled}
              aria-pressed={terpilih}
              className={`w-full border px-2.5 py-1.5 text-left text-xs leading-snug transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#E8A87C] disabled:cursor-default ${
                terpilih
                  ? "border-[#E8A87C] bg-[#E8A87C]/15"
                  : disorot
                    ? "border-[#8FA396]"
                    : "border-[#3D4B41] hover:border-[#8FA396]"
              }`}
            >
              <span className="mr-1.5 text-[#8FA396]">{index + 1}.</span>
              {option.label}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
