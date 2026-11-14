import type { ReactNode } from "react";

/**
 * Kendali kecil yang dipakai bersama oleh semua panel story editor.
 *
 * Kenapa dipisah dari `storyEditorState.ts`: berkas itu logika murni (bisa
 * dites tanpa React), sedangkan berkas ini hanya potongan JSX tanpa state.
 * Batas itu menjaga aturan `docs/05-frontend/ui-conventions.md` — "sedikit
 * komponen, dipakai ulang" — dan membuat panel-panel editor tidak menduplikasi
 * gaya kotak isian, penghitung karakter, atau kotak error.
 */

/** Kelas dasar untuk `<input>` dan `<textarea>`. */
const BASE =
  "w-full rounded-xl border-2 bg-white px-3 py-2 text-xs leading-relaxed text-slate-800 outline-none transition focus:border-slate-900 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

/** Kotak isian normal; merah saat bermasalah. */
export function fieldClass(problem = false): string {
  return `${BASE} ${problem ? "border-rose-400 bg-rose-50/40 focus:border-rose-600" : "border-slate-300 focus:border-slate-900"}`;
}

/**
 * Hitungan karakter bergaya `182/240`.
 *
 * Warnanya berubah saat mendekati batas (90%) dan melampauinya, **dan** selalu
 * disertai teks status supaya warna bukan satu-satunya penanda
 * (`docs/05-frontend/story-editor.md` bagian aksesibilitas).
 */
export function CharCount({ value, max }: { value: string; max: number }) {
  const length = [...value].length;
  const ratio = length / max;
  const tone =
    ratio > 1
      ? "text-rose-600 font-bold"
      : ratio >= 0.9
        ? "text-amber-600 font-semibold"
        : "text-slate-400";

  return (
    <span
      className={`shrink-0 font-pixel text-[10px] tabular-nums ${tone}`}
      data-testid="char-count"
    >
      {length}/{max}
      {ratio > 1 ? " terlalu panjang" : null}
    </span>
  );
}

/** Label + kotak isian + hitungan karakter, satu baris. */
export function Field({
  id,
  label,
  hint,
  children,
  count,
  problem,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
  count?: ReactNode;
  problem?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <label
          htmlFor={id}
          className={`text-[11px] font-bold ${problem ? "text-rose-700" : "text-slate-700"}`}
        >
          {label}
        </label>
        {count}
      </div>
      {children}
      {hint ? (
        <p className="text-[10px] leading-relaxed text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

/** Kotak pesan error di bawah sebuah field. */
export function FieldError({ messages }: { messages: readonly string[] }) {
  if (messages.length === 0) return null;

  return (
    <ul className="space-y-0.5" role="alert">
      {messages.map((message) => (
        <li
          key={message}
          className="flex items-start gap-1 text-[10px] font-semibold leading-relaxed text-rose-700"
        >
          <i
            className="fa-solid fa-circle-exclamation mt-0.5 shrink-0"
            aria-hidden
          />
          <span>{message}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Tombol pindah naik/turun. Dipakai untuk scene, beat, dan item urutan —
 * tombol, bukan drag, sesuai batasan aksesibilitas di dokumen editor.
 */
export function MoveButton({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="guru-press flex h-6 w-6 items-center justify-center rounded-lg border-2 border-slate-300 text-[10px] text-slate-600 transition hover:border-slate-900 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <i className={`fa-solid ${icon}`} aria-hidden />
    </button>
  );
}

/** Tombol kecil bergaris untuk aksi sekunder ("Tambah dialog", "Hapus opsi"). */
export function MiniButton({
  children,
  onClick,
  icon,
  tone = "neutral",
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  icon?: string;
  tone?: "neutral" | "danger" | "primary";
  disabled?: boolean;
}) {
  const styles = {
    neutral:
      "border-slate-300 text-slate-600 hover:border-slate-900 hover:text-slate-900",
    danger:
      "border-rose-200 text-rose-600 hover:border-rose-500 hover:bg-rose-50",
    primary: "border-slate-900 bg-white text-slate-900 hover:bg-slate-100",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`guru-press inline-flex items-center gap-1.5 rounded-lg border-2 px-2.5 py-1 text-[11px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${styles}`}
    >
      {icon ? <i className={`fa-solid ${icon}`} aria-hidden /> : null}
      <span>{children}</span>
    </button>
  );
}
