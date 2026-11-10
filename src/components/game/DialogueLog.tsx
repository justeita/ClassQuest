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
 * `pointer-events-auto` karena menutupi seluruh layar saat terbuka.
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
      className="absolute inset-0 z-40 flex items-center justify-center bg-[#0b120e]/85 p-3"
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
        className="max-h-full w-full max-w-2xl overflow-hidden border-2 border-[#F7F4EC] bg-[#14201a] font-sans text-[#F7F4EC] shadow-[4px_4px_0_0_rgba(0,0,0,0.45)] outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[#3D4B41] px-4 py-2.5">
          <h2
            id="judul-log"
            className="text-sm font-bold uppercase tracking-widest"
          >
            Buku catatan
          </h2>
          <button
            type="button"
            onClick={onTutup}
            aria-label="Tutup buku catatan"
            className="border border-[#3D4B41] px-2 py-1 text-[10px] uppercase tracking-wide text-[#D9E4DA] hover:border-[#8FA396] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C]"
          >
            Tutup
          </button>
        </header>

        <div
          role="tablist"
          aria-label="Jenis catatan"
          className="flex border-b border-[#3D4B41]"
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
              className={`flex-1 px-3 py-2 text-xs font-bold uppercase tracking-widest focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#E8A87C] ${
                tab === nilai
                  ? "bg-[#E8A87C]/15 text-[#E8A87C]"
                  : "text-[#8FA396] hover:text-[#D9E4DA]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          className="max-h-[60vh] overflow-y-auto px-4 py-3 text-sm leading-relaxed"
        >
          {tab === "dialog" ? (
            entriDialog.length === 0 ? (
              <p className="py-6 text-center text-[#8FA396]">
                Belum ada dialog. Bicara dengan NPC untuk mengisinya.
              </p>
            ) : (
              kelompok.map((grup, index) => (
                <div key={`${grup.sceneJudul ?? "narasi"}-${index}`}>
                  <p className="mt-2 mb-2 border-b border-[#3D4B41] pb-1.5 text-[10px] font-bold uppercase tracking-widest text-[#8FA396]">
                    {grup.sceneJudul ?? "Perjalanan"}
                  </p>
                  <ul className="space-y-2.5">
                    {grup.entri.map((entri, i) => (
                      <li key={`${index}-${i}`}>
                        {entri.name && (
                          <span className="mr-2 border border-[#3D4B41] bg-[#E8A87C]/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#E8A87C]">
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
                  className="border border-[#3D4B41] p-2.5"
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
