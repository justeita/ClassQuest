import Phaser from "phaser";

import { scoreAnswer, type Answer } from "@/story/scoring";
import type { Story } from "@/story/schema";

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
import {
  assetEntry,
  DEFAULT_CHARACTER_ID,
  resolveSceneLook,
} from "../sceneAssets";

/** Kecepatan pemain: 5 tile/detik = 80 px/detik (world-design.md § Satuan dasar). */
const PLAYER_CONFIG: PlayerConfig = { speed: 80 };

/** Non-speaker diredupkan sesuai scene-format.md (0x9a9a9a). */
const NPC_DIM_COLOR = 0x9a9a9a;

const MUSIC_VOLUME = 0.35;
const MUSIC_VOLUME_PAUSED = 0.12;
const SFX_VOLUME = 0.6;

/** Debounce input lanjut agar satu tekanan tidak melewati dua beat. */
const DEBOUNCE_MS = 150;

export class GameScene extends Phaser.Scene {
  private readonly bus?: GameBus;
  private readonly story: Story;
  private readonly room: RoomMap = DUMMY_ROOM;
  private player?: Phaser.Physics.Arcade.Sprite;
  private keys?: MovementKeys;
  private lanjutKeys?: Record<"space" | "enter", Phaser.Input.Keyboard.Key>;
  private runner: StoryRunner;
  private castNames: Map<string, string>;
  private npcSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private textbox?: Textbox;
  private prompt?: InteractPrompt;
  private background?: Phaser.GameObjects.Image;
  private music?: Phaser.Sound.BaseSound;
  private musicKey: string | null = null;
  private backgroundKey: string | null = null;
  private sceneAktif: string | null = null;
  private readonly playerId: string;
  private lastAdvance = 0;
  /** Jawaban percobaan pertama per challenge; jawaban ulang tidak menimpa. */
  private readonly answers = new AnswerLog();
  private selesaiDikirim = false;
  /** Bab terakhir yang sudah dikirim ke HUD; -1 agar bab pertama ikut terkirim. */
  private chapterTerakhir = -1;

  constructor(story: Story, bus?: GameBus) {
    super("GameScene");
    this.story = story;
    this.bus = bus;
    this.runner = new StoryRunner(story);
    this.castNames = new Map(
      story.cast.map((member) => [member.id, member.name]),
    );
    const pemain =
      story.cast.find((member) => member.role === "player") ?? story.cast[0];
    this.playerId = pemain?.id ?? "";
  }

