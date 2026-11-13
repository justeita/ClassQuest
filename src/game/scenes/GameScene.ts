import Phaser from "phaser";

import { scoreAnswer, type Answer } from "@/story/scoring";
import type { Story } from "@/story/schema";

import { clampVolume } from "../audioSettings";
import { CAMERA_LERP, deadzonePx, kameraMode } from "../camera";
import { DEPTH_LATAR } from "../depth";
import {
  ambilTombolGerak,
  arahGerak,
  DT_MAKSIMUM,
  langkahPemain,
  type MovementKeys,
} from "../movement";
import { findNpcInZone, posisiPrompt } from "../interaction";
import { dalamLayar, duniaKeLayar, type KameraView } from "../layar";
import { createTextbox, type BeatView, type Textbox } from "../textbox";
import { StoryRunner, bolehTerusLewati } from "../StoryRunner";
import { AnswerLog } from "../answerLog";
import { buildChallengeView } from "../challengeView";
import type { GameBus, NpcMarker, PromptView } from "../gameBus";
import { buildQuestState, pilihPemberiQuest } from "../questLog";
import {
  assetEntry,
  DEFAULT_CHARACTER_ID,
  resolveSceneLook,
} from "../sceneAssets";
import { buatTabrakan, type Tabrakan } from "../world/collision";
import {
  FRAME_ARAH,
  TINGGI_KARAKTER,
  ukuranKarakter,
  type ArahGerak,
} from "../world/karakter";
import { SPAWN_PEMAIN, VILLAGE } from "../world/village";

/** Non-speaker diredupkan sesuai scene-format.md (0x9a9a9a). */
const NPC_DIM_COLOR = 0x9a9a9a;

/** Faktor dasar dari sisi game; volume pengguna mengalikan angka ini. */
const MUSIC_VOLUME = 0.35;
const MUSIC_VOLUME_PAUSED = 0.12;
const SFX_VOLUME = 0.6;

/** Debounce input lanjut agar satu tekanan tidak melewati dua beat. */
const DEBOUNCE_MS = 150;

/**
 * Jarak antar-beat saat mode lewati berjalan. Cukup cepat untuk terasa seperti
 * time-lapse, cukup lambat agar teks masih sempat terbaca sekilas.
 */
const INTERVAL_LEWATI_MS = 100;

/**
 * Jarak minimum antar-emisi posisi prompt/penanda. Posisi berubah setiap frame
 * saat kamera bergeser, tetapi DOM tidak perlu dirender 60 kali per detik.
 */
const PETUNJUK_INTERVAL_MS = 90;

/** Jarak penanda "!" di atas ubun-ubun sprite NPC. */
const MARKER_OFFSET_Y = 10;

/**
 * Scene permainan: satu dunia desa yang dibangun **sekali**, lalu dijalankan
 * sepanjang cerita.
 *
 * Peta, objek, dan NPC berasal dari `VILLAGE` (`world/village.json`, hasil
 * `scripts/import-world.mjs`) dan digambar apa adanya: objek berjangkar
 * kiri-atas dengan urutan `depth` dari data, karakter berjangkar di titik kaki.
 * Perpindahan chapter **tidak** membangun ulang dunia dan **tidak** memindahkan
 * pemain; hanya `ulangiChapter` yang mengembalikannya ke titik mulai.
 *
 * Gerak dan tabrakan bukan fisika Phaser: `world/collision.ts` menyalin rumus
 * editor peta, jadi apa yang terlihat di editor sama dengan yang dirasakan
 * pemain.
 */
