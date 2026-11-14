"use client";

import { useEffect, useState } from "react";

import { Keycap } from "@/components/game/Keycap";
import { kelasTombolHud, type LetakHud } from "@/components/game/gayaHud";
import { ukuranHuruf } from "@/game/layout";
import type { QuestState, QuestStatus } from "@/game/questLog";

type QuestTrackerProps = {
  /** Quest chapter aktif dari event `quest`; null sebelum game siap. */
  view: QuestState | null;
  /** Status apakah buku catatan quest sedang terbuka (mode terkontrol dari parent). */
  terbuka?: boolean;
  /** Callback untuk toggle buka/tutup buku catatan quest. */
  onToggle?: () => void;
  /** Callback untuk menutup buku catatan quest. */
  onTutup?: () => void;
  /** `overlay`: tombol di pojok kanvas. `bar`: tombol statis untuk bar bawah. */
  letak?: LetakHud;
};

const IKON: Record<QuestStatus, string> = {
  selesai: "✓",
  aktif: "▶",
  terkunci: "·",
};

const LABEL: Record<QuestStatus, string> = {
  selesai: "Selesai",
  aktif: "Aktif",
  terkunci: "Terkunci",
};

/**
 * Panel quest dengan jendela buku terbuka ala Minecraft note/journal.
 *
 * Di layar utama hanya ada tombol ringkas di kiri atas: `Quest [Q]`.
 * Saat diklik atau menekan tombol `Q`, muncul jendela buku terbuka
 * dengan dua halaman kertas perkamen:
 * - Halaman kiri: Catatan Bab & Lokasi petualangan aktif.
 * - Halaman kanan: Daftar quest & progres tantangan.
 */
