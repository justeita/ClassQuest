"use client";

import { useEffect, useRef, type ReactNode } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  /** `id` judul modal, dipakai untuk `aria-labelledby`. */
  labelledBy: string;
  /** Kelas lebar maksimum, mis. `max-w-lg`. */
  width?: string;
  children: ReactNode;
};

/**
 * Dialog sederhana dengan latar gelap.
 *
 * Perilaku yang dipertahankan dari desain asal: klik latar menutup modal.
 * Tambahannya hanya dua hal kecil yang penting untuk aksesibilitas dan
 * pemakaian nyata — tombol `Escape` menutup, dan halaman di belakang tidak ikut
 * menggulir selama modal terbuka.
 *
 * Animasi: latar memudar (`guru-fade`) dan panel muncul (`guru-pop`), keduanya
 * dari `src/app/globals.css`. **Tidak ada animasi keluar** dengan sengaja:
 * menundanya berarti `onClose` tidak dipanggil saat guru menekan Escape, dan
 * modal yang tertinggal karena timer tidak jalan adalah bug yang jauh lebih
 * mahal daripada transisi keluar yang mulus.
 */
export function Modal({
  open,
  onClose,
  labelledBy,
  width = "max-w-lg",
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      // Lapisan di dalam modal (dropdown, kalender) boleh mengklaim Escape
      // lebih dulu. Dua sinyal dipakai karena keduanya bisa datang berbeda:
      //
      // - `defaultPrevented`: lapisan dalam sudah `preventDefault()`. Ini yang
      //   andal, sebab React memasang pendengar root di `document` juga
      //   sehingga `stopPropagation()` tidak menghalangi pendengar ini.
      // - Ada `[role="listbox"]`/`[role="dialog"]` yang masih terbuka: dipakai
      //   saat Escape datang langsung ke `document` (fokus di `body`).
      if (event.defaultPrevented) return;

      const inner = dialogRef.current?.querySelector(
        '[role="listbox"], [role="dialog"]',
      );
      if (inner !== null && inner !== undefined) return;

      onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="guru-fade fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`guru-pop flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-3xl border-2 border-slate-300 bg-white shadow-2xl ${width}`}
      >
        {children}
      </div>
    </div>
  );
}
