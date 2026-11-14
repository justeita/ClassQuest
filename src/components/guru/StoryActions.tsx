"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { archiveStory, deleteStory, publishStory } from "@/app/guru/actions";
import type { StoryStatus } from "@/server/contracts";

import { Modal } from "./Modal";
import { useToast } from "./toast";

/**
 * Aksi cerita di halaman detail guru.
 *
 * Semua tombol memanggil Server Action yang sudah ada di
 * `src/app/guru/actions.ts` (`publishStory`, `archiveStory`, `deleteStory`),
 * sesuai kontrak `docs/06-backend/api-contract.md`. Komponen ini tidak
 * menyimpan aturan transisi status sendiri: server yang memutuskan, hasilnya
 * hanya diterjemahkan menjadi pesan.
 *
 * Tombol yang tampil mengikuti tabel status di
 * `docs/05-frontend/teacher-dashboard.md`, dan hapus selalu lewat konfirmasi.
 */
export function StoryActions({
  storyId,
  status,
  version,
  hasStory,
}: {
  storyId: string;
  status: StoryStatus;
  /** Versi terbaru di `story_versions`; 0 berarti belum ada cerita. */
  version: number;
  hasStory: boolean;
}) {
  const router = useRouter();
  const showToast = useToast();

  const [busy, setBusy] = useState<"publish" | "archive" | "delete" | null>(
    null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  const canPublish = hasStory && (status === "draft" || status === "published");
  const canArchive =
    status === "draft" || status === "published" || status === "failed";
  const canDelete =
    status === "draft" || status === "failed" || status === "archived";

  async function terbitkan() {
    if (busy) return;
    setBusy("publish");

    try {
      const result = await publishStory({ storyId, version });

      if (result.ok) {
        showToast(
          status === "published"
            ? "Versi terbaru sudah dibagikan ke siswa."
            : "Cerita sudah dibagikan. Tautannya siap dipakai siswa.",
          "success",
        );
        router.refresh();
      } else if ("conflict" in result) {
        showToast(
          "Cerita sudah berubah di tempat lain. Muat ulang halaman ini dulu.",
          "error",
        );
      } else {
        showToast(
          result.errors[0]?.message ?? "Cerita belum bisa dibagikan.",
          "error",
        );
      }
    } catch {
      showToast("Gagal membagikan cerita. Coba lagi.", "error");
    }

    setBusy(null);
  }

  async function arsipkan() {
    if (busy) return;
    setBusy("archive");

    try {
      const result = await archiveStory({ storyId });

      if (result.ok) {
        showToast(
          status === "published"
            ? "Cerita ditarik dari siswa dan kembali menjadi draft."
            : "Cerita diarsipkan.",
          "info",
        );
        router.refresh();
      } else {
        showToast("Cerita tidak bisa diarsipkan sekarang.", "error");
      }
    } catch {
      showToast("Gagal mengarsipkan cerita. Coba lagi.", "error");
    }

    setBusy(null);
  }

  async function hapus() {
    if (busy) return;
    setBusy("delete");

    try {
      const result = await deleteStory({ storyId });

      if (result.ok) {
        setConfirmOpen(false);
        showToast("Materi dihapus permanen.", "info");
        router.push("/guru/materi");
        router.refresh();
        return;
      }

      setConfirmOpen(false);
      showToast(
        "Cerita ini belum bisa dihapus. Tarik dulu dari siswa, lalu coba lagi.",
        "error",
      );
    } catch {
      showToast("Gagal menghapus materi. Coba lagi.", "error");
    }

    setBusy(null);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canPublish ? (
        <button
          type="button"
          onClick={terbitkan}
          disabled={busy !== null}
          className="guru-press-pixel flex items-center gap-2 rounded-xl border-2 border-slate-900 bg-brand-600 px-4 py-2.5 font-pixel text-xs font-bold text-white shadow-[3px_3px_0px_#172554] transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <i className="fa-solid fa-share-nodes" aria-hidden />
          <span>{busy === "publish" ? "MEMBAGIKAN…" : "BAGIKAN"}</span>
        </button>
      ) : null}

      {status === "published" ? (
        <Link
          href={`/play/${storyId}`}
          className="guru-press flex items-center gap-2 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
        >
          <i className="fa-solid fa-play" aria-hidden />
          <span>Buka game</span>
        </Link>
      ) : null}

      {canArchive ? (
        <button
          type="button"
          onClick={arsipkan}
          disabled={busy !== null}
          className="guru-press flex items-center gap-2 rounded-xl border-2 border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <i className="fa-solid fa-box-archive" aria-hidden />
          <span>{busy === "archive" ? "Mengarsipkan…" : "Arsipkan"}</span>
        </button>
      ) : null}

      {canDelete ? (
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={busy !== null}
          className="guru-press flex items-center gap-2 rounded-xl border-2 border-rose-200 px-4 py-2.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <i className="fa-solid fa-trash-can" aria-hidden />
          <span>Hapus</span>
        </button>
      ) : null}

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        labelledBy="hapus-materi-title"
        width="max-w-md"
      >
        <div className="space-y-3 p-6">
          <h3
            id="hapus-materi-title"
            className="font-heading text-base font-bold text-slate-900"
          >
            Hapus materi ini?
          </h3>
          <p className="text-xs leading-relaxed text-slate-600">
            Cerita, semua versinya, dan hasil bermain siswa ikut terhapus dan
            tidak bisa dikembalikan.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t-2 border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={() => setConfirmOpen(false)}
            className="guru-press rounded-xl border-2 border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={hapus}
            disabled={busy !== null}
            className="guru-press rounded-xl border-2 border-rose-300 bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy === "delete" ? "Menghapus…" : "Ya, hapus permanen"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
