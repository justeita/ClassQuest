import Phaser from "phaser";

import { GAME_HEIGHT, GAME_WIDTH } from "../config";
import { DUMMY_ROOM, type RoomMap } from "../map";
import {
  applyMovement,
  createPlayer,
  ambilTombolGerak,
  type MovementKeys,
} from "../movement";
import {
  findNpcInZone,
  createInteractPrompt,
  type InteractPrompt,
} from "../interaction";
import { createTextbox, type BeatView, type Textbox } from "../textbox";
import type { PlayerConfig } from "../types";
import { StoryRunner } from "../StoryRunner";
import { AnswerLog } from "../answerLog";
import { buildChallengeView } from "../challengeView";
import type { GameBus } from "../gameBus";
import { scoreAnswer, type Answer } from "@/story/scoring";
import type { Story } from "@/story/schema";

/** Kecepatan pemain placeholder (piksel/detik) hingga ada pengaturan. */
const PLAYER_CONFIG: PlayerConfig = { speed: 120 };

/** Warna kotak placeholder NPC sampai sprite nyata tersedia. */
const NPC_COLOR = 0x8a9bb0;
/** Non-speaker diredupkan sesuai scene-format.md (0x9a9a9a). */
const NPC_DIM_COLOR = 0x9a9a9a;

/** Debounce input lanjut agar satu tekanan tidak melewati dua beat. */
const DEBOUNCE_MS = 150;

export class GameScene extends Phaser.Scene {
  private readonly bus?: GameBus;
  private readonly story: Story;
  private room: RoomMap = DUMMY_ROOM;
  private player?: Phaser.GameObjects.Rectangle;
  private keys?: MovementKeys;
  private lanjutKeys?: Record<"space" | "enter", Phaser.Input.Keyboard.Key>;
  private runner: StoryRunner;
  private castNames: Map<string, string>;
  private npcBoxes = new Map<string, Phaser.GameObjects.Rectangle>();
  private textbox?: Textbox;
  private prompt?: InteractPrompt;
  private lastAdvance = 0;
  /** Jawaban percobaan pertama per challenge; jawaban ulang tidak menimpa. */
  private readonly answers = new AnswerLog();
  private selesaiDikirim = false;

  constructor(story: Story, bus?: GameBus) {
    super("GameScene");
    this.story = story;
    this.bus = bus;
    this.runner = new StoryRunner(story);
    this.castNames = new Map(
      story.cast.map((member) => [member.id, member.name]),
    );
  }

  create() {
    this.renderRoom();

    this.player = createPlayer(this, this.room, PLAYER_CONFIG);
    this.keys = ambilTombolGerak(this);
    this.lanjutKeys = this.input.keyboard?.addKeys("space,enter") as Record<
      "space" | "enter",
      Phaser.Input.Keyboard.Key
    >;
    this.textbox = createTextbox(this);
    this.prompt = createInteractPrompt(this, this.room);

    // Pemain tertahan oleh dinding dan objek padat ruangan.
    const wallBodies = this.physics.add.staticGroup();
    for (const wall of this.room.walls) {
      const rect = this.add.rectangle(
        wall.x + wall.width / 2,
        wall.y + wall.height / 2,
        wall.width,
        wall.height,
        this.room.wallColor,
      );
      this.physics.add.existing(rect, true);
      wallBodies.add(rect);
    }
    this.physics.add.collider(this.player, wallBodies);

    this.input.on("pointerdown", () => this.onLanjutInput());

    // React mengirim jawaban siswa; penilaian tetap di sisi game (pemegang Story).
    this.bus?.onCommand("submit_answer", ({ answer }) => {
      this.nilaiJawaban(answer);
    });
    // React menutup overlay setelah feedback; cerita lanjut dari sini.
    this.bus?.onCommand("resolve_challenge", () => {
      this.runner.resolveChallenge();
      this.presentBeat();
    });
  }

  update(_time: number, delta: number) {
    const phase = this.runner.getState().phase;

    if (phase === "explore") {
      this.updateExplore();
    } else {
      this.textbox?.tick(delta);
      this.checkLanjutKeys();
    }
  }

  /** Fase explore: gerak bebas, zona interaksi, dan pemicu dialog. */
  private updateExplore() {
    if (this.player) {
      applyMovement(this.player, this.keys);
    }

    const npcId = this.player
      ? findNpcInZone(this.room, this.player.x, this.player.y)
      : null;
    if (npcId) {
      this.prompt?.showAt(npcId);
    } else {
      this.prompt?.hide();
    }

    if (npcId && this.lanjutKeysBaruDitekan()) {
      this.runner.interact();
      this.presentBeat();
    }
  }

  /** Space/Enter saat fase beat: selesaikan teks atau lanjut beat. */
  private checkLanjutKeys() {
    if (!this.lanjutKeysBaruDitekan()) return;
    this.onLanjutInput();
  }

