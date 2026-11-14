"use client";

import { useSyncExternalStore, useState } from "react";

import type { ClassroomDetail } from "@/server/contracts";

import { Modal } from "./Modal";
import { SelectMenu } from "./SelectMenu";
import { useToast } from "./toast";

type ShareGameDialogProps = {
  open: boolean;
  onClose: () => void;
  storyId: string;
  storyTitle: string;
  /** Kelas milik guru; tautan dibuat per kelas. */
  classes: ClassroomDetail[];
};

/**
 * Dialog "Bagikan ke kelas" untuk game terbit.
 *
 * Tautan membawa kode kelas (`/play/[storyId]?kelas=QST-XXXX`). Dari tautan
 * itulah server tahu hasil main harus dicatat ke kelas mana, tanpa siswa perlu
 * login atau memilih kelas sendiri.
 *
 * Tanpa kelas, dialog mengarahkan guru ke `/guru/kelas` alih-alih membuat
 * tautan yang tidak bisa dilacak.
 */

/** `origin` peramban; `""` saat render server. Tidak pernah berubah. */
const originServer = () => "";
const originClient = () => window.location.origin;

export function ShareGameDialog({
  open,
  onClose,
  storyId,
  storyTitle,
  classes,
}: ShareGameDialogProps) {
  const showToast = useToast();
  // `useSyncExternalStore` dipakai supaya markup server (tanpa `window`) dan
  // klien tidak berbeda, tanpa `setState` di dalam effect.
  const origin = useSyncExternalStore(
    () => () => {},
    originClient,
    originServer,
  );
  const [pilihan, setPilihan] = useState("");

  // Dialog selalu dibuka dengan kelas pertama. Bila guru mengganti pilihan,
  // `pilihan` yang dipakai selama kelasnya masih ada di daftar.
  const classroomId =
    pilihan !== "" && classes.some((item) => item.id === pilihan)
      ? pilihan
      : (classes[0]?.id ?? "");
  const classroom = classes.find((item) => item.id === classroomId) ?? null;
  const link =
    classroom === null
      ? ""
      : `${origin}/play/${storyId}?kelas=${encodeURIComponent(classroom.code)}`;

  async function salin() {
    if (link === "") return;
    try {
      await navigator.clipboard.writeText(link);
      showToast("Tautan kelas disalin.", "success");
    } catch {
      showToast(
        "Tidak bisa menyalin otomatis. Salin tautannya manual.",
        "error",
      );
    }
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="bagikan-game-title">
      <div className="space-y-4 p-6">
        <div>
          <h3
            id="bagikan-game-title"
            className="font-heading text-base font-bold text-slate-900"
          >
            Bagikan ke kelas
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Siswa memilih namanya dari daftar kelas sebelum bermain, jadi poin
            dan kesalahannya masuk ke Analytics kelas itu.
          </p>
        </div>

        <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
          {storyTitle}
        </p>

        {classes.length === 0 ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-700">
            Belum ada kelas. Buat kelas dan tambahkan siswa dulu di halaman My
            Classes.
          </p>
        ) : (
          <>
            <div>
              <label
                htmlFor="bagikan-kelas"
                className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500"
              >
                Kelas
              </label>
              <SelectMenu
                id="bagikan-kelas"
                options={classes.map((item) => ({
                  value: item.id,
                  label: item.name,
                  hint: item.code,
                }))}
                value={classroomId}
                onChange={setPilihan}
                placeholder="Pilih kelas…"
                icon={<i className="fa-solid fa-users" aria-hidden />}
              />
            </div>

            <div>
              <label
                htmlFor="bagikan-tautan"
                className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500"
              >
                Tautan siswa
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="bagikan-tautan"
                  readOnly
                  value={link}
                  onFocus={(event) => event.currentTarget.select()}
                  className="min-w-0 flex-1 rounded-xl border-2 border-slate-300 bg-slate-50 px-3 py-2 text-[11px] text-slate-700"
                />
                <button
                  type="button"
                  onClick={salin}
                  className="guru-press-pixel shrink-0 rounded-xl border-2 border-slate-900 bg-brand-600 px-4 py-2 font-pixel text-[10px] font-bold text-white shadow-[2px_2px_0px_#172554] transition hover:bg-brand-700"
                >
                  SALIN
                </button>
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
                Tautan ini hanya untuk kelas {classroom?.name ?? "-"}. Hasil
                main tanpa tautan kelas tidak muncul di Analytics.
              </p>
            </div>
          </>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border-2 border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
          >
            Tutup
          </button>
        </div>
      </div>
    </Modal>
  );
}
