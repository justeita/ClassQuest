"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

/** Satu pilihan pada `SelectMenu`. `value` yang dikirim ke server, bukan label. */
export type SelectOption = {
  value: string;
  label: string;
  /** Keterangan kecil di kanan label, mis. "(berjalan)". */
  hint?: string;
  disabled?: boolean;
};

type SelectMenuProps = {
  /** `id` tombol pemicu; hubungkan dengan `<label htmlFor>`. */
  id: string;
  /** Wadah `id` daftar pilihan (dipakai `aria-controls`). */
  options: readonly SelectOption[];
  value: string;
  onChange: (value: string) => void;
  /** Teks pemicu saat `value` tidak cocok dengan pilihan mana pun. */
  placeholder?: string;
  /** Kelas tambahan untuk tombol pemicu. */
  className?: string;
  disabled?: boolean;
  /** Ikon di dalam pemicu, mis. `<i className="fa-regular fa-calendar" />`. */
  icon?: ReactNode;
  /**
   * Awalan id elemen `listbox`. Opsional; default diturunkan dari `id` pemicu
   * supaya `useId()` tidak dipanggil saat `id` sudah unik.
   */
  listboxId?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  /** Dipanggil saat pilihan dikonfirmasi; berguna untuk menutup modal. */
  onCommit?: (value: string) => void;
};

/**
 * Dropdown custom bertema portal guru — pengganti `<select>` native.
 *
 * Kenapa tidak `<select>`: tampilan `<option>` ditentukan browser/OS sehingga
 * tidak bisa mengikuti tema pixel, dan daftar pilihannya dirender di luar
 * dokumen (tidak bisa diberi ikon/keterangan). Komponen ini tetap memakai pola
 * ARIA combobox + listbox supaya pembaca layar dan keyboard tidak dirugikan.
 *
 * Yang dipegang:
 *
 * - **Nilai divalidasi pemanggil.** Komponen ini hanya mengirim `value` dari
 *   `options`; ia tidak pernah menghasilkan teks bebas. Server tetap
 *   memvalidasi ulang karena input dari browser tidak pernah dipercaya.
 * - **Keyboard:** `↑`/`↓`/`Home`/`End` pindah sorotan, `Enter`/`Space`
 *   memilih, `Escape` menutup tanpa mengubah nilai, `Tab` menutup.
 * - Daftar dirender inline di dalam alur dokumen (bukan portal), jadi tetap
 *   terlihat di dalam modal dan tidak terpotong `overflow` leluhurnya.
 */