export function QuestTracker({
  view,
  terbuka: terbukaProp,
  onToggle,
  onTutup,
  letak = "overlay",
}: QuestTrackerProps) {
  const [terbukaInternal, setTerbukaInternal] = useState(false);
  const isControlled = terbukaProp !== undefined;
  const terbuka = isControlled ? terbukaProp : terbukaInternal;

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setTerbukaInternal((sebelum) => !sebelum);
    }
  };

  const handleTutup = () => {
    if (onTutup) {
      onTutup();
    } else {
      setTerbukaInternal(false);
    }
  };

  // Shortcut keyboard mandiri hanya jika komponen tidak dikendalikan oleh parent
  useEffect(() => {
    if (isControlled) return;

    function onKeyDown(event: KeyboardEvent) {
      const tag = (event.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (event.key === "q" || event.key === "Q") {
        event.preventDefault();
        setTerbukaInternal((sebelum) => !sebelum);
      } else if (event.key === "Escape" && terbukaInternal) {
        event.preventDefault();
        setTerbukaInternal(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isControlled, terbukaInternal]);

  if (!view) return null;

  const tombolQuest = (
    <button
      type="button"
      onClick={(e) => {
        e.currentTarget.blur();
        handleToggle();
      }}
      aria-expanded={terbuka}
      aria-label="Buka buku catatan quest"
      aria-keyshortcuts="q"
      className={kelasTombolHud(letak)}
    >
      <Keycap>Q</Keycap>
      Quest
    </button>
  );

  return (
    <aside aria-label="Daftar quest" className="font-game">
      {/* Tombol ringkas untuk membuka buku quest (gaya serasi tombol HUD). */}
      {letak === "bar" ? (
        tombolQuest
      ) : (
        <div className="pointer-events-auto absolute left-2 top-2 z-20 font-game text-base leading-tight text-[#F7F4EC]">
          {tombolQuest}
        </div>
      )}

      {/* Jendela Buku Terbuka Minecraft Note / Journal */}
      <div
        className={
          terbuka
            ? "fixed inset-0 z-40 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs"
            : "pointer-events-none fixed -left-[9999px] opacity-0"
        }
      >
        <div
          role="dialog"
          aria-label="Buku Catatan Quest"
          aria-modal={terbuka}
          className="relative flex w-full max-w-[620px] flex-col rounded-2xl border-4 border-[#24140B] bg-[#3D2314] p-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.9)] select-none sm:p-3.5"
        >
          {/* Tombol tutup sudut kanan atas buku */}
          <button
            type="button"
            onClick={handleTutup}
            aria-label="Tutup buku"
            className="absolute -right-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#F7F4EC] bg-[#8C2A1E] font-bold text-[#F7F4EC] hover:bg-[#A8382B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F7F4EC]"
          >
            ✕
          </button>

          {/* Buku terbuka dengan 2 halaman perkamen dan lipatan tengah */}
          <div className="relative grid grid-cols-1 overflow-hidden rounded-xl border border-[#A68A68] bg-[#F4ECC8] text-[#1E160F] sm:grid-cols-2">
            {/* Garis lipatan tengah buku (spine divider) */}
            <div className="pointer-events-none absolute bottom-0 left-1/2 top-0 hidden w-6 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#C8B896]/50 to-transparent sm:block" />

            {/* Halaman Kiri: Bab & Judul Cerita */}
            <div className="flex flex-col justify-between border-b border-[#D8C6A5] p-4 sm:border-b-0 sm:border-r sm:border-[#C8B896] sm:p-5">
              <div>
                <div className="flex items-center justify-between border-b border-[#C8B896]/60 pb-1.5">
                  <span
                    className="font-bold tracking-widest text-[#6E4B2F]"
                    style={{ fontSize: ukuranHuruf(11, 9, 14) }}
                  >
                    Chapter {view.chapterNumber}/{view.chapterTotal}
                  </span>
                  <span aria-hidden="true" className="text-base text-[#8C2A1E]">
                    🔖
                  </span>
                </div>

                <div className="mt-3">
                  <p
                    className="font-bold leading-tight text-[#1E160F]"
                    style={{ fontSize: ukuranHuruf(15, 13, 20) }}
                  >
                    {view.sceneTitle}
                  </p>
                  <p
                    className="mt-1 text-xs italic text-[#5C4532]"
                    style={{ fontSize: ukuranHuruf(12, 10, 16) }}
                  >
                    📍 Bab {view.chapterNumber} Aktif
                  </p>
                </div>

                <div className="my-3 border-t border-dashed border-[#B8A484] text-center text-[10px] text-[#8C7456]">
                  ✦ &nbsp; Catatan Petualang &nbsp; ✦
                </div>

                <p
                  className="leading-relaxed text-[#3D2E20]"
                  style={{ fontSize: ukuranHuruf(12, 10, 15) }}
                >
                  Jelajahi area sekitar, ajak bicara karakter untuk mempelajari
                  materi, dan jawab setiap tantangan dengan tepat!
                </p>
              </div>

              <div className="mt-4 border-t border-[#C8B896]/60 pt-2 text-[11px] text-[#7A644D]">
                <span>Status bab: </span>
                <span className="font-bold text-[#2A5C3B]">
                  Sedang Berjalan
                </span>
              </div>
            </div>

            {/* Halaman Kanan: Daftar Quest & Progres */}
            <div className="flex flex-col justify-between p-4 sm:p-5">
              <div>
                <div className="border-b border-[#C8B896]/60 pb-1.5">
                  <h3
                    className="font-bold uppercase tracking-wider text-[#6E4B2F]"
                    style={{ fontSize: ukuranHuruf(12, 10, 15) }}
                  >
                    Daftar Tugas
                  </h3>
                </div>

                <ol className="mt-2.5 space-y-2">
                  {view.quests.map((quest) => {
                    const aktif = quest.status === "aktif";
                    const selesai = quest.status === "selesai";

                    return (
                      <li
                        key={quest.id}
                        className={`flex items-start gap-2 rounded p-1.5 transition-colors ${
                          aktif
                            ? "border border-[#A68A68] bg-[#E8DCB2] text-[#1E160F]"
                            : selesai
                              ? "text-[#4A6B53]"
                              : "text-[#8C7A65]"
                        }`}
                        style={{ fontSize: ukuranHuruf(12, 10, 16) }}
                      >
                        <span
                          aria-hidden="true"
                          className={`w-4 text-center font-bold ${
                            aktif
                              ? "text-[#1E160F]"
                              : selesai
                                ? "text-[#2A5C3B]"
                                : "text-[#8C7A65]"
                          }`}
                        >
                          {IKON[quest.status]}
                        </span>
                        <div className="min-w-0 flex-1 leading-snug">
                          <span className="sr-only">
                            {LABEL[quest.status]}:{" "}
                          </span>
                          <span
                            className={`break-words ${
                              selesai
                                ? "line-through opacity-80"
                                : aktif
                                  ? "font-bold"
                                  : ""
                            }`}
                          >
                            {quest.title}
                          </span>
                          {quest.tantangan?.total > 0 ? (
                            <span className="ml-1 text-xs font-semibold text-[#6E4B2F]">
                              ({quest.tantangan.dijawab}/{quest.tantangan.total}
                              )
                            </span>
                          ) : (quest as unknown as { progress?: string })
                              .progress ? (
                            <span className="ml-1 text-xs font-semibold text-[#6E4B2F]">
                              (
                              {
                                (quest as unknown as { progress?: string })
                                  .progress
                              }
                              )
                            </span>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>

              <div className="mt-4 border-t border-[#C8B896]/60 pt-2 text-center text-[10px] text-[#7A644D]">
                Tekan <span className="font-bold">[Q]</span> atau{" "}
                <span className="font-bold">[Esc]</span> untuk menutup
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