export class GameScene extends Phaser.Scene {
  private readonly bus?: GameBus;
  private readonly story: Story;
  private player?: Phaser.GameObjects.Sprite;
  private keys?: MovementKeys;
  private lanjutKeys?: Record<"space" | "enter", Phaser.Input.Keyboard.Key>;
  private runner: StoryRunner;
  private castNames: Map<string, string>;
  private npcSprites = new Map<string, Phaser.GameObjects.Sprite>();
  /** Semua objek dunia (peta, potongan objek, NPC); dibangun sekali. */
  private duniaObjects: Phaser.GameObjects.GameObject[] = [];
  private tabrakan!: Tabrakan;
  private textbox?: Textbox;
  private music?: Phaser.Sound.BaseSound;
  private musicKey: string | null = null;
  private volumeMusik = 1;
  private volumeSfx = 1;
  private volumeSedangJeda = false;
  private sceneAktif: string | null = null;
  /** NPC pemegang quest scene aktif; hanya dia yang bisa memicu dialog. */
  private pemberiQuest: string | null = null;
  /** Pembicara beat dialog terakhir; dipakai sebagai nama speaker saat tantangan. */
  private pembicaraTerakhir: string | null = null;
  private readonly playerId: string;
  private spritePemainId = "";
  private arahTerakhir: ArahGerak = "down";
  private lastAdvance = 0;
  /** Mode lewati ditahan (ala Persona 3 Reload): beat maju cepat selama ditahan. */
  private lewatiDitahan = false;
  /** Waktu langkah lewati terakhir, untuk menjeda antar-beat. */
  private waktuLewati = 0;
  /** Jawaban percobaan pertama per challenge; jawaban ulang tidak menimpa. */
  private readonly answers = new AnswerLog();
  private selesaiDikirim = false;
  /** Sidik quest terakhir yang dikirim; mencegah render React tiap beat. */
  private questTerakhir = "";
  /** Sidik posisi prompt/penanda terakhir; mencegah emisi saat tidak berubah. */
  private tandaPrompt = "";
  private tandaMarker = "";
  private waktuPetunjuk = 0;

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
    this.bangunDunia();

    const pemain =
      this.story.cast.find((member) => member.role === "player") ??
      this.story.cast[0];
    this.spritePemainId =
      pemain && this.textures.exists(pemain.spriteId)
        ? pemain.spriteId
        : DEFAULT_CHARACTER_ID;

    this.player = this.buatKarakter(
      SPAWN_PEMAIN.x,
      SPAWN_PEMAIN.y,
      this.spritePemainId,
      FRAME_ARAH[this.arahTerakhir],
    );
    this.pasangKamera();

    this.keys = ambilTombolGerak(this);
    this.lanjutKeys = this.input.keyboard?.addKeys("space,enter") as Record<
      "space" | "enter",
      Phaser.Input.Keyboard.Key
    >;
    this.input.keyboard?.disableGlobalCapture();
    this.input.keyboard?.clearCaptures();
    // Teks dialog dirender DOM (DialogueBox.tsx) supaya tajam; scene tetap
    // pemegang state typewriter dan mengirim potongannya lewat bus.
    this.textbox = createTextbox(this, (state) => {
      this.bus?.emit({ type: "dialogue", view: state });
    });

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
    // Klik pada panel dialog DOM (atau tombol lanjut) masuk lewat jalur yang
    // sama dengan Space/Enter, jadi aturan "satu tekanan satu langkah" tetap.
    this.bus?.onCommand("advance", () => this.onLanjutInput());
    // Tombol/pintasan Percepat: tahan untuk time-lapse, lepas untuk berhenti.
    this.bus?.onCommand("skip_start", () => this.mulaiLewati());
    this.bus?.onCommand("skip_stop", () => this.hentikanLewati());

    // Menu jeda di DOM menghentikan/melanjutkan loop scene. State cerita tetap
    // di beat yang sama; hanya presentasi yang membeku. Musik dikecilkan, bukan
    // dihentikan (interaction-loop.md).
    this.bus?.onCommand("pause", () => {
      this.hentikanLewati();
      this.volumeSedangJeda = true;
      this.terapkanVolume();
      this.scene.pause();
    });
    this.bus?.onCommand("resume", () => {
      this.scene.resume();
      this.volumeSedangJeda = false;
      this.terapkanVolume();
    });
    this.bus?.onCommand("restart_chapter", () => this.ulangiChapter());
    // Buku log membekukan dunia tanpa mengecilkan musik (PR D).
    this.bus?.onCommand("freeze", () => {
      this.hentikanLewati();
      this.scene.pause();
    });
    this.bus?.onCommand("unfreeze", () => this.scene.resume());
    // Preferensi suara dari HUD/menu jeda diterapkan ke SoundManager global.
    // Musik dan SFX dipisah: mute musik tidak mematikan efek suara
    // (interaction-loop.md → Menu jeda).
    this.bus?.onCommand("set_audio", ({ music, sfx }) => {
      this.volumeMusik = clampVolume(music);
      this.volumeSfx = clampVolume(sfx);
      this.terapkanVolume();
    });

