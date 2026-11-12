"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Notifikasi ringkas ala portal guru.
 *
 * Desain asalnya memakai `showToast()` global yang menyisipkan DOM. Di React
 * state-nya di sini: satu provider di `src/app/guru/layout.tsx`, dan komponen
 * memanggil `useToast()`. Tanpa provider (mis. di tes komponen tunggal),
 * pemanggilnya menjadi no-op — bukan error — supaya komponen tetap bisa
 * dirender sendiri.
 */

export type ToastKind = "info" | "success" | "error";

export type ToastApi = (message: string, kind?: ToastKind) => void;

type ToastItem = {
  id: number;
  message: string;
  kind: ToastKind;
};

const ToastContext = createContext<ToastApi>(() => {});

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

const DURATION_MS = 3000;

const STYLE: Record<ToastKind, { box: string; icon: string }> = {
  info: {
    box: "bg-slate-900 text-white border-2 border-slate-700",
    icon: "fa-info-circle text-slate-300",
  },
  success: {
    box: "bg-slate-900 text-white border-2 border-emerald-500",
    icon: "fa-circle-check text-emerald-400",
  },
  error: {
    box: "bg-slate-900 text-white border-2 border-rose-500",
    icon: "fa-circle-xmark text-rose-400",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef<number[]>([]);

  const show = useCallback<ToastApi>((message, kind = "info") => {
    const id = nextId.current;
    nextId.current += 1;

    setItems((previous) => [...previous, { id, message, kind }]);
    timers.current.push(
      window.setTimeout(() => {
        setItems((previous) => previous.filter((item) => item.id !== id));
      }, DURATION_MS),
    );
  }, []);

  // Timer yang masih hidup saat provider dilepas tidak boleh menyentuh state.
  useEffect(() => {
    const aktif = timers;
    return () => {
      aktif.current.forEach((timer) => window.clearTimeout(timer));
      aktif.current = [];
    };
  }, []);

  const api = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div className="pointer-events-none fixed right-5 top-5 z-50 flex flex-col gap-3">
        {items.map((item) => {
          const style = STYLE[item.kind];
          return (
            <div
              key={item.id}
              role="status"
              className={`guru-toast-in pointer-events-auto flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-medium shadow-lg ${style.box}`}
            >
              <i className={`fa-solid ${style.icon} text-sm`} aria-hidden />
              <span>{item.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
