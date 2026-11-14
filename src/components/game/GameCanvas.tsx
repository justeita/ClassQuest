"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  ChallengeOverlay,
  type GradedView,
} from "@/components/game/ChallengeOverlay";
import { DialogueBox } from "@/components/game/DialogueBox";
import { DialogueLog } from "@/components/game/DialogueLog";
import {
  ChapterCard,
  type ChapterCardView,
} from "@/components/game/ChapterCard";
import { NpcHintLayer } from "@/components/game/NpcHintLayer";
import { QuestToast } from "@/components/game/QuestToast";
import { QuestTracker } from "@/components/game/QuestTracker";
import { Hud } from "@/components/game/HUD";
import { SpeedLines } from "@/components/game/SpeedLines";
import { PauseMenu } from "@/components/game/PauseMenu";
import {
  TouchControls,
  type AksiSentuh,
} from "@/components/game/TouchControls";
import { useLayarPotret, useSentuh } from "@/components/game/useSentuh";
import {
  bacaPengaturanAudio,
  simpanPengaturanAudio,
  type PengaturanAudio,
} from "@/game/audioSettings";
import type { ChallengeView } from "@/game/challengeView";
import {
  tambahEntriDialog,
  tambahEntriKonsep,
  type EntriDialog,
  type EntriKonsep,
} from "@/game/dialogLog";
import type { DialogueView, GameBus } from "@/game/gameBus";
import type { QuestState } from "@/game/questLog";
import type { GameHandle } from "@/game/types";
import type { ArahGerak } from "@/game/world/karakter";
import type { Story } from "@/story/schema";
import type { Answer, PlayResult } from "@/story/scoring";

type GameCanvasProps = {
  /** Cerita yang dimainkan; scene tidak lagi memuat fixture sendiri. */
  story: Story;
  /**
   * Dipanggil sekali saat cerita selesai. `answers` adalah jawaban percobaan
   * pertama yang dipakai layar hasil untuk menyimpan ke server.
   */
  onFinished?: (result: PlayResult, answers: Answer[]) => void;
};

