import type { Answer, PlayResult } from "@/story/scoring";

import type { ChallengeView } from "./challengeView";
import type { QuestState } from "./questLog";

/**
 * Bridge Phaser ↔ React sesuai docs/04-game/engine.md:
 * - Event **dari** Phaser ke React: isi dialog, prompt interaksi, tantangan
 *   dibuka, hasil penilaian, cerita selesai, error.
 * - Command **ke** Phaser: lanjut dialog, jawaban siswa, jeda.
 * Penilaian dijalankan di sisi game (pemegang Story), bukan di overlay.
 */

/**
 * Isi kotak dialog. Teksnya dirender DOM (`DialogueBox.tsx`) supaya tajam;
 * Phaser hanya menggambar panel pixel-nya (ADR 0007).
 */
export type DialogueView = {
  visible: boolean;
  /** Nama speaker; null untuk beat narration. */
  name: string | null;
  /** Bagian teks yang sudah terungkap typewriter. */
  text: string;
  /** Teks sudah penuh dan menunggu pemain melanjutkan. */
  waiting: boolean;
};

/** Chip prompt interaksi; koordinat dalam piksel internal 640×360. */
export type PromptView = {
  text: string;
  x: number;
  y: number;
};

/** Penanda "!" di atas NPC pemberi quest; koordinat layar internal. */
export type NpcMarker = {
  npcId: string;
  x: number;
  y: number;
  /**
   * NPC di luar pandangan, jadi penanda ditempel di tepi layar. Posisinya
   * sudah dijepit ke area aman oleh `posisiPenanda`; panah memakai `sudut`.
   */
  tepi?: boolean;
  /** Arah NPC dalam derajat: 0 = kanan, 90 = bawah (searah CSS rotate). */
  sudut?: number;
};

export type GameEvent =
  | { type: "dialogue"; view: DialogueView }
  | { type: "prompt"; hint: PromptView | null }
  | { type: "markers"; markers: NpcMarker[] }
  | { type: "challenge"; view: ChallengeView }
  | {
      type: "graded";
      challengeId: string;
      correct: boolean;
      explanation: string;
    }
  /**
   * Cerita selesai; `result` dihitung dari percobaan pertama tiap tantangan.
   * `answers` ikut dikirim karena hanya jawaban mentah yang boleh disimpan ke
   * server — skor selalu dihitung ulang di sana (`savePlayResult`).
   */
  | { type: "finished"; result: PlayResult; answers: Answer[] }
  /** Satu beat dialog/narasi tampil penuh; dipakai log dialog (PR D). */
  | {
      type: "log";
      name: string | null;
      text: string;
      sceneJudul: string | null;
    }
  /** Quest chapter aktif berubah; dipakai panel quest di DOM. */
  | { type: "quest"; view: QuestState }
  /** Mode lewati cepat sedang berjalan; dipakai indikator "mempercepat". */
  | { type: "skipping"; aktif: boolean }
  | { type: "error"; code: string };

export type GameCommand =
  | { type: "submit_answer"; challengeId: string; answer: Answer }
  | { type: "resolve_challenge"; challengeId: string; correct: boolean }
  /** Satu langkah dialog: selesaikan ketikan atau lanjut beat berikutnya. */
  | { type: "advance" }
  /**
   * Tahan untuk mempercepat beat dialog/narasi scene ala time-lapse; lepas
   * untuk kembali ke tempo normal. Berhenti sendiri di beat soal, transisi,
   * atau saat scene habis.
   */
  | { type: "skip_start" }
  | { type: "skip_stop" }
  /** Hentikan sementara loop scene; state cerita tetap di tempatnya. */
  | { type: "pause" }
  | { type: "resume" }
  /** Kembali ke awal bab aktif tanpa menghapus catatan jawaban. */
  | { type: "restart_chapter" }
  /** Bisukan/bunyikan seluruh audio Phaser. */
  | { type: "set_audio"; music: number; sfx: number }
  /** Bekukan dunia saat buku log terbuka; musik tetap diputar penuh. */
  | { type: "freeze" }
  | { type: "unfreeze" };

export class GameBus {
  private listeners = new Map<string, Set<(payload: unknown) => void>>();

  /** Daftarkan pendengar; kembalikan fungsi untuk berhenti mendengarkan. */
  on<T extends GameEvent["type"]>(
    type: T,
    handler: (payload: Extract<GameEvent, { type: T }>) => void,
  ): () => void {
    const set = this.listeners.get(type) ?? new Set();
    set.add(handler as (payload: unknown) => void);
    this.listeners.set(type, set);
    return () => {
      set.delete(handler as (payload: unknown) => void);
    };
  }

  emit(event: GameEvent): void {
    const set = this.listeners.get(event.type);
    if (!set) return;
    for (const handler of set) {
      handler(event);
    }
  }

  /** Kirim command ke sisi Phaser (React → game). Bentuk sama dengan emit. */
  send(command: GameCommand): void {
    const set = this.listeners.get(command.type);
    if (!set) return;
    for (const handler of set) {
      handler(command);
    }
  }

  /** Phaser mendaftar pendengar command dari React. */
  onCommand<T extends GameCommand["type"]>(
    type: T,
    handler: (payload: Extract<GameCommand, { type: T }>) => void,
  ): () => void {
    const set = this.listeners.get(type) ?? new Set();
    set.add(handler as (payload: unknown) => void);
    this.listeners.set(type, set);
    return () => {
      set.delete(handler as (payload: unknown) => void);
    };
  }
}
