"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Polling status generasi untuk halaman `/guru/materi/[storyId]`.
 *
 * Kontrak: `GET /api/jobs/[jobId]` di `docs/06-backend/api-contract.md` dan
 * aturan polling di `docs/05-frontend/teacher-dashboard.md`:
 *
 * - interval 1,5 detik (tidak lebih cepat dari 1 detik);
 * - berhenti saat `done`/`failed`, lalu `router.refresh()` supaya ringkasan
 *   cerita terbaca ulang dari server;
 * - berhenti saat tab tidak aktif dan lanjut saat aktif kembali;
 * - batas total 3 menit, lalu tampilkan "masih diproses, cek lagi nanti"
 *   (job yang benar-benar menggantung akan ditandai gagal oleh server setelah
 *   330 detik saat polling berikutnya).
 *
 * Tidak ada data internal yang ditampilkan: pesan error berasal dari server
 * dalam bentuk `{ code, message }` yang sudah statis.
 */

const POLL_INTERVAL_MS = 1500;
const MAX_WAIT_MS = 3 * 60 * 1000;

type JobView = {
  stage: string;
  progress: number;
  message?: string;
  error?: { code: string; message: string };
};

type JobPayload = {
  stage?: unknown;
  progress?: unknown;
  message?: unknown;
  error?: unknown;
};

/** Urutan tahap untuk tampilan langkah; `done` = semua selesai. */
const STEP_INDEX: Record<string, number> = {
  queued: 0,
  extracting: 0,
  outlining: 1,
  generating: 2,
  validating: 3,
  repairing: 3,
  saving: 3,
  done: 4,
  failed: -1,
};

const STEPS = [
  { label: "Membaca PDF", icon: "fa-file-lines" },
  { label: "Menyusun kerangka", icon: "fa-sitemap" },
  { label: "Menulis cerita", icon: "fa-feather-pointed" },
  { label: "Memeriksa hasil", icon: "fa-shield-halved" },
] as const;

function toView(payload: JobPayload, fallback: JobView): JobView {
  const stage =
    typeof payload.stage === "string" ? payload.stage : fallback.stage;
  const progress =
    typeof payload.progress === "number" && Number.isFinite(payload.progress)
      ? payload.progress
      : fallback.progress;

  const error =
    payload.error !== null &&
    typeof payload.error === "object" &&
    typeof (payload.error as { message?: unknown }).message === "string"
      ? {
          code: String((payload.error as { code?: unknown }).code ?? ""),
          message: (payload.error as { message: string }).message,
        }
      : undefined;

  return {
    stage,
    progress,
    message:
      typeof payload.message === "string" && payload.message !== ""
        ? payload.message
        : undefined,
    error,
  };
}

export function GenerationProgress({
  jobId,
  initialStage,
  initialProgress,
}: {
  jobId: string;
  initialStage: string;
  initialProgress: number;
}) {
  const router = useRouter();

  const [view, setView] = useState<JobView>({
    stage: initialStage,
    progress: initialProgress,
  });
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    let terminalSeen = false;

    function stop() {
      cancelled = true;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    }

    async function tick() {
      if (cancelled) return;

      if (Date.now() - startedAt > MAX_WAIT_MS) {
        setTimedOut(true);
        stop();
        return;
      }

      // Tab tidak aktif: jangan menembak server, tunggu `visibilitychange`.
      if (document.hidden) {
        timer = setTimeout(tick, POLL_INTERVAL_MS);
        return;
      }

      try {
        const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
          cache: "no-store",
        });

        if (response.ok) {
          const payload = (await response.json()) as JobPayload;

          if (!cancelled) {
            setView((previous) => toView(payload, previous));
          }

          if (payload.stage === "done" || payload.stage === "failed") {
            // `router.refresh()` bisa tiba sebelum halaman melihat status cerita
            // yang baru (halaman masih merender kartu ini karena status story
            // masih `processing`). Kalau polling langsung berhenti di sini,
            // kartu berhenti selamanya di langkah terakhir walaupun cerita sudah
            // tersimpan. Jadi: refresh sekali, lalu terus periksa sampai halaman
            // berhenti merender kartu ini (ringkasan tampil) atau batas waktu
            // tercapai.
            if (!terminalSeen) {
              terminalSeen = true;
              router.refresh();
            }
          }
        }
      } catch {
        // Jaringan putus sementara: biarkan tick berikutnya mencoba lagi.
      }

      if (!cancelled) timer = setTimeout(tick, POLL_INTERVAL_MS);
    }

    function onVisibilityChange() {
      if (document.hidden || cancelled) return;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      void tick();
    }

    void tick();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [jobId, router]);

  const failed = view.stage === "failed";
  const finished = view.stage === "done";
  const currentStep = STEP_INDEX[view.stage] ?? 0;

  return (
    <section
      role="status"
      aria-live="polite"
      className="guru-pixel-card space-y-4 rounded-2xl bg-white p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold text-slate-900">
          <i className="fa-solid fa-gears text-brand-600" aria-hidden />
          {failed
            ? "Pemrosesan gagal"
            : finished
              ? "Menyiapkan ringkasan…"
              : "Sedang diproses…"}
        </h2>
        <span className="font-pixel text-xs font-bold text-slate-500">
          {Math.round(view.progress)}%
        </span>
      </div>

      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200"
        aria-hidden
      >
        <div
          className={`guru-progress-fill h-full rounded-full transition-[width] duration-500 ${
            failed ? "bg-rose-500" : "bg-brand-600"
          }`}
          style={{ width: `${Math.min(100, Math.max(0, view.progress))}%` }}
        />
      </div>

      {failed ? (
        <div className="rounded-xl border-2 border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed text-rose-800">
          <p className="font-bold">
            {view.error?.message ??
              "Cerita gagal dibuat. Coba unggah ulang materi ini."}
          </p>
          <p className="mt-1 text-[11px] text-rose-700">
            Langkah berikutnya: unggah ulang PDF, atau pakai file dengan halaman
            lebih sedikit.
          </p>
        </div>
      ) : (
        <ol className="guru-stagger grid grid-cols-1 gap-2 sm:grid-cols-2">
          {STEPS.map((step, index) => {
            const done = index < currentStep;
            const active = index === currentStep && !timedOut;

            return (
              <li
                key={step.label}
                className={`flex items-center gap-2.5 rounded-xl border-2 px-3 py-2 text-xs ${
                  done
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : active
                      ? "guru-step-active border-brand-300 bg-brand-50 text-brand-800"
                      : "border-slate-200 bg-slate-50 text-slate-500"
                }`}
              >
                <i
                  className={`fa-solid ${
                    done
                      ? "fa-circle-check text-emerald-600"
                      : active
                        ? "fa-spinner animate-spin text-brand-600 motion-reduce:animate-none"
                        : step.icon
                  }`}
                  aria-hidden
                />
                <span className="font-semibold">{step.label}</span>
              </li>
            );
          })}
        </ol>
      )}

      <p className="text-[11px] leading-relaxed text-slate-500">
        {timedOut
          ? "Masih diproses. Boleh ditinggal — buka halaman ini lagi nanti untuk melihat hasilnya."
          : finished
            ? "Selesai. Ringkasan cerita sedang dimuat."
            : "Boleh ditinggal; proses tetap berjalan di server. Halaman ini memeriksa status setiap 1,5 detik."}
      </p>
    </section>
  );
}