export function GameCanvas({ story, onFinished }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const adaTantangan = useRef(false);
  const gameRef = useRef<GameHandle | null>(null);
  const busRef = useRef<GameBus | null>(null);
  const tombolJedaRef = useRef<HTMLButtonElement>(null);
  const pernahJeda = useRef(false);
  const [tantangan, setTantangan] = useState<ChallengeView | null>(null);
  const [hasil, setHasil] = useState<GradedView | null>(null);
  const [quest, setQuest] = useState<QuestState | null>(null);
  /** Bus game setelah Phaser siap; dipakai lapisan penanda & chip prompt. */
  const [bus, setBus] = useState<GameBus | null>(null);
  const [kartuChapter, setKartuChapter] = useState<ChapterCardView | null>(
    null,
  );
  const [toastQuest, setToastQuest] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogueView | null>(null);
  const [entriLog, setEntriLog] = useState<EntriDialog[]>([]);
  const [jurnal, setJurnal] = useState<EntriKonsep[]>([]);
  const [bukuLog, setBukuLog] = useState(false);
  /**
   * Kotak kanvas relatif terhadap kontainer, dalam piksel CSS. Mode `ENVELOP`
   * membuat kanvas lebih besar dari kontainer (ter-crop di tepi), jadi overlay
   * yang berjangkar dunia harus menempel ke kanvas — bukan ke kontainer.
   */
  const [bingkai, setBingkai] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [jeda, setJeda] = useState(false);
  const [bukuQuest, setBukuQuest] = useState(false);
  /** Time-lapse lewati sedang berjalan; memicu garis kecepatan. */
  const [sedangLewati, setSedangLewati] = useState(false);
  /** Pemain berada di zona NPC: tombol aksi sentuh jadi "Bicara". */
  const [promptAktif, setPromptAktif] = useState(false);
  /** Perangkat sentuh dan orientasi layar menentukan tata letak kontrol. */
  const sentuh = useSentuh();
  const layarPotret = useLayarPotret();
  /**
   * Layar potret sentuh: tombol HUD dipindah ke bar bawah di luar kanvas
   * (layar 16:9 sempit, HUD di dalamnya menutupi dunia), dan teks dialog
   * diperkecil supaya tidak melimpah dari kotaknya.
   */
  const hudBawah = sentuh && layarPotret;
  /** Pengaturan audio pengguna; persist di localStorage, dibaca saat mount. */
  const [audio, setAudio] = useState<PengaturanAudio>(() =>
    bacaPengaturanAudio(
      typeof window === "undefined" ? null : window.localStorage,
    ),
  );
  /** Pelacak perubahan chapter/quest untuk memicu kartu dan toast sekali. */
  const chapterTerakhir = useRef<number | null>(null);
  const questTerakhir = useRef<string | null>(null);

  // Callback disimpan di ref agar pergantian identitas tidak memuat ulang Phaser.
  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  // Lacak kotak kanvas: overlay dunia (dialog, portrait, penanda NPC) ditempel
  // ke bingkai ini supaya posisinya selalu persis di atas dunia, apa pun
  // rasio viewport (mode ENVELOP mem-besarkan kanvas melebihi kontainer).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let pengamatUkuran: ResizeObserver | undefined;
    const perbarui = () => {
      const canvas = container.querySelector("canvas");
      if (!canvas) return;
      const kotakKanvas = canvas.getBoundingClientRect();
      const kotakAkar = container.getBoundingClientRect();
      setBingkai({
        x: kotakKanvas.left - kotakAkar.left,
        y: kotakKanvas.top - kotakAkar.top,
        w: kotakKanvas.width,
        h: kotakKanvas.height,
      });
    };

    // Kanvas muncul setelah import dinamis; tunggu lewat MutationObserver.
    const pengamatTambahan = new MutationObserver(() => {
      const canvas = container.querySelector("canvas");
      if (!canvas) return;
      perbarui();
      pengamatUkuran = new ResizeObserver(perbarui);
      pengamatUkuran.observe(canvas);
      pengamatTambahan.disconnect();
    });
    pengamatTambahan.observe(container, { childList: true });
    window.addEventListener("resize", perbarui);

    return () => {
      pengamatTambahan.disconnect();
      pengamatUkuran?.disconnect();
      window.removeEventListener("resize", perbarui);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    const lepas: (() => void)[] = [];

    void import("@/game/createGame")
      .then(({ createGame }) => {
        if (cancelled) return;
        const game = createGame(container, story);
        container.focus({ preventScroll: true });
        gameRef.current = game;
        busRef.current = game.bus;
        setBus(game.bus);

        // Overlay hanya menerima view tanpa jawaban; penilaian di sisi game.
        lepas.push(
          game.bus.on("log", ({ name, text, sceneJudul }) => {
            setEntriLog((daftar) =>
              tambahEntriDialog(daftar, { name, text, sceneJudul }),
            );
          }),
        );
        lepas.push(
          game.bus.on("challenge", ({ view }) => {
            setHasil(null);
            setTantangan(view);
            setSedangLewati(false);
          }),
        );
        lepas.push(
          game.bus.on("graded", ({ correct, explanation }) => {
            setHasil({ correct, explanation });
            setTantangan((soal) => {
              if (!soal) return soal;
              setJurnal((daftar) =>
                tambahEntriKonsep(daftar, {
                  conceptTag: soal.conceptTag,
                  benar: correct,
                  explanation,
                }),
              );
              return soal;
            });
          }),
        );
        lepas.push(
          game.bus.on("finished", ({ result, answers }) => {
            setTantangan(null);
            setHasil(null);
            setSedangLewati(false);
            onFinishedRef.current?.(result, answers);
          }),
        );
        lepas.push(
          game.bus.on("quest", ({ view }) => {
            setQuest(view);

            if (chapterTerakhir.current !== view.chapterNumber) {
              chapterTerakhir.current = view.chapterNumber;
              setKartuChapter({
                chapterNumber: view.chapterNumber,
                chapterTotal: view.chapterTotal,
                chapterTitle: view.chapterTitle,
              });
            }

            // Toast hanya untuk quest berikutnya, bukan quest pertama sesi.
            if (
              view.activeQuestId &&
              questTerakhir.current !== null &&
              questTerakhir.current !== view.activeQuestId
            ) {
              setToastQuest(view.sceneTitle);
            }
            questTerakhir.current = view.activeQuestId;
          }),
        );
        lepas.push(
          game.bus.on("dialogue", ({ view }) => {
            setDialog(view);
          }),
        );
        lepas.push(
          game.bus.on("detour", ({ aktif }) => {
            // Detour konsekuensi jawaban salah diputar lewat renderer dialog
            // yang sama (story-schema.md). Overlay tantangan harus menutup
            // supaya detour terlihat; soal dibuka ulang oleh event `challenge`
            // yang menyusul.
            //
            // Penutupan overlay **tidak** boleh mengandalkan event `dialogue`:
            // dialog soal tantangan juga tiba sebagai `dialogue`, dan saat
            // dinilai scene mengganti potret lewat `setPortrait` (satu lagi
            // `dialogue`). Dulu keduanya ikut menutup overlay, sehingga kartu
            // umpan balik hilang dan dialog tersangkut di fase challenge.
            if (!aktif) return;
            setTantangan(null);
            setHasil(null);
          }),
        );
        lepas.push(
          game.bus.on("skipping", ({ aktif }) => {
            setSedangLewati(aktif);
          }),
        );
        // Tombol aksi sentuh mengikuti zona NPC, jadi layar cukup tahu ada
        // atau tidak ada prompt — bukan posisinya (itu urusan `NpcHintLayer`).
        lepas.push(
          game.bus.on("prompt", ({ hint }) => {
            setPromptAktif(hint !== null);
          }),
        );
      })
      .catch((error: unknown) => {
        console.error("Gagal memuat game:", error);
      });

    return () => {
      cancelled = true;
      for (const berhenti of lepas) berhenti();
      gameRef.current?.destroy();
      gameRef.current = null;
      busRef.current = null;
    };
  }, [story]);

  const bukaJeda = useCallback(() => {
    busRef.current?.send({ type: "pause" });
    setJeda(true);
  }, []);

  const tutupJeda = useCallback(() => {
    busRef.current?.send({ type: "resume" });
    setJeda(false);
  }, []);

  /** Fokus kembali ke area permainan setelah menu jeda ditutup (bukan tombol Jeda agar Space/Enter tidak memicu jeda). */
  useEffect(() => {
    if (pernahJeda.current && !jeda) {
      containerRef.current?.focus({ preventScroll: true });
    }
    pernahJeda.current = jeda;
  }, [jeda]);

  const pernahBukuQuest = useRef(false);
  useEffect(() => {
    if (pernahBukuQuest.current && !bukuQuest) {
      containerRef.current?.focus({ preventScroll: true });
    }
    pernahBukuQuest.current = bukuQuest;
  }, [bukuQuest]);

  const kirimJawaban = useCallback((answer: Answer) => {
    busRef.current?.send({
      type: "submit_answer",
      challengeId: answer.challengeId,
      answer,
    });
  }, []);

  // Fokus kembali ke area game setelah panel tantangan ditutup (accessibility.md).
  useEffect(() => {
    if (adaTantangan.current && !tantangan) {
      containerRef.current?.focus({ preventScroll: true });
    }
    adaTantangan.current = tantangan !== null;
  }, [tantangan]);

  const lanjut = useCallback(() => {
    const challengeId = tantangan?.id;
    setTantangan(null);
    setHasil(null);
    if (!challengeId) return;
    busRef.current?.send({
      type: "resolve_challenge",
      challengeId,
      correct: hasil?.correct ?? false,
    });
  }, [tantangan, hasil]);

  /** Ubah satu kanal audio, simpan, dan teruskan ke scene. */
  const ubahAudio = useCallback((kanal: "music" | "sfx", volume: number) => {
    setAudio((sebelum) => {
      const berikut = simpanPengaturanAudio(
        { ...sebelum, [kanal]: volume },
        window.localStorage,
      );
      busRef.current?.send({
        type: "set_audio",
        music: berikut.music,
        sfx: berikut.sfx,
      });
      return berikut;
    });
  }, []);

  // Kirim pengaturan tersimpan ke scene tepat setelah game dibuat.
  useEffect(() => {
    busRef.current?.send({
      type: "set_audio",
      music: audio.music,
      sfx: audio.sfx,
    });
    // Hanya sekali per pembuatan game; perubahan lanjutan lewat ubahAudio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ulangiChapter = useCallback(() => {
    setTantangan(null);
    setHasil(null);
    setToastQuest(null);
    setKartuChapter(null);
    setEntriLog([]);
    setJurnal([]);
    setBukuLog(false);
    setSedangLewati(false);
    // Quest pertama setelah restart bukan "quest baru"; jangan munculkan toast.
    questTerakhir.current = null;
    busRef.current?.send({ type: "restart_chapter" });
    tutupJeda();
  }, [tutupJeda]);

  // Kartu chapter dan toast hilang sendiri; tidak ada tombol tutup.
  useEffect(() => {
    if (!kartuChapter) return;
    const timer = setTimeout(() => setKartuChapter(null), 4500);
    return () => clearTimeout(timer);
  }, [kartuChapter]);

  useEffect(() => {
    if (!toastQuest) return;
    const timer = setTimeout(() => setToastQuest(null), 3200);
    return () => clearTimeout(timer);
  }, [toastQuest]);

  // Keyboard shortcut:
  // - Q: buka/tutup buku catatan quest (hanya saat bermain dan tidak sedang mengetik).
  // - Esc: tutup buku quest (jika terbuka), atau buka/tutup jeda.
  //   Saat tantangan aktif, Esc hanya berlaku setelah dijawab (docs/04-game/interaction-loop.md).
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const tag = (event.target as HTMLElement)?.tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA";

      if (event.key === "b" || event.key === "B") {
        if (isInput) return;
        // Yang memblokir buku catatan hanyalah soal, menu jeda, dan buku quest
        // yang sedang terbuka — bukan keberadaan data quest. `quest` selalu
        // terisi sejak event quest pertama; memakai dia di sini membuat B mati
        // sepanjang permainan.
        if (tantangan || jeda || bukuQuest) return;
        event.preventDefault();
        setBukuLog((sebelum) => {
          // Dunia dibekukan selama buku terbuka; musik tetap diputar penuh.
          busRef.current?.send({ type: sebelum ? "unfreeze" : "freeze" });
          return !sebelum;
        });
        return;
      }

      if (event.key === "q" || event.key === "Q") {
        if (isInput) return;
        if (!quest || jeda || tantangan) return;
        event.preventDefault();
        setBukuQuest((sebelum) => !sebelum);
        return;
      }

      if (event.key !== "Escape") return;

      if (bukuLog) {
        event.preventDefault();
        setBukuLog(false);
        busRef.current?.send({ type: "unfreeze" });
        return;
      }

      if (bukuQuest) {
        event.preventDefault();
        setBukuQuest(false);
        return;
      }

      if (tantangan) {
        if (hasil) {
          event.preventDefault();
          lanjut();
        }
        return;
      }

      event.preventDefault();
      if (jeda) {
        tutupJeda();
      } else {
        bukaJeda();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // `bukuLog` dibaca cabang Escape; tanpa dia di deps, closure bisa basi.
  }, [
    bukuLog,
    bukuQuest,
    quest,
    tantangan,
    hasil,
    jeda,
    lanjut,
    bukaJeda,
    tutupJeda,
  ]);

  const lanjutDialog = useCallback(() => {
    busRef.current?.send({ type: "advance" });
  }, []);

  /** Lewati hanya berlaku saat dialog/narasi tampil dan tidak ada soal. */
  const dialogTerlihat = Boolean(dialog?.visible) && !tantangan;

  /**
   * Konteks tombol aksi sentuh: "Bicara" saat pemain di zona NPC, `null` saat
   * belum ada warga di jangkauan. Tidak ada lagi mode "Lanjut": kontrol sentuh
   * disembunyikan selama dialog (ADR 0027), dan lanjut dialog dilakukan dengan
   * mengetuk kotak dialognya.
   */
  const aksiSentuh: AksiSentuh = promptAktif ? "bicara" : null;

  const kirimGerak = useCallback((arah: ArahGerak | null) => {
    busRef.current?.send({ type: "move", arah });
  }, []);

  const kirimAksiSentuh = useCallback(() => {
    busRef.current?.send({ type: "interact" });
  }, []);

  /** Ala Persona 3 Reload: tahan untuk mempercepat, lepas untuk berhenti. */
  const mulaiLewatiDialog = useCallback(() => {
    busRef.current?.send({ type: "skip_start" });
  }, []);

  const hentikanLewatiDialog = useCallback(() => {
    busRef.current?.send({ type: "skip_stop" });
  }, []);

  // Pintasan Tab: sama dengan menahan tombol "Percepat" di HUD. Tab diambil
  // alih hanya selama fase dialog; di luar itu biarkan browser memindahkan
  // fokus seperti biasa (accessibility.md: jangan menangkap Tab secara global).
  useEffect(() => {
    if (!dialogTerlihat) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      // Auto-repeat saat tombol ditahan: skip sudah berjalan, jangan kirim ulang.
      if (event.repeat) return;
      if (jeda || bukuLog || bukuQuest) return;
      event.preventDefault();
      mulaiLewatiDialog();
    }

    function onKeyUp(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      hentikanLewatiDialog();
    }

    // Tab ditahan lalu jendela kehilangan fokus: keyup tidak pernah datang.
    function onBlur() {
      hentikanLewatiDialog();
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [
    dialogTerlihat,
    jeda,
    bukuLog,
    bukuQuest,
    mulaiLewatiDialog,
    hentikanLewatiDialog,
  ]);

  return (
    <div
      className={`h-full w-full touch-manipulation select-none ${
        sentuh ? "relative flex flex-col" : "relative"
      }`}
      style={{ containerType: "size" }}
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        className={`relative focus:outline-none ${
          sentuh
            ? layarPotret
              ? "w-full shrink-0 aspect-video"
              : "min-h-0 flex-1"
            : "h-full w-full"
        }`}
        role="region"
        aria-label="Area permainan ClassQuest"
      >
        {
          <div
            className="absolute"
            style={{
              // Sebelum kanvas terukur (mis. di lingkungan uji), bingkai
              // dipakai seukuran kontainer supaya overlay tetap tampil.
              left: bingkai.w > 0 ? bingkai.x : 0,
              top: bingkai.h > 0 ? bingkai.y : 0,
              width: bingkai.w > 0 ? bingkai.w : "100%",
              height: bingkai.h > 0 ? bingkai.h : "100%",
              containerType: "size",
              // Lebar dunia internal mengikuti kontainer (lihat `lebarKanvas`);
              // overlay memakai angka internal 640 sebagai pembanding, jadi
              // nilai aktualnya dipasang di sini.
              ["--gw" as string]:
                bingkai.h > 0 ? Math.round(360 * (bingkai.w / bingkai.h)) : 640,
            }}
          >
            <NpcHintLayer
              bus={bus}
              tersembunyi={jeda || !!tantangan || !!dialog?.visible}
            />
            {!jeda && !tantangan && <ChapterCard view={kartuChapter} />}
            {!jeda && !tantangan && <QuestToast title={toastQuest} />}
            {!jeda && dialogTerlihat && <SpeedLines aktif={sedangLewati} />}
            {/* DialogueBox tetap ter-render selama masih ada dialog/tantangan
                terakhir: setelah `visible` jadi false ia masih perlu sekali
                waktu untuk animasi tutup (lihat DialogueBox.tsx). */}
            {!jeda && (dialog || tantangan) && (
              <DialogueBox
                view={
                  tantangan
                    ? {
                        visible: true,
                        name:
                          dialog?.name ??
                          story.cast.find((c) => c.role === "mentor")?.name ??
                          "Tantangan",
                        text:
                          tantangan.type === "true_false" && tantangan.statement
                            ? `${tantangan.prompt}
"${tantangan.statement}"`
                            : tantangan.prompt,
                        waiting: false,
                        // Saat soal belum dijawab, sembunyikan kedua potret
                        // supaya tidak menutupi pilihan jawaban; setelah
                        // dinilai, tampilkan lagi untuk umpan balik
                        // senang/marah (yang non-pembicara tetap meredup).
                        portrait: hasil ? (dialog?.portrait ?? null) : null,
                        pendamping: hasil ? (dialog?.pendamping ?? null) : null,
                      }
                    : (dialog ?? {
                        visible: false,
                        name: null,
                        text: "",
                        waiting: false,
                        portrait: null,
                        pendamping: null,
                      })
                }
                onAdvance={lanjutDialog}
                kecil={hudBawah}
              />
            )}

            {!jeda && !hudBawah && (
              <Hud
                musikAktif={audio.music > 0}
                onToggleMusik={() =>
                  ubahAudio("music", audio.music > 0 ? 0 : 1)
                }
                onBukaLog={() => {
                  setBukuLog(true);
                  busRef.current?.send({ type: "freeze" });
                }}
                onMulaiLewati={mulaiLewatiDialog}
                onHentikanLewati={hentikanLewatiDialog}
                tampilLewati={dialogTerlihat}
                onJeda={bukaJeda}
                tombolJedaRef={tombolJedaRef}
              />
            )}
            {tantangan && (
              <ChallengeOverlay
                view={tantangan}
                graded={hasil}
                onSubmit={kirimJawaban}
                onResolve={lanjut}
              />
            )}
            {!jeda && !hudBawah && (
              <QuestTracker
                view={quest}
                terbuka={bukuQuest}
                onToggle={() => setBukuQuest((sebelum) => !sebelum)}
                onTutup={() => setBukuQuest(false)}
              />
            )}
          </div>
        }
      </div>
      {hudBawah && !jeda && (
        <div
          data-hud="bawah"
          className="flex shrink-0 flex-wrap items-center justify-center gap-1.5 border-t border-[#3D4B41] bg-[#0b120e] px-2 py-2 font-game text-sm"
        >
          <QuestTracker
            letak="bar"
            view={quest}
            terbuka={bukuQuest}
            onToggle={() => setBukuQuest((sebelum) => !sebelum)}
            onTutup={() => setBukuQuest(false)}
          />
          <Hud
            letak="bar"
            musikAktif={audio.music > 0}
            onToggleMusik={() => ubahAudio("music", audio.music > 0 ? 0 : 1)}
            onBukaLog={() => {
              setBukuLog(true);
              busRef.current?.send({ type: "freeze" });
            }}
            onMulaiLewati={mulaiLewatiDialog}
            onHentikanLewati={hentikanLewatiDialog}
            tampilLewati={dialogTerlihat}
            onJeda={bukaJeda}
            tombolJedaRef={tombolJedaRef}
          />
        </div>
      )}
      {sentuh && !jeda && !tantangan && !dialogTerlihat && (
        <TouchControls
          mode={layarPotret ? "dek" : "mengapung"}
          onMove={kirimGerak}
          onAksi={kirimAksiSentuh}
          aksi={aksiSentuh}
        />
      )}
      {bukuLog && (
        <DialogueLog
          entriDialog={entriLog}
          entriKonsep={jurnal}
          onTutup={() => {
            setBukuLog(false);
            busRef.current?.send({ type: "unfreeze" });
          }}
        />
      )}
      {jeda && (
        <PauseMenu
          onLanjut={tutupJeda}
          onUlangiChapter={ulangiChapter}
          pengaturan={audio}
          onUbahAudio={ubahAudio}
        />
      )}
    </div>
  );
}