  private lanjutKeysBaruDitekan(): boolean {
    const space = this.lanjutKeys?.space.isDown ?? false;
    const enter = this.lanjutKeys?.enter.isDown ?? false;
    return space || enter;
  }

  /** Satu tekanan = satu langkah: mengetik → selesai; menunggu → lanjut. */
  private onLanjutInput() {
    const now = this.time.now;
    if (now - this.lastAdvance < DEBOUNCE_MS) return;
    this.lastAdvance = now;

    if (this.textbox?.isTyping()) {
      this.textbox.complete();
      return;
    }
    this.lanjutBeat();
  }

  /** Lanjut dari beat yang sedang tampil ke beat/scene berikutnya. */
  private lanjutBeat() {
    // Saat challenge, input dialog diabaikan — overlay React yang memegang kendali.
    if (this.runner.getState().phase === "challenge") return;

    this.runner.advance();
    this.presentBeat();
  }

  /** Nilai jawaban lewat fungsi murni backend, lalu kirim hasil ke React. */
  private nilaiJawaban(answer: Answer) {
    const state = this.runner.getState();
    if (state.phase !== "challenge" || !state.beat) return;

    const challenge = this.runner.getChallenge(answer.challengeId);
    if (!challenge) return;

    // Skor memakai percobaan pertama; jawaban ulang tidak menimpa (interaction-loop.md).
    this.answers.record(answer);

    const hasil = scoreAnswer(challenge, answer);
    this.bus?.emit({
      type: "graded",
      challengeId: hasil.challengeId,
      correct: hasil.isCorrect,
      explanation: challenge.explanation,
    });
  }

  /** Tampilkan beat aktif sesuai fase runner. */
  private presentBeat() {
    const state = this.runner.getState();

    if (state.phase === "done") {
      this.textbox?.hide();
      this.dimNpc(null);
      this.kirimHasil();
      return;
    }

    if (state.phase === "explore" || state.phase === "chapter_end") {
      this.textbox?.hide();
      this.dimNpc(null);
      return;
    }

    const beat = state.beat;
    if (!beat) return;

    // Beat transition tidak menunggu klik: fade 300 ms lalu lanjut otomatis.
    if (beat.type === "transition") {
      this.presentTransition(beat.effect === "fade");
      return;
    }

    if (beat.type === "challenge") {
      this.bukaTantangan(beat.challengeId);
      return;
    }

    let view: BeatView;
    if (beat.type === "dialogue") {
      this.dimNpc(beat.speakerId);
      view = {
        name: this.castNames.get(beat.speakerId) ?? beat.speakerId,
        text: beat.text,
      };
    } else {
      this.dimNpc(null);
      view = { name: null, text: beat.text };
    }
    this.textbox?.show(view);
  }

  /**
   * Kirim ringkasan sekali main ke React saat cerita selesai. `scoreStory`
   * menghitung poin, jumlah benar, dan konsep lemah dari percobaan pertama.
   */
  private kirimHasil() {
    if (this.selesaiDikirim) return;
    this.selesaiDikirim = true;
    this.bus?.emit({
      type: "finished",
      result: this.answers.result(this.story),
    });
  }

  /** Dialog ditahan (bukan ditutup) saat overlay tantangan tampil. */
  private bukaTantangan(challengeId: string) {
    this.textbox?.hide();
    this.dimNpc(null);

    const challenge = this.runner.getChallenge(challengeId);
    if (!challenge || !this.bus) return;

    this.bus.emit({ type: "challenge", view: buildChallengeView(challenge) });
  }

  private presentTransition(withFade: boolean) {
    this.textbox?.hide();
    this.dimNpc(null);

    const lanjut = () => {
      this.runner.advance();
      this.presentBeat();
      if (withFade) this.cameras.main.fadeIn(300, 0, 0, 0);
    };

    if (!withFade) {
      lanjut();
      return;
    }
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", lanjut);
  }

  /** Sorot speaker; NPC lain diredupkan (scene-format.md). */
  private dimNpc(speakerId: string | null) {
    for (const [id, box] of this.npcBoxes) {
      // Shape di Phaser 4 tidak punya setTint; ganti warna isi langsung.
      box.setFillStyle(speakerId === id ? NPC_COLOR : NPC_DIM_COLOR);
    }
  }

  /** Lantai satu warna placeholder; diganti tileset nyata dari manifest nanti. */
  private renderRoom() {
    this.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        GAME_WIDTH,
        GAME_HEIGHT,
        this.room.floorColor,
      )
      .setDepth(-1);

    // NPC placeholder: kotak statis yang bisa disorot saat bicara.
    for (const npc of this.room.npcs) {
      const box = this.add
        .rectangle(npc.x, npc.y, npc.width, npc.height, NPC_COLOR)
        .setDepth(10);
      this.npcBoxes.set(npc.id, box);
    }
  }
}
