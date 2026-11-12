"use client";

import { useEffect, type ReactNode } from "react";

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
 */
export function Modal({
  open,
  onClose,
  labelledBy,
  width = "max-w-lg",
  children,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-3xl border-2 border-slate-300 bg-white shadow-2xl ${width}`}
      >
        {children}
      </div>
    </div>
  );
}