export function SelectMenu({
  id,
  options,
  value,
  onChange,
  placeholder = "Pilih…",
  className = "",
  disabled = false,
  icon,
  listboxId,
  onCommit,
  ...aria
}: SelectMenuProps) {
  const generatedId = useId();
  const optionsId = listboxId ?? `${generatedId}-options`;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [placement, setPlacement] = useState<"bottom" | "top">("bottom");

  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const firstEnabled = (fromEnd = false): number => {
    const indexes = options.map((option, index) => ({ option, index }));
    const ordered = fromEnd ? indexes.reverse() : indexes;
    return ordered.find((entry) => !entry.option.disabled)?.index ?? -1;
  };

  function pilih(index: number) {
    const option = options[index];
    if (option === undefined || option.disabled) return;

    onChange(option.value);
    setOpen(false);
    onCommit?.(option.value);
    buttonRef.current?.focus();
  }

  function buka(arah: "first" | "last" | "selected" = "selected") {
    if (disabled || options.length === 0) return;

    const target =
      arah === "first"
        ? firstEnabled()
        : arah === "last"
          ? firstEnabled(true)
          : selectedIndex >= 0
            ? selectedIndex
            : firstEnabled();

    // Bila ruang di bawah pemicu sempit (mis. field terakhir di dalam modal),
    // buka ke atas supaya daftar tidak terpotong.
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect !== undefined) {
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setPlacement(
        spaceBelow < 260 && spaceAbove > spaceBelow ? "top" : "bottom",
      );
    }

    setActiveIndex(target);
    setOpen(true);
  }

  function geser(step: number) {
    if (options.length === 0) return;

    let next = activeIndex;
    for (let attempt = 0; attempt < options.length; attempt += 1) {
      next = (next + step + options.length) % options.length;
      if (!options[next]?.disabled) {
        setActiveIndex(next);
        return;
      }
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (disabled) return;

    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        buka(event.key === "ArrowUp" ? "last" : "selected");
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        geser(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        geser(-1);
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(firstEnabled());
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(firstEnabled(true));
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        pilih(activeIndex);
        break;
      case "Escape":
        event.preventDefault();
        // Jangan teruskan ke Modal: Escape di sini hanya menutup daftar,
        // bukan seluruh dialog (dulu form kelas ikut tertutup).
        event.stopPropagation();
        setOpen(false);
        buttonRef.current?.focus();
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        break;
    }
  }

  // Klik di luar menutup daftar tanpa memilih.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (
        target === null ||
        buttonRef.current?.contains(target) ||
        listRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // Sorotan mengikuti keyboard; pastikan item aktif terlihat.
  useEffect(() => {
    if (!open) return;

    const item = listRef.current?.children[activeIndex];
    if (item instanceof HTMLElement) {
      // `scrollIntoView` tidak ada di jsdom; jangan sampai merusak test.
      item.scrollIntoView?.({ block: "nearest" });
    }
  }, [open, activeIndex]);

  const activeId =
    open && activeIndex >= 0 ? `${optionsId}-${activeIndex}` : undefined;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? optionsId : undefined}
        aria-activedescendant={activeId}
        aria-describedby={aria["aria-describedby"]}
        aria-invalid={aria["aria-invalid"] || undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : buka())}
        onKeyDown={onKeyDown}
        className={`guru-press flex w-full items-center justify-between gap-2 rounded-xl border-2 border-slate-300 bg-slate-50 px-3.5 py-2.5 text-left text-xs font-medium text-slate-700 transition hover:border-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60 ${
          open ? "border-brand-500 ring-2 ring-brand-500" : ""
        } ${className}`}
      >
        <span className="flex min-w-0 items-center gap-2">
          {icon !== undefined ? (
            <span className="text-slate-400" aria-hidden>
              {icon}
            </span>
          ) : null}
          <span className={`truncate ${selected ? "" : "text-slate-400"}`}>
            {selected?.label ?? placeholder}
          </span>
        </span>
        <i
          className={`fa-solid fa-chevron-down shrink-0 text-[10px] text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          ref={listRef}
          id={optionsId}
          role="listbox"
          aria-label={placeholder}
          tabIndex={-1}
          className={`guru-pop absolute left-0 right-0 z-20 max-h-60 overflow-y-auto rounded-xl border-2 border-slate-900 bg-white p-1 text-xs shadow-[3px_3px_0px_#172554] ${
            placement === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
          onKeyDown={onKeyDown}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === activeIndex;

            return (
              <li
                key={option.value}
                id={`${optionsId}-${index}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                onMouseEnter={() => !option.disabled && setActiveIndex(index)}
                onMouseDown={(event) => {
                  // Cegah fokus pindah dari tombol pemicu.
                  event.preventDefault();
                }}
                onClick={() => pilih(index)}
                className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 ${
                  option.disabled
                    ? "cursor-not-allowed text-slate-300"
                    : isActive
                      ? "bg-brand-600 text-white"
                      : isSelected
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-700"
                }`}
              >
                <span className="truncate font-semibold">{option.label}</span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {option.hint !== undefined ? (
                    <span
                      className={`text-[10px] ${
                        isActive ? "text-white/80" : "text-slate-400"
                      }`}
                    >
                      {option.hint}
                    </span>
                  ) : null}
                  {isSelected ? (
                    <i className="fa-solid fa-check text-[10px]" aria-hidden />
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
