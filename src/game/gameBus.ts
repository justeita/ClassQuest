import type { Answer, PlayResult } from "@/story/scoring";

import type { ChallengeView } from "./challengeView";
import type { KursorProgres } from "./progress";
import type { QuestState } from "./questLog";
import type { PortraitView } from "./textbox";
import type { ArahGerak } from "./world/karakter";

/**
 * Bridge Phaser ↔ React sesuai docs/04-game/engine.md:
 * - Event **dari** Phaser ke React: isi dialog, prompt interaksi, tantangan
 *   dibuka, hasil penilaian, cerita selesai, error.
 * - Command **ke** Phaser: lanjut dialog, jawaban siswa, jeda.
 * Penilaian dijalankan di sisi game (pemegang Story), bukan di overlay.
 */

/**
 * Isi kotak dialog. Panel, potret, nama, dan teks semuanya dirender DOM
 * (`DialogueBox.tsx`) supaya tajam; Phaser hanya memegang state typewriter
 * (ADR 0007 + ADR 0023).
 */
export type DialogueView = {
  visible: boolean;
  /** Nama speaker; null untuk beat narration. */
  name: string | null;
  /** Bagian teks yang sudah terungkap typewriter. */
  text: string;
  /** Teks sudah penuh dan menunggu pemain melanjutkan. */
  waiting: boolean;
  /** Potret pembicara yang menyala di atas kotak dialog; null bila tidak ada. */
  portrait: PortraitView | null;
  /**
   * Potret lawan bicara (MC saat NPC yang bicara, atau sebaliknya). Selama
   * giliran satu pihak, potretnya menyala dan yang ini meredup; null bila tidak
   * ada pasangan.
   */
  pendamping?: PortraitView | null;
};

/**
 * Kotak prompt interaksi; koordinat dalam piksel internal 640×360.
 *
 * `menempel` membedakan dua asal prompt supaya tampilannya konsisten dengan
 * konteksnya: **true** untuk pemberi quest — saat `!` terlihat, kotak duduk
 * rapat di sampingnya dan meluncur keluar darinya; **false** untuk obrolan
 * singkat (ADR 0016) — tidak ada penanda, jadi kotak muncul sebagai pop-up
 * halus. Kotak yang tampil sendiri selalu dipusatkan di atas NPC, termasuk
 * kotak pemberi quest saat penandanya sedang jadi beacon tepi layar.
 */
export type PromptView = {
  text: string;
  x: number;
  y: number;
  menempel: boolean;
};

/**
 * Penanda pemberi quest; koordinat layar internal.
 *
 * `tepi: true` berarti NPC di luar pandangan: `x`/`y` sudah dijepit ke area
 * aman di tepi layar dan `sudut` dipakai penunjuk beacon. Di mode dekat,
 * penanda dirender sebagai kotak `!` bergaya HUD di atas papan nama.
 */
export type NpcMarker = {
  npcId: string;
  x: number;
  y: number;
  tepi?: boolean;
  /** Arah NPC dalam derajat: 0 = kanan, 90 = bawah. */
  sudut?: number;
};

/** Papan nama NPC di atas kepala; koordinat layar internal. */
export type NpcNameplate = {
  npcId: string;
  /** Nama tampilan dari `story.cast`. */
  nama: string;
  x: number;
  y: number;
};

export type GameEvent =
  /**
   * Aset cerita sedang dimuat; `progress` 0–1 dari loader Phaser. Dipakai
   * layar muat DOM (`LoadingScreen`), bukan teks di canvas.
   */
  | { type: "loading"; progress: number }
  /**
   * Scene pertama sudah dibangun (dunia, pemain, kamera). Layar muat DOM
   * memudar setelah event ini, jadi tidak pernah ada kanvas kosong yang terlihat.
   */
  | { type: "ready" }
  | { type: "dialogue"; view: DialogueView }
  | { type: "prompt"; hint: PromptView | null }
  | { type: "markers"; markers: NpcMarker[] }
  | { type: "nametags"; plates: NpcNameplate[] }
  | { type: "challenge"; view: ChallengeView }
  /**
   * Konsekuensi jawaban salah sedang diputar (beat `onWrong.detour`).
   *
   * Dikirim sebagai event tersendiri, bukan disimpulkan React dari `dialogue`:
   * dialog soal tantangan juga tiba sebagai `dialogue`, dan saat dinilai scene
   * mengganti potret lewat `setPortrait` (satu lagi `dialogue`). Menutup overlay
   * pada tiap `dialogue` karena itu menghapus kartu umpan balik dan menyangkutkan
   * dialog di fase challenge. `aktif: true` saat detour mulai, `false` saat soal
   * dibuka ulang (event `challenge` menyusul).
   */
  | { type: "detour"; aktif: boolean }
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
  /**
   * Kursor cerita (bab/scene/beat) dan jawaban percobaan pertama berubah.
   * React yang menulisnya ke `localStorage` (`src/game/progress.ts`) supaya
   * scene tidak perlu tahu soal storage; refresh melanjutkan dari scene ini.
   */
  | { type: "progress"; view: KursorProgres }
  /** Mode lewati cepat sedang berjalan; dipakai indikator "mempercepat". */
  | { type: "skipping"; aktif: boolean }
  | { type: "error"; code: string };

export type GameCommand =
  | { type: "submit_answer"; challengeId: string; answer: Answer }
  | { type: "resolve_challenge"; challengeId: string; correct: boolean }
  /** Satu langkah dialog: selesaikan ketikan atau lanjut beat berikutnya. */
  | { type: "advance" }
  /**
   * Arah gerak dari joystick layar sentuh; `null` saat tongkat dilepas. Sama
   * artinya dengan tombol gerak yang sedang ditekan, jadi aturan gerak dan
   * animasi tetap satu jalur (`GameScene.gerakkanPemain`).
   */
  | { type: "move"; arah: ArahGerak | null }
  /**
   * Tombol aksi sentuh saat fase explore: sama dengan menekan Space/Enter di
   * dekat NPC — memicu dialog pemberi quest atau obrolan singkat.
   */
  | { type: "interact" }
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
