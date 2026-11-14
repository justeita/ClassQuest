"use client";

import { useEffect, useRef, useState } from "react";

import {
  kelompokkanPerScene,
  type EntriDialog,
  type EntriKonsep,
} from "@/game/dialogLog";

type DialogueLogProps = {
  entriDialog: EntriDialog[];
  entriKonsep: EntriKonsep[];
  onTutup: () => void;
};

type Tab = "dialog" | "konsep";

/**
 * Buku catatan dialog (PR D): dua tab seperti halaman jurnal — riwayat dialog
 * dan jurnal konsep. Dibuka dengan `B`; dunia dibekukan selama terbuka.
 *
 * Overlay DOM penuh (bukan canvas) supaya teksnya selalu tajam, dan dibuat
 * `pointer-events-auto` karena menutupi seluruh layar saat terbuka. Kartunya
 * **membulat** dengan aksen oranye, dan area bacanya memakai scrollbar bertema
 * (`scrollbar-tema`) — bukan scrollbar bawaan peramban — supaya tetap seragam
 * dengan HUD, dialog, dan menu jeda (ADR 0026).
 */
export function DialogueLog({
  entriDialog,
  entriKonsep,
  onTutup,
}: DialogueLogProps) {
  const [tab, setTab] = useState<Tab>("dialog");
  const panelRef = useRef<HTMLDivElement>(null);

  // Fokus masuk ke panel saat terbuka supaya Esc dan navigasi tab langsung jalan.
  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, []);

  const kelompok = kelompokkanPerScene(entriDialog);

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-[#0b120e]/85 p-3 backdrop-blur-sm"
      onClick={onTutup}
    >
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="judul-log"
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setTab("dialog");
          if (e.key === "ArrowRight") setTab("konsep");
        }}
        className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#E8A87C]/30 bg-[#14201a] font-sans text-[#F7F4EC] shadow-[0_26px_60px_-24px_rgba(0,0,0,0.9)] outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-[#E8A87C]/20 bg-[#0b120e]/50 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="h-5 w-1 rounded-full bg-[#E8A87C]" />
            <h2
              id="judul-log"
              className="text-sm font-bold uppercase tracking-widest"
            >
              Buku catatan
            </h2>
          </div>
          <button
            type="button"
            onClick={onTutup}
            aria-label="Tutup buku catatan"
            className="rounded-lg border border-[#3D4B41] px-2.5 py-1 text-[10px] uppercase tracking-wide text-[#D9E4DA] transition-colors hover:border-[#E8A87C] hover:text-[#E8A87C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C]"
          >
            Tutup
          </button>
        </header>

        <div
          role="tablist"
          aria-label="Jenis catatan"
          className="flex gap-1 border-b border-[#3D4B41] px-2 pt-2"
        >
          {(
            [
              ["dialog", `Dialog (${entriDialog.length})`],
              ["konsep", `Konsep (${entriKonsep.length})`],
            ] as const
          ).map(([nilai, label]) => (
            <button
              key={nilai}
              role="tab"
              type="button"
              aria-selected={tab === nilai}
              onClick={() => setTab(nilai)}
              className={`flex-1 rounded-t-lg px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#E8A87C] ${
                tab === nilai
                  ? "bg-[#E8A87C]/15 text-[#E8A87C]"
                  : "text-[#8FA396] hover:bg-[#E8A87C]/5 hover:text-[#D9E4DA]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          className="scrollbar-tema max-h-[60vh] overflow-y-auto px-4 py-3 text-sm leading-relaxed"
        >
          {tab === "dialog" ? (
            entriDialog.length === 0 ? (
              <p className="py-6 text-center text-[#8FA396]">
                Belum ada dialog. Bicara dengan NPC untuk mengisinya.
              </p>
            ) : (
              kelompok.map((grup, index) => (
                <div key={`${grup.sceneJudul ?? "narasi"}-${index}`}>
                  <p className="mt-2 mb-2 border-b border-[#3D4B41] pb-1.5 text-[10px] font-bold uppercase tracking-widest text-[#E8A87C]">
                    {grup.sceneJudul ?? "Perjalanan"}
                  </p>
                  <ul className="space-y-2.5">
                    {grup.entri.map((entri, i) => (
                      <li key={`${index}-${i}`}>
                        {entri.name && (
                          <span className="mr-2 inline-block rounded border border-[#3D4B41] bg-[#E8A87C]/15 px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-[#E8A87C]">
                            {entri.name}
                          </span>
                        )}
                        {entri.name === null && (
                          <span className="mr-2 text-[10px] font-bold uppercase tracking-wide text-[#8FA396]">
                            Narasi
                          </span>
                        )}
                        <span className="text-[#D9E4DA]">{entri.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )
          ) : entriKonsep.length === 0 ? (
            <p className="py-6 text-center text-[#8FA396]">
              Belum ada konsep. Jawab tantangan untuk mengisinya.
            </p>
          ) : (
            <ul className="space-y-3">
              {entriKonsep.map((entri) => (
                <li
                  key={entri.conceptTag}
                  className="rounded-lg border border-[#3D4B41] bg-[#0b120e]/40 p-2.5"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#8FA396]">
                      {entri.conceptTag}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wide ${
                        entri.benar ? "text-[#6F9B7A]" : "text-[#C9A227]"
                      }`}
                    >
                      {entri.benar ? "Tepat" : "Perlu diulang"}
                    </span>
                  </div>
                  <p className="text-[#D9E4DA]">{entri.explanation}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="border-t border-[#3D4B41] px-4 py-2 text-[10px] text-[#8FA396]">
          B tutup buku · ←/→ ganti halaman · Esc untuk melanjutkan cerita
        </p>
      </section>
    </div>
  );
}