  create() {
    this.buatAnimasiKarakter();
    this.renderBackground();
    this.renderRoom();

    const pemain =
      this.story.cast.find((member) => member.role === "player") ??
      this.story.cast[0];
    const spritePemain = this.textures.exists(
      pemain?.spriteId ?? DEFAULT_CHARACTER_ID,
    )
      ? (pemain?.spriteId ?? DEFAULT_CHARACTER_ID)
      : DEFAULT_CHARACTER_ID;
    this.player = createPlayer(
      this,
      this.room,
      PLAYER_CONFIG,
      spritePemain,
    ).setDepth(20);
    this.mainkanIdle(this.player, spritePemain);

    this.keys = ambilTombolGerak(this);
    this.lanjutKeys = this.input.keyboard?.addKeys("space,enter") as Record<
      "space" | "enter",
      Phaser.Input.Keyboard.Key
    >;
    this.textbox = createTextbox(this);
    this.prompt = createInteractPrompt(this, this.room);

    // Pemain tertahan oleh dinding dan objek padat ruangan. Bentuknya tidak
    // digambar karena latar dari manifest sudah memuat detail ruangan.
    const wallBodies = this.physics.add.staticGroup();
    for (const wall of this.room.walls) {
      const rect = this.add.rectangle(
        wall.x + wall.width / 2,
        wall.y + wall.height / 2,
        wall.width,
        wall.height,
        this.room.wallColor,
        0,
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

    // Menu jeda di DOM menghentikan/melanjutkan loop scene. State cerita tetap
    // di beat yang sama; hanya presentasi yang membeku. Musik dikecilkan, bukan
    // dihentikan (interaction-loop.md).
    this.bus?.onCommand("pause", () => {
      this.aturVolumeMusik(MUSIC_VOLUME_PAUSED);
      this.scene.pause();
    });
    this.bus?.onCommand("resume", () => {
      this.scene.resume();
      this.aturVolumeMusik(MUSIC_VOLUME);
    });
    this.bus?.onCommand("restart_chapter", () => this.ulangiChapter());
    // Preferensi suara dari HUD/menu jeda diterapkan ke SoundManager global.
    this.bus?.onCommand("set_muted", ({ muted }) => {
      this.sound.mute = muted;
    });

    this.kirimProgres();
    this.terapkanLook(this.runner.getState());
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

    // Saat challenge, input dialog diabaikan — overlay React yang memegang kendali.
    if (this.runner.getState().phase === "challenge") return;

    this.mainkanSfx("sfx_click");
    if (this.textbox?.isTyping()) {
      this.textbox.complete();
      return;
    }
    this.lanjutBeat();
  }

  /** Lanjut dari beat yang sedang tampil ke beat/scene berikutnya. */
  private lanjutBeat() {
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
    this.mainkanSfx(hasil.isCorrect ? "sfx_correct" : "sfx_wrong");
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
    this.kirimProgres();
    this.terapkanLook(state);

    if (state.phase === "done") {
      this.textbox?.hide();
      this.sorotSpeaker(null);
      this.kirimHasil();
      return;
    }

    if (state.phase === "explore" || state.phase === "chapter_end") {
      this.textbox?.hide();
      this.sorotSpeaker(null);
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
      this.sorotSpeaker(beat.speakerId);
      view = {
        name: this.castNames.get(beat.speakerId) ?? beat.speakerId,
        text: beat.text,
        portraitKey: this.portraitKey(beat.speakerId),
      };
    } else {
      this.sorotSpeaker(null);
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

  /**
   * Kabari HUD saat bab berganti. Emisi hanya terjadi sekali per bab supaya
   * setiap beat tidak memicu render React baru.
   */
  private kirimProgres() {
    const state = this.runner.getState();
    if (!state.chapter || state.chapterIndex === this.chapterTerakhir) return;

    this.chapterTerakhir = state.chapterIndex;
    this.bus?.emit({
      type: "progress",
      chapterNumber: state.chapterNumber,
      chapterTotal: state.chapterTotal,
      chapterTitle: state.chapter.title,
    });
  }

  /** "Ulangi chapter" dari menu jeda: reset kursor, lalu lanjutkan loop scene. */
  private ulangiChapter() {
    this.runner.restartChapter();
    this.textbox?.hide();
    this.prompt?.hide();
    this.sorotSpeaker(null);
    this.chapterTerakhir = -1;
    this.sceneAktif = null;
    this.backgroundKey = null;
    this.kembalikanPemain();
    this.kirimProgres();
    this.terapkanLook(this.runner.getState());
    this.scene.resume();
    this.aturVolumeMusik(MUSIC_VOLUME);
  }

  /** Dialog ditahan (bukan ditutup) saat overlay tantangan tampil. */
  private bukaTantangan(challengeId: string) {
    this.textbox?.hide();
    this.sorotSpeaker(null);

    const challenge = this.runner.getChallenge(challengeId);
    if (!challenge || !this.bus) return;

    this.bus.emit({ type: "challenge", view: buildChallengeView(challenge) });
  }

  private presentTransition(withFade: boolean) {
    this.textbox?.hide();
    this.sorotSpeaker(null);

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

  /**
   * Terapkan background + musik untuk scene aktif. Dipanggil setiap beat,
   * tetapi hanya mengubah sesuatu saat scene/bab benar-benar berganti.
   */
  private terapkanLook(state: ReturnType<StoryRunner["getState"]>) {
    const chapter = state.chapter;
    if (!chapter) return;

    const scene =
      state.sceneIndex >= 0 ? chapter.scenes[state.sceneIndex] : null;
    const look = resolveSceneLook(chapter, scene);
    const sceneId = scene?.id ?? null;

    const gantiScene =
      this.sceneAktif !== null &&
      sceneId !== null &&
      this.sceneAktif !== sceneId;
    if (gantiScene) {
      this.mainkanSfx("sfx_page");
      this.kembalikanPemain();
    }
    if (sceneId !== null) this.sceneAktif = sceneId;

    if (this.backgroundKey !== look.backgroundId) {
      const textureKey = this.textures.exists(look.backgroundId)
        ? look.backgroundId
        : "bg_default";
      if (this.background && this.textures.exists(textureKey)) {
        this.background.setTexture(textureKey);
      }
      this.backgroundKey = look.backgroundId;
    }

    this.putarMusik(look.musicId);
  }

  private putarMusik(musicId: string) {
    if (this.musicKey === musicId && this.music?.isPlaying) return;

    this.music?.stop();
    this.music?.destroy();
    this.music = undefined;
    this.musicKey = musicId;

    const key = this.cache.audio.exists(musicId) ? musicId : "bgm_default";
    if (!this.cache.audio.exists(key)) return;

    const music = this.sound.add(key, {
      loop: true,
      volume: MUSIC_VOLUME,
    });
    music.play();
    this.music = music;
  }

  private mainkanSfx(assetId: string) {
    if (!this.cache.audio.exists(assetId)) return;
    this.sound.play(assetId, { volume: SFX_VOLUME });
  }

  /**
   * `BaseSound` tidak menjanjikan `setVolume` (NoAudioSound tidak punya),
   * jadi panggil hanya bila implementasinya tersedia.
   */
  private aturVolumeMusik(volume: number) {
    const musik = this.music as
      | (Phaser.Sound.BaseSound & {
          setVolume?: (value: number) => unknown;
        })
      | undefined;
    musik?.setVolume?.(volume);
  }

  /** Sorot speaker; karakter lain diredupkan (scene-format.md). */
  private sorotSpeaker(speakerId: string | null) {
    if (!speakerId) {
      this.player?.clearTint();
      for (const sprite of this.npcSprites.values()) sprite.clearTint();
      return;
    }

    this.player?.setTint(
      speakerId === this.playerId ? 0xffffff : NPC_DIM_COLOR,
    );
    for (const [id, sprite] of this.npcSprites) {
      sprite.setTint(id === speakerId ? 0xffffff : NPC_DIM_COLOR);
    }
  }

  private portraitKey(speakerId: string): string | null {
    const karakter = this.story.cast.find((member) => member.id === speakerId);
    if (!karakter) return null;
    const entry = assetEntry(karakter.spriteId);
    return entry?.portraitPath ? `${entry.id}:portrait` : null;
  }

  /** Latar full-screen dari manifest; fallback warna ruangan bila gagal. */
  private renderBackground() {
    if (this.textures.exists("bg_default")) {
      this.background = this.add
        .image(0, 0, "bg_default")
        .setOrigin(0)
        .setDepth(-20);
      return;
    }

    this.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        GAME_WIDTH,
        GAME_HEIGHT,
        this.room.floorColor,
      )
      .setDepth(-20);
  }

  /** Bentuk collider + sprite NPC. Detail ruangan sudah ada di background. */
  private renderRoom() {
    for (const npc of this.room.npcs) {
      const karakter = this.story.cast.find((member) => member.id === npc.id);
      const spriteId = karakter?.spriteId ?? DEFAULT_CHARACTER_ID;
      const key = this.textures.exists(spriteId)
        ? spriteId
        : DEFAULT_CHARACTER_ID;

      const sprite = this.add
        .sprite(npc.x, npc.y + npc.height / 2, key, 0)
        .setOrigin(0.5, 1)
        .setDepth(10);
      this.npcSprites.set(npc.id, sprite);
      this.mainkanIdle(sprite, key);
    }
  }

  /** Animasi idle 2 frame dari spritesheet horizontal. */
  private buatAnimasiKarakter() {
    const ids = new Set<string>([DEFAULT_CHARACTER_ID]);
    for (const karakter of this.story.cast) ids.add(karakter.spriteId);

    for (const id of ids) {
      const key = `idle-${id}`;
      if (!this.textures.exists(id) || this.anims.exists(key)) continue;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(id, { start: 0, end: 1 }),
        frameRate: 2,
        repeat: -1,
      });
    }
  }

  private mainkanIdle(sprite: Phaser.GameObjects.Sprite, spriteId: string) {
    const key = `idle-${spriteId}`;
    if (this.anims.exists(key)) sprite.play(key);
  }

  private kembalikanPemain() {
    if (!this.player) return;
    this.player.setPosition(this.room.spawn.x, this.room.spawn.y);
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  }
}
