import Phaser from "phaser";

import { scoreAnswer, type Answer } from "@/story/scoring";
import type { Story } from "@/story/schema";

import { CAMERA_LERP, deadzonePx, kameraMode } from "../camera";
import { DEPTH_DINDING, DEPTH_LANTAI } from "../depth";
import { roomForScene, type RoomMap } from "../map";
import { resolveRoomData } from "../maps/roomData";
import { TILE_SIZE, type RoomData, type RoomObject } from "../maps/types";
import {
  applyMovement,
  createPlayer,
  ambilTombolGerak,
  arahGerak,
  FRAME_ANIMASI,
  type ArahGerak,
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
  private room!: RoomMap;
  private roomData!: RoomData;
  private player?: Phaser.Physics.Arcade.Sprite;
  private keys?: MovementKeys;
  private lanjutKeys?: Record<"space" | "enter", Phaser.Input.Keyboard.Key>;
  private runner: StoryRunner;
  private castNames: Map<string, string>;
  private npcSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private propSprites = new Map<string, Phaser.GameObjects.GameObject>();
  /** Semua objek ruangan aktif; dihancurkan saat pindah scene. */
  private ruanganObjects: Phaser.GameObjects.GameObject[] = [];
  private wallBodies?: Phaser.Physics.Arcade.StaticGroup;
  private colliderRuangan?: Phaser.Physics.Arcade.Collider;
  private textbox?: Textbox;
  private prompt?: InteractPrompt;
  private music?: Phaser.Sound.BaseSound;
  private musicKey: string | null = null;
  private sceneAktif: string | null = null;
  private readonly playerId: string;
  private spritePemainId = "";
  private arahTerakhir: ArahGerak = "down";
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
    this.pasangRuangan(this.runner.getState());

    const pemain =
      this.story.cast.find((member) => member.role === "player") ??
      this.story.cast[0];
    const spritePemain = this.textures.exists(
      pemain?.spriteId ?? DEFAULT_CHARACTER_ID,
    )
      ? (pemain?.spriteId ?? DEFAULT_CHARACTER_ID)
      : DEFAULT_CHARACTER_ID;
    this.spritePemainId = spritePemain;
    this.arahTerakhir = "down";
    this.player = createPlayer(this, this.room, PLAYER_CONFIG, spritePemain);
    this.colliderRuangan = this.physics.add.collider(
      this.player,
      this.wallBodies!,
    );
    this.pasangKamera();
    this.mainkanIdle(this.player, spritePemain);

    this.keys = ambilTombolGerak(this);
    this.lanjutKeys = this.input.keyboard?.addKeys("space,enter") as Record<
      "space" | "enter",
      Phaser.Input.Keyboard.Key
    >;
    this.textbox = createTextbox(this);
    this.prompt = createInteractPrompt(this, this.room);

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
      // Urutan gambar mengikuti kaki (world-design.md § Perspektif).
      this.player.setDepth(this.player.y);
      this.perbaruiAnimasi(arahGerak(this.keys));
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
    if (gantiScene) this.mainkanSfx("sfx_page");
    if (sceneId !== null) this.sceneAktif = sceneId;

    // Ruangan dibangun dari data map scene aktif (ADR 0010); scene tanpa map
    // khusus memakai template default. Pemain kembali ke spawn hanya saat
    // layout ruangan benar-benar berubah — bukan setiap pindah scene.
    const dataRuang = resolveRoomData(sceneId);
    if (dataRuang !== this.roomData) {
      this.pasangRuangan(state);
      this.kembalikanPemain();
    }

    this.putarMusik(look.musicId);
  }

  /**
   * Bangun ruangan dari data map scene aktif: lantai + dinding tileSprite,
   * sprite prop dan NPC, lalu collider dari objek yang sama yang digambar.
   * `look` masih dipakai untuk musik; latar pemandangan hanya di layar
   * judul/hasil (world-design.md § Lampiran aset latar).
   */
  private pasangRuangan(state: ReturnType<StoryRunner["getState"]>) {
    const sceneId =
      state.sceneIndex >= 0
        ? (state.chapter?.scenes[state.sceneIndex]?.id ?? null)
        : null;
    this.room = roomForScene(sceneId, this.story);
    this.roomData = resolveRoomData(sceneId);

    // Dunia fisika mengikuti ukuran map, bukan layar — kalau tidak, pemain
    // terjepit di kotak tak terlihat 640×360 dan "melompat" ke tepi bawah.
    this.physics.world.setBounds(0, 0, this.room.width, this.room.height);

    this.hancurkanRuang();
    this.renderRuang();

    this.pasangKamera();
  }

  /**
   * Kamera per ruangan (world-design.md § Kamera): batas = ukuran map, ikuti
   * pemain dengan dead zone 8×6 tile dan lerp 0.12 bila map lebih luas dari
   * layar; ruangan seukuran layar dikunci ke tengah.
   */
  private pasangKamera() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.room.width, this.room.height);

    if (kameraMode(this.roomData) === "follow" && this.player) {
      cam.startFollow(this.player, true, CAMERA_LERP, CAMERA_LERP);
      const zona = deadzonePx();
      cam.setDeadzone(zona.width, zona.height);
    } else {
      cam.stopFollow();
    }
    cam.centerOn(this.room.width / 2, this.room.height / 2);
  }

  private hancurkanRuang() {
    for (const object of this.ruanganObjects) object.destroy();
    this.ruanganObjects = [];
    this.propSprites.clear();
    this.npcSprites.clear();
    this.colliderRuangan?.destroy();
    this.colliderRuangan = undefined;
    this.wallBodies?.destroy();
    this.wallBodies = undefined;
  }

  /** Gambar lantai/dinding/prop/NPC dari data, lalu bangun collider-nya. */
  private renderRuang() {
    const room = this.room;

    // Lantai: satu tileSprite penuh; fallback warna bila tile gagal dimuat.
    if (this.textures.exists(room.floorTile)) {
      this.ruanganObjects.push(
        this.add
          .tileSprite(0, 0, room.width, room.height, room.floorTile)
          .setOrigin(0)
          .setDepth(DEPTH_LANTAI),
      );
    } else {
      this.ruanganObjects.push(
        this.add
          .rectangle(
            room.width / 2,
            room.height / 2,
            room.width,
            room.height,
            room.floorColor,
          )
          .setDepth(DEPTH_LANTAI),
      );
    }

    // Dinding dari data (keliling + pita atas), digambar per objek.
    for (const object of this.roomData.objects) {
      if (object.kind === "wall") {
        const width = object.tileW * TILE_SIZE;
        const height = object.tileH * TILE_SIZE;
        const x = object.tileX * TILE_SIZE;
        const y = object.tileY * TILE_SIZE;
        const visual = this.textures.exists(room.wallTile)
          ? this.add.tileSprite(x, y, width, height, room.wallTile).setOrigin(0)
          : this.add.rectangle(
              x + width / 2,
              y + height / 2,
              width,
              height,
              room.wallColor,
            );
        this.ruanganObjects.push(visual.setDepth(DEPTH_DINDING));
        continue;
      }
      if (object.kind === "prop") this.renderProp(object);
      if (object.kind === "npc") this.renderNpc(object);
    }

    // Collider dari data yang sama dengan gambar (ADR 0010).
    this.wallBodies = this.physics.add.staticGroup();
    for (const solid of room.solids) {
      const rect = this.add.rectangle(
        solid.x + solid.width / 2,
        solid.y + solid.height / 2,
        solid.width,
        solid.height,
        room.wallColor,
        0,
      );
      this.physics.add.existing(rect, true);
      this.wallBodies.add(rect);
      this.ruanganObjects.push(rect);
    }
    if (this.player) {
      this.colliderRuangan = this.physics.add.collider(
        this.player,
        this.wallBodies,
      );
    }
  }

  /** Prop digambar berjangkar di kaki; depth mengikuti dasar objek. */
  private renderProp(object: RoomObject) {
    const width = object.tileW * TILE_SIZE;
    const height = object.tileH * TILE_SIZE;
    const x = object.tileX * TILE_SIZE + width / 2;
    const bottom = object.tileY * TILE_SIZE + height;
    const id = object.id ?? "prop_default";
    const key = this.textures.exists(id) ? id : "prop_default";

    if (this.textures.exists(key)) {
      const sprite = this.add
        .sprite(x, bottom, key)
        .setOrigin(0.5, 1)
        .setDepth(bottom);
      this.ruanganObjects.push(sprite);
      this.propSprites.set(id, sprite);
    } else {
      const rect = this.add
        .rectangle(x, bottom - height / 2, width, height, this.room.wallColor)
        .setDepth(bottom);
      this.ruanganObjects.push(rect);
    }
  }

  /** NPC dari cast; digambar di kaki tile yang ditentukan data map. */
  private renderNpc(object: RoomObject) {
    const npc = this.room.npcs.find((entry) => entry.id === (object.id ?? ""));
    const id = npc?.id ?? object.id;
    if (!npc || !id) return;

    const karakter = this.story.cast.find((member) => member.id === id);
    const spriteId = karakter?.spriteId ?? DEFAULT_CHARACTER_ID;
    const key = this.textures.exists(spriteId)
      ? spriteId
      : DEFAULT_CHARACTER_ID;

    const sprite = this.add
      .sprite(npc.x, npc.y + npc.height / 2, key, 0)
      .setOrigin(0.5, 1)
      .setDepth(npc.y + npc.height / 2);
    this.npcSprites.set(id, sprite);
    this.ruanganObjects.push(sprite);
    this.mainkanIdle(sprite, key);
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

  /** Animasi idle 2 frame (2 fps) + jalan 2 frame per arah (6 fps). */
  private buatAnimasiKarakter() {
    const ids = new Set<string>([DEFAULT_CHARACTER_ID]);
    for (const karakter of this.story.cast) ids.add(karakter.spriteId);

    for (const id of ids) {
      if (!this.textures.exists(id)) continue;

      const idle = `idle-${id}`;
      if (!this.anims.exists(idle)) {
        this.anims.create({
          key: idle,
          frames: this.anims.generateFrameNumbers(id, {
            start: FRAME_ANIMASI.idle.start,
            end: FRAME_ANIMASI.idle.end,
          }),
          frameRate: 2,
          repeat: -1,
        });
      }

      const arahJalan = [
        "down",
        "up",
        "left",
        "right",
        "down-left",
        "down-right",
        "up-left",
        "up-right",
      ] as const;
      for (const arah of arahJalan) {
        const key = `jalan-${id}-${arah}`;
        if (this.anims.exists(key)) continue;
        const [start, end] = FRAME_ANIMASI.jalan[arah];
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(id, { start, end }),
          frameRate: 6,
          repeat: -1,
        });
      }
    }
  }

  private mainkanIdle(sprite: Phaser.GameObjects.Sprite, spriteId: string) {
    const key = `idle-${spriteId}`;
    // ignoreIfPlaying: tanpa ini idle direstart tiap frame dan terlihat macet.
    if (this.anims.exists(key)) sprite.play(key, true);
  }

  /**
   * Animasi pemain sesuai arah gerak (world-design.md § Sprite karakter):
   * bergerak → animasi jalan arah itu; berhenti → arah `down` kembali ke idle,
   * arah lain membeku di frame diam supaya tidak berbalik ke depan.
   */
  private perbaruiAnimasi(arah: ArahGerak | null) {
    const sprite = this.player;
    if (!sprite || !this.spritePemainId) return;

    if (!arah) {
      if (this.arahTerakhir === "down") {
        this.mainkanIdle(sprite, this.spritePemainId);
      } else {
        sprite.anims.stop();
        sprite.setFrame(FRAME_ANIMASI.diam[this.arahTerakhir]);
      }
      return;
    }

    this.arahTerakhir = arah;
    const key = `jalan-${this.spritePemainId}-${arah}`;
    if (this.anims.exists(key)) sprite.play(key, true);
  }

  private kembalikanPemain() {
    if (!this.player) return;
    this.player.setPosition(this.room.spawn.x, this.room.spawn.y);
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  }
}