    this.kirimQuest();
    this.terapkanLook(this.runner.getState());

    // Scene dihancurkan (mis. "Main lagi"): mode lewati tidak boleh tertinggal
    // menunjuk runner yang sudah tidak tampil.
    this.events.once("shutdown", () => this.hentikanLewati());
  }

  update(time: number, delta: number) {
    // Time-lapse lewati berjalan selama tombol ditahan; diperiksa lebih dulu
    // supaya langkahnya tetap maju walau fase sempat berganti di antara frame.
    if (this.lewatiDitahan) this.perbaruiLewati(time);

    const phase = this.runner.getState().phase;

    if (phase === "explore") {
      this.updateExplore(time, delta);
    } else if (phase !== "challenge") {
      // Tantangan membekukan typewriter dan input lanjut: dialog terakhir tetap
      // terlihat di belakang panel soal (docs/04-game/scene-format.md § challenge).
      this.textbox?.tick(delta);
      this.checkLanjutKeys();
    }
  }

  /**
   * Bangun dunia dari `VILLAGE`: gambar peta, potongan objek, lalu karakter.
   * Dipanggil sekali di `create()`; tidak ada bangun ulang saat pindah chapter.
   */
  private bangunDunia() {
    if (this.textures.exists(VILLAGE.mapId)) {
      this.duniaObjects.push(
        this.add.image(0, 0, VILLAGE.mapId).setOrigin(0).setDepth(DEPTH_LATAR),
      );
    }

    for (const object of VILLAGE.objects) {
      if (!this.textures.exists(object.assetId)) continue;
      this.duniaObjects.push(
        this.add
          .image(object.x, object.y, object.assetId)
          .setOrigin(0, 0)
          .setDisplaySize(object.w, object.h)
          .setDepth(object.depth),
      );
    }

    for (const npc of VILLAGE.npcs) {
      const sprite = this.buatKarakter(npc.x, npc.y, npc.id, npc.face);
      sprite.setDepth(npc.depth);
      this.npcSprites.set(npc.id, sprite);
      this.duniaObjects.push(sprite);
    }

    this.tabrakan = buatTabrakan(VILLAGE);
  }

  /**
   * Sprite karakter berjangkar di titik kaki, ukurannya mengikuti frame
   * spritesheet-nya. Semua karakter desa sama tinggi (`TINGGI_KARAKTER`).
   */
  private buatKarakter(
    x: number,
    y: number,
    spriteId: string,
    face: number,
  ): Phaser.GameObjects.Sprite {
    const key = this.textures.exists(spriteId)
      ? spriteId
      : DEFAULT_CHARACTER_ID;
    const info = assetEntry(key);
    const ukuran = ukuranKarakter(
      info?.frameWidth ?? 24,
      info?.frameHeight ?? 32,
    );
    return this.add
      .sprite(x, y, key, face)
      .setOrigin(0.5, 1)
      .setDisplaySize(ukuran.width, ukuran.height);
  }

  /**
   * Fase explore: gerak bebas, zona interaksi, dan pemicu dialog. Hanya NPC
   * pemberi quest yang memunculkan prompt dan bisa memulai dialog; NPC lain
   * tetap berdiri sebagai penghalang tanpa memicu scene yang sama.
   */
  private updateExplore(time: number, delta: number) {
    if (this.player) {
      this.gerakkanPemain(delta);
      // Urutan gambar mengikuti kaki (world-design.md § Perspektif).
      this.player.setDepth(this.player.y);
    }

    const dekat = this.player
      ? findNpcInZone(VILLAGE.npcs, this.player.x, this.player.y)
      : null;
    const npcId = dekat && dekat === this.pemberiQuest ? dekat : null;
    this.perbaruiPetunjuk(npcId, time);

    if (npcId && this.lanjutKeysBaruDitekan()) {
      this.runner.interact();
      this.presentBeat();
    }
  }

  /** Satu langkah gerak: hitung titik kaki baru, lalu gambar sesuai arah. */
  private gerakkanPemain(delta: number) {
    const sprite = this.player;
    if (!sprite) return;

    const arah = arahGerak(this.keys);
    const dt = Math.min(delta / 1000, DT_MAKSIMUM);
    const tujuan = langkahPemain({
      x: sprite.x,
      y: sprite.y,
      arah,
      dt,
      tabrakan: this.tabrakan,
      batas: { width: VILLAGE.width, height: VILLAGE.height },
    });

    sprite.setPosition(tujuan.x, tujuan.y);
    if (arah) {
      this.arahTerakhir = arah;
      sprite.setFrame(FRAME_ARAH[arah]);
    }
  }

  /**
   * Kirim posisi chip "Space" dan penanda "!" dalam koordinat layar. Kamera
   * bisa bergeser, jadi koordinat dunia dikonversi ulang setiap kali emisi.
   * Interval 90 ms cukup halus untuk mata dan jauh lebih murah daripada
   * render DOM tiap frame.
   */
  private perbaruiPetunjuk(npcId: string | null, time: number) {
    if (time - this.waktuPetunjuk < PETUNJUK_INTERVAL_MS) return;
    this.waktuPetunjuk = time;

    const kamera = this.cameras.main;
    const hint = npcId ? this.posisiPromptLayar(npcId, kamera) : null;
    this.emitPrompt(hint);

    // Saat pemain sudah di zona NPC, chip Space menggantikan "!" supaya
    // keduanya tidak bertumpuk di kepala karakter yang sama.
    const marker =
      this.pemberiQuest && npcId !== this.pemberiQuest
        ? this.markerLayar(this.pemberiQuest, kamera)
        : null;
    this.emitMarkers(marker ? [marker] : []);
  }

  private emitPrompt(hint: PromptView | null) {
    const tanda = hint ? `${hint.text}:${hint.x}:${hint.y}` : "";
    if (tanda === this.tandaPrompt) return;
    this.tandaPrompt = tanda;
    this.bus?.emit({ type: "prompt", hint });
  }

  private emitMarkers(markers: NpcMarker[]) {
    const tanda = markers.map((m) => `${m.npcId}:${m.x}:${m.y}`).join("|");
    if (tanda === this.tandaMarker) return;
    this.tandaMarker = tanda;
    this.bus?.emit({ type: "markers", markers });
  }

  /** Prompt dunia → layar, dibulatkan ke piksel internal. */
  private posisiPromptLayar(
    npcId: string,
    kamera: KameraView,
  ): PromptView | null {
    const dunia = posisiPrompt(VILLAGE.npcs, npcId);
    if (!dunia) return null;
    const layar = duniaKeLayar(kamera, dunia.x, dunia.y);
    return {
      text: dunia.text,
      x: Math.round(layar.x),
      y: Math.round(layar.y),
    };
  }

  /** Penanda "!" di atas kepala pemberi quest; null bila di luar layar. */
  private markerLayar(npcId: string, kamera: KameraView): NpcMarker | null {
    const npc = VILLAGE.npcs.find((entry) => entry.id === npcId);
    if (!npc) return null;

    const layar = duniaKeLayar(
      kamera,
      npc.x,
      npc.y - TINGGI_KARAKTER - MARKER_OFFSET_Y,
    );
    if (!dalamLayar(layar)) return null;

    return {
      npcId,
      x: Math.round(layar.x),
      y: Math.round(layar.y),
    };
  }

  /** Sembunyikan prompt dan penanda saat dialog, tantangan, atau akhir bab. */
  private sembunyikanPetunjuk() {
    this.emitPrompt(null);
    this.emitMarkers([]);
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
    // Selama time-lapse, input manual diabaikan agar tidak melompat dua beat.
    if (this.lewatiDitahan) return;

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

  /**
   * Mode lewati ala Persona 3 Reload: selama tombol ditahan, beat dialog/narasi
   * dimajukan cepat satu per satu dan langsung tampil penuh (time-lapse).
   * Berhenti sendiri di beat challenge (soal wajib dijawab), di beat transition
   * (fade tetap diputar), atau saat scene habis. Setiap beat tetap dipresentasikan
   * lewat jalur normal, jadi log dialog tetap lengkap.
   */
  private mulaiLewati() {
    if (this.lewatiDitahan) return;
    if (!bolehTerusLewati(this.runner.getState())) return;

    this.lewatiDitahan = true;
    // 0 membuat langkah pertama jatuh di frame berikutnya.
    this.waktuLewati = 0;
    this.mainkanSfx("sfx_click");
    // Beat yang sedang mengetik diselesaikan dulu supaya time-lapse tidak
    // berhenti di teks setengah jadi.
    this.textbox?.complete();
    this.bus?.emit({ type: "skipping", aktif: true });
  }

  /** Satu langkah time-lapse per interval; berhenti bila tidak boleh lanjut. */
  private perbaruiLewati(time: number) {
    if (time - this.waktuLewati < INTERVAL_LEWATI_MS) return;
    if (!this.runner.lewatiSatuBeat()) {
      this.hentikanLewati();
      return;
    }
    this.waktuLewati = time;
    // presentBeat WAJIB: tanpa ini beat baru tidak pernah tampil dan overlay
    // soal tidak pernah terbuka saat skip mendarat di challenge.
    this.presentBeat();
    this.textbox?.complete();
  }

  private hentikanLewati() {
    if (!this.lewatiDitahan) return;
    this.lewatiDitahan = false;
    this.bus?.emit({ type: "skipping", aktif: false });
  }

  /** Nilai jawaban lewat fungsi murni backend, lalu kirim hasil ke React. */
  private nilaiJawaban(answer: Answer) {
    const state = this.runner.getState();
    if (state.phase !== "challenge" || !state.beat) return;

    const challenge = this.runner.getChallenge(answer.challengeId);
    if (!challenge) return;

    // Skor memakai percobaan pertama; jawaban ulang tidak menimpa (interaction-loop.md).
    this.answers.record(answer);
    this.kirimQuest();

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
    this.kirimQuest();
    this.terapkanLook(state);

    // Di luar explore tidak ada yang bisa diajak bicara: sembunyikan semua
    // penanda. Saat kembali ke explore, `updateExplore()` memunculkannya lagi.
    if (state.phase !== "explore") this.sembunyikanPetunjuk();

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
      this.pembicaraTerakhir = beat.speakerId;
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
    this.bus?.emit({
      type: "log",
      name: view.name,
      text: beat.text,
      sceneJudul: state.sceneJudul,
    });
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
   * Kabari React soal daftar quest chapter aktif. Sidik isi dipakai supaya
   * setiap beat tidak memicu render ulang panel; emisi hanya saat status,
   * hitungan tantangan, atau scene benar-benar berubah.
   */
  private kirimQuest() {
    const view = buildQuestState(
      this.story,
      this.runner.getState(),
      (challengeId) => this.answers.has(challengeId),
    );
    if (!view) return;

    const sidik = JSON.stringify(view);
    if (sidik === this.questTerakhir) return;
    this.questTerakhir = sidik;
    this.bus?.emit({ type: "quest", view });
  }

  /** "Ulangi chapter" dari menu jeda: reset kursor, lalu lanjutkan loop scene. */
  private ulangiChapter() {
    this.hentikanLewati();
    this.runner.restartChapter();
    this.textbox?.hide();
    this.sembunyikanPetunjuk();
    this.sorotSpeaker(null);
    this.sceneAktif = null;
    this.questTerakhir = "";
    this.pembicaraTerakhir = null;
    // Dunia tetap seperti semula; hanya titik kaki pemain yang dikembalikan.
    this.kembalikanPemain();
    this.kirimQuest();
    this.terapkanLook(this.runner.getState());
    this.scene.resume();
    this.volumeSedangJeda = false;
    this.terapkanVolume();
  }

  /**
   * Soal tantangan tampil di dalam kotak dialog (DialogueBox), dengan pilihan
   * respons melayang di atasnya (docs/05-frontend/game-player.md § Challenge).
   * Panel textbox Phaser dijamin aktif dan menampilkan teks soal tantangan.
   */
  private bukaTantangan(challengeId: string) {
    this.sembunyikanPetunjuk();

    const challenge = this.runner.getChallenge(challengeId);
    if (!challenge || !this.bus) return;

    const speakerId =
      this.pembicaraTerakhir ??
      this.pemberiQuest ??
      this.story.cast.find((c) => c.role === "mentor")?.id ??
      null;
    const name = speakerId
      ? (this.castNames.get(speakerId) ?? speakerId)
      : null;
    const portraitKey = speakerId ? this.portraitKey(speakerId) : null;

    if (speakerId) {
      this.sorotSpeaker(speakerId);
    }

    const text =
      challenge.type === "true_false" && challenge.statement
        ? `${challenge.prompt}\n\n"${challenge.statement}"`
        : challenge.prompt;

    this.textbox?.show({
      name,
      text,
      portraitKey,
    });
    this.textbox?.complete();

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
   * Terapkan musik scene aktif dan perbarui pemberi quest. Dipanggil setiap
   * beat, tetapi hanya mengubah sesuatu saat scene benar-benar berganti.
   *
   * Dunia **tidak** dibangun ulang di sini: peta desa sama untuk semua scene,
   * jadi pindah chapter hanya menukar musik dan NPC pemegang quest.
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

    // Pemberi quest bisa berganti walau di peta yang sama (scene baru).
    this.perbaruiPemberiQuest();

    this.putarMusik(look.musicId);
  }

  /** Pemberi quest scene aktif: pembicara dialog pertama yang ada di peta. */
  private perbaruiPemberiQuest() {
    const state = this.runner.getState();
    const scene =
      state.sceneIndex >= 0
        ? (state.chapter?.scenes[state.sceneIndex] ?? null)
        : null;
    this.pemberiQuest = pilihPemberiQuest(scene, VILLAGE.npcs);
  }

  /**
   * Kamera desa (world-design.md § Kamera): batas = ukuran peta, ikuti pemain
   * dengan dead zone 128×96 px dan lerp 0.12. Peta desa selalu lebih luas dari
   * layar, tetapi aturan "lock" tetap dipakai supaya peta kecil kelak tenang.
   */
  private pasangKamera() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, VILLAGE.width, VILLAGE.height);

    if (kameraMode(VILLAGE) === "follow" && this.player) {
      cam.startFollow(this.player, true, CAMERA_LERP, CAMERA_LERP);
      const zona = deadzonePx();
      cam.setDeadzone(zona.width, zona.height);
    } else {
      cam.stopFollow();
    }
    cam.centerOn(VILLAGE.width / 2, VILLAGE.height / 2);
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
    if (this.volumeSfx <= 0) return;
    this.sound.play(assetId, { volume: SFX_VOLUME * this.volumeSfx });
  }

  /** Volume musik efektif: nilai pengguna × faktor dasar (jeda menurunkan). */
  private terapkanVolume() {
    const faktor = this.volumeSedangJeda ? MUSIC_VOLUME_PAUSED : MUSIC_VOLUME;
    this.aturVolumeMusik(faktor * this.volumeMusik);
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

  private kembalikanPemain() {
    if (!this.player) return;
    this.player.setPosition(SPAWN_PEMAIN.x, SPAWN_PEMAIN.y);
    this.arahTerakhir = "down";
    this.player.setFrame(FRAME_ARAH[this.arahTerakhir]);
    this.player.setDepth(this.player.y);
  }
}
