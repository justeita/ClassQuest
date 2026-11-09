"use client";

import { useState } from "react";

import type { ChallengeView } from "@/game/challengeView";
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

/**
 * Overlay tantangan di atas canvas (docs/05-frontend/game-player.md).
 * Komponen ini **tidak** menilai jawaban: ia hanya menampilkan `ChallengeView`
 * dan mengirim jawaban. `Esc` sengaja tidak menutup overlay.
 */
export function ChallengeOverlay({
  view,
  graded,
  onSubmit,
  onResolve,
}: ChallengeOverlayProps) {
  const [pilihan, setPilihan] = useState<string | null>(null);

  const bisaJawab = pilihan !== null;

  function kirimJawaban() {
    if (pilihan === null) return;

    if (view.type === "multiple_choice") {
      onSubmit({
        challengeId: view.id,
        type: "multiple_choice",
        selectedId: pilihan,
      });
      return;
    }
    if (view.type === "true_false") {
      onSubmit({
        challengeId: view.id,
        type: "true_false",
        answer: pilihan === "benar",
      });
    }
  }

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0b120e]/75 p-3">
      <section
        aria-label="Tantangan"
        aria-live="polite"
        className="w-full max-w-md border-2 border-[#F7F4EC] bg-[#14201a] p-4 font-mono text-[#F7F4EC] shadow-[4px_4px_0_0_rgba(0,0,0,0.45)]"
      >
        <p className="mb-1 text-[10px] uppercase tracking-widest text-[#8FA396]">
          {view.conceptTag}
        </p>
        <h2 className="mb-3 text-sm leading-snug">{view.prompt}</h2>

        {view.type === "multiple_choice" && (
          <OpsiList
            opsi={(view.options ?? []).map((option) => ({
              id: option.id,
              label: option.text,
            }))}
            pilihan={pilihan}
            onPilih={setPilihan}
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
              onPilih={setPilihan}
              disabled={graded !== null}
            />
          </div>
        )}

        {view.type !== "multiple_choice" && view.type !== "true_false" && (
          <p className="mb-3 text-xs text-[#8FA396]">
            Tipe soal ini belum tersedia di overlay. Lanjutkan untuk melewati.
          </p>
        )}

        {graded ? (
          <div className="mt-2">
            <p
              className={`mb-1 text-xs font-bold ${
                graded.correct ? "text-[#6F9B7A]" : "text-[#C9A227]"
              }`}
            >
              {graded.correct ? "Tepat." : "Belum tepat."}
            </p>
            <p className="mb-3 text-xs leading-relaxed text-[#D9E4DA]">
              {graded.explanation}
            </p>
            <button
              type="button"
              onClick={onResolve}
              className="w-full border-2 border-[#F7F4EC] px-3 py-2 text-xs font-bold uppercase tracking-wider hover:bg-[#F7F4EC] hover:text-[#14201a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C]"
            >
              Lanjut
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={
              view.type === "multiple_choice" || view.type === "true_false"
                ? kirimJawaban
                : onResolve
            }
            disabled={
              (view.type === "multiple_choice" || view.type === "true_false") &&
              !bisaJawab
            }
            className="mt-1 w-full border-2 border-[#F7F4EC] px-3 py-2 text-xs font-bold uppercase tracking-wider enabled:hover:bg-[#F7F4EC] enabled:hover:text-[#14201a] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C]"
          >
            {view.type === "multiple_choice" || view.type === "true_false"
              ? "Jawab"
              : "Lewati"}
          </button>
        )}
      </section>
    </div>
  );
}

type OpsiListProps = {
  opsi: { id: string; label: string }[];
  pilihan: string | null;
  onPilih: (id: string) => void;
  disabled: boolean;
};

function OpsiList({ opsi, pilihan, onPilih, disabled }: OpsiListProps) {
  return (
    <ul className="mb-3 space-y-1.5">
      {opsi.map((option, index) => {
        const terpilih = pilihan === option.id;
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
