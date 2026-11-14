import Phaser from "phaser";

import { CHARACTER_FRAMES } from "@/assets/characterFrames";
import { DEFAULT_EXPRESSION, type Expression } from "@/story/expression";
import { scoreAnswer, type Answer } from "@/story/scoring";
import type { DetourBeat, Story } from "@/story/schema";

import { clampVolume } from "../audioSettings";
import { CAMERA_LERP, ZOOM_KAMERA, deadzoneDunia, kameraMode } from "../camera";
import { DEPTH_LATAR } from "../depth";
import {
  ambilTombolGerak,
  arahGerak,
  DT_MAKSIMUM,
  langkahPemain,
  type MovementKeys,
} from "../movement";
import {
  findNpcInZone,
  posisiPrompt,
  ZONA_HISTERESIS,
  ZONA_RADIUS,
} from "../interaction";
import {
  duniaKeLayar,
  posisiPenanda,
  terlihatDiLayar,
  type KameraView,
} from "../layar";
import {
  createTextbox,
  type BeatView,
  type PortraitView,
  type Textbox,
} from "../textbox";
import { StoryRunner, akhirBab, bolehTerusLewati } from "../StoryRunner";
import { AnswerLog } from "../answerLog";
import {
  BranchingRun,
  resolveDialogueText,
  type RetryPlan,
} from "../branching";
import { buildChallengeView } from "../challengeView";
import type { GameBus, NpcMarker, NpcNameplate, PromptView } from "../gameBus";
import { npcBisaDiajak, petaObrolan } from "../npcTalk";
import { sceneMelibatkanPemain } from "../potret";
import { buildQuestState, pilihPemberiQuest } from "../questLog";
import { assetEntry, resolveSceneLook } from "../sceneAssets";
import { buatTabrakan, type Tabrakan } from "../world/collision";
import {
  ARAH_DARI_BARIS,
  FPS_IDLE,
  FPS_WALK,
  TINGGI_KARAKTER,
  arahKe,
  indeksFrameAnimasi,
  kunciAnimasi,
  ukuranKarakter,
  type ArahGerak,
  type JenisAnimasi,
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
 * Jeda sebelum bab berikutnya dibuka **otomatis** dari fase `chapter_end`.
 *
 * Bab tidak lagi menunggu tombol: begitu beat terakhir sebuah bab selesai,
 * GameScene menjadwalkan bab berikutnya sendiri. Jeda pendek menjaga peralihan
 * tidak terasa seperti lompatan dan memberi ruang bagi kartu judul bab. Pemain
 * tetap bisa mempercepat dengan Space/Enter bila mau.
 */
const JEDA_AKHIR_BAB_MS = 700;

/** Jarak papan nama dari ubun-ubun sprite NPC. */
const JARAK_NAMA = 6;

/**
 * Titik jangkar kotak `!` pemberi quest: di atas papan nama, bukan tepat di
 * atas kepala. Papan nama setinggi ±16 px + celah 2 px, jadi 6 + 16 + 2 = 24.
 */
const MARKER_OFFSET_Y = 24;

/**
 * Detour yang sedang diputar setelah jawaban salah. Runner sengaja **tidak**
 * disentuh: soal yang sama akan ditampilkan ulang setelah detour habis.
 */
type DetourState = {
  beats: DetourBeat[];
  index: number;
  challengeId: string;
  retryQuestion: string;
};

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
  /** Baris obrolan singkat per karakter (ADR 0016); kosong bila tidak ada. */
  private readonly obrolan: Map<string, string>;
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
  /**
   * NPC terakhir yang bicara. Dipakai sebagai potret pendamping (meredup) saat
   * MC yang mengambil giliran, supaya lawan bicara tetap terlihat di layar.
   */
  private lawanBicaraTerakhir: string | null = null;
  /**
   * Scene aktif memuat giliran MC. Potret MC hanya ditampilkan di scene seperti
   * ini (dan saat obrolan singkat) — di dialog yang tidak melibatkan pemain,
   * potretnya cuma menambah sesak.
   */
  private sceneAdaPemain = false;
  /**
   * Pembicara yang menampilkan soal tantangan aktif. Dipakai saat feedback
   * jawaban mengganti potretnya jadi senang/marah.
   */
  private speakerTantangan: string | null = null;
  private readonly playerId: string;
  /** Id sprite pemain; dipakai memilih animasi walk/idle yang tepat. */
  private playerSpriteId = "";
  /** Arah hadap tiap NPC yang sedang dipasang; berubah saat diajak bicara. */
  private readonly npcArah = new Map<string, ArahGerak>();
  private arahTerakhir: ArahGerak = "down";
  private lastAdvance = 0;
  /** Mode lewati ditahan (ala Persona 3 Reload): beat maju cepat selama ditahan. */
  private lewatiDitahan = false;
  /** Waktu langkah lewati terakhir, untuk menjeda antar-beat. */
  private waktuLewati = 0;
  /** Jawaban percobaan pertama per challenge; jawaban ulang tidak menimpa. */
  private readonly answers = new AnswerLog();
  /** Konsekuensi jawaban salah: flag cerita + jumlah percobaan (story-schema.md). */
  private readonly branching: BranchingRun;
  /** Detour aktif; null bila cerita tidak sedang memutar konsekuensi salah. */
  private detour: DetourState | null = null;
  private selesaiDikirim = false;
  /** Sidik quest terakhir yang dikirim; mencegah render React tiap beat. */
  private questTerakhir = "";
  /** Sidik posisi prompt/penanda terakhir; mencegah emisi saat tidak berubah. */
  private tandaPrompt = "";
  private tandaMarker = "";
  private tandaNama = "";
  /** Pemain sedang di zona NPC mana pun (dengan histeresis). */
  private npcDekat = false;
  /** NPC di zona interaksi frame ini; dipakai tombol aksi sentuh. */
  private npcZona: string | null = null;
  /**
   * Arah dari joystick layar sentuh; `null` saat tongkat dilepas. Digabung
   * dengan tombol papan ketik di `gerakkanPemain`, jadi kedua jalur gerak
   * memakai aturan tabrakan dan animasi yang sama.
   */
  private arahSentuh: ArahGerak | null = null;
  /** NPC yang sedang berbicara singkat di luar perannya; null bila tidak ada. */
  private obrolanAktif: string | null = null;
  /** Jadwal pembukaan bab berikutnya; dibatalkan saat "Ulangi chapter". */
  private jadwalBab?: Phaser.Time.TimerEvent;

  constructor(story: Story, bus?: GameBus) {
    super("GameScene");
    this.story = story;
    this.bus = bus;
    this.runner = new StoryRunner(story);
    this.branching = new BranchingRun(story);
    this.castNames = new Map(
      story.cast.map((member) => [member.id, member.name]),
    );
    this.obrolan = petaObrolan(story.cast);
    const pemain =
      story.cast.find((member) => member.role === "player") ?? story.cast[0];
    this.playerId = pemain?.id ?? "";
  }

  create() {
    this.bangunDunia();

    const pemain =
      this.story.cast.find((member) => member.role === "player") ??
      this.story.cast[0];

    this.playerSpriteId = pemain?.spriteId ?? "";
    this.player = this.buatKarakter(
      SPAWN_PEMAIN.x,
      SPAWN_PEMAIN.y,
      this.playerSpriteId,
      this.arahTerakhir,
    );
    this.pasangKamera();

    this.keys = ambilTombolGerak(this);
    this.lanjutKeys = this.input.keyboard?.addKeys("space,enter") as Record<
      "space" | "enter",
      Phaser.Input.Keyboard.Key
    >;
    this.input.keyboard?.disableGlobalCapture();
    this.input.keyboard?.clearCaptures();
    // Teks dan potret dialog dirender DOM (DialogueBox.tsx) supaya tajam; scene
    // tetap pemegang state typewriter dan mengirim potongannya lewat bus.
    this.textbox = createTextbox((state) => {
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
    // Joystick layar sentuh: hanya menggantikan tombol gerak.
    this.bus?.onCommand("move", ({ arah }) => {
      this.arahSentuh = arah;
    });
    // Tombol aksi sentuh: sama dengan Space/Enter di dekat NPC.
    this.bus?.onCommand("interact", () => this.mulaiInteraksiTerdekat());
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

    // Scene dihancurkan (mis. "Main lagi"): mode lewati dan jadwal bab tidak
    // boleh tertinggal menunjuk scene yang sudah tidak tampil.
    this.events.once("shutdown", () => {
      this.hentikanLewati();
      this.batalkanJadwalBab();
      this.arahSentuh = null;
    });
  }

  update(time: number, delta: number) {
    // Obrolan singkat tidak mengubah posisi cerita: runner tetap di fase
    // `explore`, jadi textbox maju di jalur yang sama seperti dialog biasa.
    if (this.obrolanAktif) {
      this.textbox?.tick(delta);
      this.checkLanjutKeys();
      return;
    }

    // Time-lapse lewati berjalan selama tombol ditahan; diperiksa lebih dulu
    // supaya langkahnya tetap maju walau fase sempat berganti di antara frame.
    if (this.lewatiDitahan) this.perbaruiLewati(time);

    // Detour konsekuensi jawaban salah diputar seperti dialog/narasi biasa,
    // walau runner masih menahan di beat challenge (soal belum di-resolve).
    if (this.detour !== null) {
      this.textbox?.tick(delta);
      this.checkLanjutKeys();
      return;
    }

    const phase = this.runner.getState().phase;

    if (phase === "explore") {
      this.updateExplore(delta);
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
          .image(Math.round(object.x), Math.round(object.y), object.assetId)
          .setOrigin(0, 0)
          .setDisplaySize(object.w, object.h)
          .setDepth(object.depth)
          // Data editor memperbesar objek dengan skala pecahan (±1,66×), dan
          // `safeAuto` hanya membulatkan objek tanpa skala. Tanpa `fullAuto`
          // objek meluncur di sub-piksel sementara peta membulat, sehingga
          // pixel art tampak bergetar saat pemain berjalan.
          .setVertexRoundMode("fullAuto"),
      );
    }

    for (const npc of VILLAGE.npcs) {
      const arah = ARAH_DARI_BARIS[npc.face] ?? "down";
      this.npcArah.set(npc.id, arah);
      const sprite = this.buatKarakter(npc.x, npc.y, npc.id, arah);
      sprite.setDepth(npc.depth);
      this.npcSprites.set(npc.id, sprite);
      this.duniaObjects.push(sprite);
    }

    this.tabrakan = buatTabrakan(VILLAGE);
  }

  /**
   * Sprite karakter berjangkar di titik kaki, ukurannya mengikuti frame
   * spritesheet-nya. Semua karakter desa sama tinggi (`TINGGI_KARAKTER`).
   *
   * Animasi karakter didaftarkan sekali per sprite (idle, plus walk untuk
   * pemain), lalu arah hadap awal langsung diputar sebagai idle.
   *
   * Posisi dan gambar dibulatkan ke piksel utuh: skala bukan bilangan bulat
   * membuat sprite bukan objek "hanya translasi", jadi tanpa `fullAuto` ia ikut
   * meluncur di sub-piksel saat kamera bergeser (pixel art bergetar).
   *
   * Tidak ada sprite cadangan: `manifest.test.ts` menjamin setiap sprite di
   * manifest punya berkasnya, dan `PreloadScene` memuat semua sprite `cast`.
   */
  private buatKarakter(
    x: number,
    y: number,
    spriteId: string,
    arah: ArahGerak,
  ): Phaser.GameObjects.Sprite {
    const info = assetEntry(spriteId);
    const ukuran = ukuranKarakter(
      info?.frameWidth ?? 24,
      info?.frameHeight ?? 32,
    );
    this.daftarAnimasiKarakter(spriteId);
    const sprite = this.add
      .sprite(Math.round(x), Math.round(y), spriteId, 0)
      .setOrigin(0.5, 1)
      .setDisplaySize(ukuran.width, ukuran.height)
      .setVertexRoundMode("fullAuto");
    this.mainkanKarakter(sprite, spriteId, "idle", arah);
    return sprite;
  }

  /**
   * Daftarkan animasi idle (+ walk) satu karakter untuk semua arah.
   *
   * Key animasi Phaser global, jadi didaftarkan sekali saja: scene yang diulang
   * tidak boleh membuat key yang sama dua kali. Karakter tanpa metadata frame
   * (mis. id asing) dilewati; sprite-nya tetap tampil sebagai gambar statis.
   */
  private daftarAnimasiKarakter(spriteId: string) {
    const frames = CHARACTER_FRAMES.find((entry) => entry.id === spriteId);
    if (!frames) return;

    const daftar: Array<{
      jenis: JenisAnimasi;
      jumlah: number;
      fps: number;
    }> = [
      { jenis: "idle", jumlah: frames.idleFrames, fps: FPS_IDLE },
      { jenis: "walk", jumlah: frames.walkFrames, fps: FPS_WALK },
    ];

    for (const arah of ARAH_DARI_BARIS) {
      for (const { jenis, jumlah, fps } of daftar) {
        if (jumlah <= 0) continue;
        const key = kunciAnimasi(spriteId, jenis, arah);
        if (this.anims.exists(key)) continue;
        const mulai = indeksFrameAnimasi(frames, jenis, arah);
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(spriteId, {
            start: mulai,
            end: mulai + jumlah - 1,
          }),
          frameRate: fps,
          repeat: -1,
        });
      }
    }
  }

  /**
   * Putar animasi karakter; karakter tanpa walk (NPC) memakai idle sebagai
   * gantinya. `ignoreIfPlaying` mencegah animasi berulang dari frame pertama
   * setiap kali dipanggil saat pemain berjalan.
   */
  private mainkanKarakter(
    sprite: Phaser.GameObjects.Sprite,
    spriteId: string,
    jenis: JenisAnimasi,
    arah: ArahGerak,
  ) {
    const frames = CHARACTER_FRAMES.find((entry) => entry.id === spriteId);
    const efektif: JenisAnimasi =
      jenis === "walk" && (frames?.walkFrames ?? 0) === 0 ? "idle" : jenis;
    const key = kunciAnimasi(spriteId, efektif, arah);
    if (this.anims.exists(key)) sprite.play(key, true);
  }

  /** Balikkan NPC `npcId` agar menghadap posisi pemain saat ini. */
  private hadapkanKePemain(npcId: string) {
    const npc = this.npcSprites.get(npcId);
    const pemain = this.player;
    if (!npc || !pemain) return;
    const arah = arahKe(pemain.x - npc.x, pemain.y - npc.y);
    if (this.npcArah.get(npcId) === arah) return;
    this.npcArah.set(npcId, arah);
    this.mainkanKarakter(npc, npcId, "idle", arah);
  }

  /**
   * Hentikan animasi jalan pemain. Interaksi membekukan `updateExplore`, jadi
   * tanpa ini pemain yang menekan Space sambil berjalan akan berjalan di tempat
   * selama dialog/obrolan.
   */
  private hentikanPemain() {
    if (!this.player) return;
    this.mainkanKarakter(
      this.player,
      this.playerSpriteId,
      "idle",
      this.arahTerakhir,
    );
  }

  /**
   * Fase explore: gerak bebas, zona interaksi, dan pemicu dialog.
   *
   * Pemberi quest memulai deretan beat scene. NPC lain yang punya
   * `smallTalk` (ADR 0016) memunculkan prompt yang sama, tetapi interaksinya
   * hanya satu kalimat singkat dan tidak menggeser posisi cerita. NPC tanpa
   * keduanya tetap diam sebagai penghalang.
   */
  private updateExplore(delta: number) {
    if (this.player) {
      this.gerakkanPemain(delta);
      // Urutan gambar mengikuti kaki (world-design.md § Perspektif).
      this.player.setDepth(this.player.y);
    }

    // Histeresis: masuk zona di 30 px, keluar di 38 px. Tanpa ini pemain yang
    // berdiri di batas zona membuat kotak Space berkedip tiap frame.
    const radius = this.npcDekat ? ZONA_RADIUS + ZONA_HISTERESIS : ZONA_RADIUS;
    const dekat = this.player
      ? findNpcInZone(
          npcBisaDiajak(VILLAGE.npcs, this.pemberiQuest, this.obrolan),
          this.player.x,
          this.player.y,
          radius,
        )
      : null;
    this.npcDekat = dekat !== null;
    this.npcZona = dekat;

    this.perbaruiPetunjuk(dekat);

    if (dekat && this.lanjutKeysBaruDitekan()) {
      this.mulaiInteraksiTerdekat();
    }
  }

  /**
   * Buka interaksi dengan NPC di zona: dialog pemberi quest, atau obrolan
   * singkat (ADR 0016). Dipakai bersama oleh Space/Enter dan tombol aksi sentuh
   * supaya keduanya berbagi debounce, arah hadap NPC, dan henti langkah pemain.
   */
  private mulaiInteraksiTerdekat() {
    const dekat = this.npcZona;
    if (!dekat) return;

    // Debounce yang sama dengan dialog: menahan Space tidak memicu obrolan
    // berulang tiap frame setelah textbox ditutup.
    if (this.time.now - this.lastAdvance < DEBOUNCE_MS) return;
    this.lastAdvance = this.time.now;

    if (dekat === this.pemberiQuest) {
      this.hadapkanKePemain(dekat);
      this.hentikanPemain();
      this.runner.interact();
      this.presentBeat();
      return;
    }

    const teks = this.obrolan.get(dekat);
    if (teks) {
      this.hadapkanKePemain(dekat);
      this.hentikanPemain();
      this.mulaiObrolan(dekat, teks);
    }
  }

  /**
   * Buka obrolan singkat NPC di luar perannya (ADR 0016).
   *
   * Satu kalimat saja, memakai dialog dan potret yang sama dengan dialog
   * cerita. Runner tidak disentuh: setelah dialog ditutup, pemain kembali
   * bebas berjalan di scene yang sama.
   */
  private mulaiObrolan(npcId: string, teks: string) {
    this.obrolanAktif = npcId;
    this.lawanBicaraTerakhir = npcId;
    this.sembunyikanPetunjuk();
    this.sorotSpeaker(npcId);

    const nama = this.castNames.get(npcId) ?? npcId;
    this.textbox?.show({
      name: nama,
      text: teks,
      portrait: this.potretUntuk(npcId),
      pendamping: this.potretLawan(npcId),
    });
    this.bus?.emit({
      type: "log",
      name: nama,
      text: teks,
      sceneJudul: this.runner.getState().sceneJudul,
    });
  }

  /** Tutup obrolan singkat; prompt muncul lagi pada frame berikutnya. */
  private tutupObrolan() {
    this.obrolanAktif = null;
    this.lawanBicaraTerakhir = null;
    this.textbox?.hide();
    this.sorotSpeaker(null);
  }

  /** Satu langkah gerak: hitung titik kaki baru, lalu gambar sesuai arah. */
  private gerakkanPemain(delta: number) {
    const sprite = this.player;
    if (!sprite) return;

    const arah = arahGerak(this.keys) ?? this.arahSentuh;
    const dt = Math.min(delta / 1000, DT_MAKSIMUM);
    const tujuan = langkahPemain({
      x: sprite.x,
      y: sprite.y,
      arah,
      dt,
      tabrakan: this.tabrakan,
      batas: { width: VILLAGE.width, height: VILLAGE.height },
    });

    // Posisi dibulatkan ke piksel utuh: kamera dan objek dunia sama-sama
    // duduk di grid yang sama, jadi tidak ada setengah piksel yang membuat
    // gambar "berkedip" saat berjalan.
    sprite.setPosition(Math.round(tujuan.x), Math.round(tujuan.y));
    if (arah) {
      this.arahTerakhir = arah;
      this.mainkanKarakter(sprite, this.playerSpriteId, "walk", arah);
    } else {
      this.mainkanKarakter(
        sprite,
        this.playerSpriteId,
        "idle",
        this.arahTerakhir,
      );
    }
  }

  /**
   * Kirim posisi chip "Space", penanda quest, dan papan nama NPC dalam
   * koordinat layar.
   *
   * Dipanggil setiap frame. Dulu dibatasi 90 ms supaya React tidak bekerja
   * terus, tetapi kamera sekarang menempel pemain: penanda yang tertinggal
   * 90 ms terlihat melompat-lompat ("putus-putus") di atas NPC. Emisi tetap
   * murah karena sidik posisi di bawah hanya mengirim saat piksel bulatnya
   * berubah, dan `NpcHintLayer` hanya me-render beberapa elemen kecil.
   */
  private perbaruiPetunjuk(npcId: string | null) {
    const kamera = this.cameras.main;
    this.emitPrompt(npcId ? this.posisiPromptLayar(npcId, kamera) : null);
    this.emitNametags(kamera);

    // Penanda "!" tetap tampil walau pemain sudah di zona interaksi. Kotak
    // Space menyembul di sampingnya (lihat `posisiPrompt`), jadi indikator quest
    // tidak hilang-muncul ketika pemain mendekat.
    const marker = this.pemberiQuest
      ? this.markerLayar(this.pemberiQuest, kamera)
      : null;
    this.emitMarkers(marker ? [marker] : []);
  }

  private emitPrompt(hint: PromptView | null) {
    const tanda = hint
      ? `${hint.text}:${hint.x}:${hint.y}:${hint.menempel ? 1 : 0}`
      : "";
    if (tanda === this.tandaPrompt) return;
    this.tandaPrompt = tanda;
    this.bus?.emit({ type: "prompt", hint });
  }

  /** Papan nama semua NPC yang masih terlihat, bukan hanya pemberi quest. */
  private emitNametags(kamera: Phaser.Cameras.Scene2D.Camera) {
    const plates: NpcNameplate[] = [];

    for (const npc of VILLAGE.npcs) {
      const nama = this.castNames.get(npc.id);
      if (!nama) continue;

      const layar = duniaKeLayar(
        kamera,
        npc.x,
        npc.y - TINGGI_KARAKTER - JARAK_NAMA,
      );
      if (!terlihatDiLayar(layar, kamera.width, kamera.height)) continue;

      plates.push({
        npcId: npc.id,
        nama,
        x: Math.round(layar.x),
        y: Math.round(layar.y),
      });
    }

    const tanda = plates.map((p) => `${p.npcId}:${p.x}:${p.y}`).join("|");
    if (tanda === this.tandaNama) return;
    this.tandaNama = tanda;
    this.bus?.emit({ type: "nametags", plates });
  }

  private emitMarkers(markers: NpcMarker[]) {
    // Sidik harus memuat mode tepi dan sudut: saat NPC melewati batas layar,
    // x/y yang dibulatkan bisa tidak berubah tetapi penunjuk beacon berputar.
    const tanda = markers
      .map((m) => `${m.npcId}:${m.x}:${m.y}:${m.tepi ? 1 : 0}:${m.sudut ?? 0}`)
      .join("|");
    if (tanda === this.tandaMarker) return;
    this.tandaMarker = tanda;
    this.bus?.emit({ type: "markers", markers });
  }

  /** Prompt dunia → layar, dibulatkan ke piksel internal. */
  private posisiPromptLayar(
    npcId: string,
    kamera: KameraView,
  ): PromptView | null {
    // `menempel` hanya membedakan animasi dan asal prompt. Kotak yang tampil
    // sendiri (obrolan singkat maupun beacon tepi) selalu dipusatkan di atas
    // NPC, jadi posisinya tidak bergantung pada status itu.
    const menempel = npcId === this.pemberiQuest;
    const dunia = posisiPrompt(VILLAGE.npcs, npcId);
    if (!dunia) return null;
    const layar = duniaKeLayar(kamera, dunia.x, dunia.y);
    return {
      text: dunia.text,
      x: Math.round(layar.x),
      y: Math.round(layar.y),
      menempel,
    };
  }

  /**
   * Penanda quest pemberi quest.
   *
   * Selama NPC terlihat, kotak `!` duduk di atas papan namanya (papan nama
   * sendiri dikirim lewat `emitNametags` untuk semua NPC). Bila NPC keluar
   * pandangan, penanda tidak hilang: posisinya dijepit ke tepi layar sebagai
   * beacon HUD dengan penunjuk arah. Karena dihitung ulang tiap frame, beacon
   * ikut bergeser saat pemain berjalan mendekat, lalu berubah mulus menjadi
   * kotak `!` begitu NPC masuk area aman.
   */
  private markerLayar(
    npcId: string,
    kamera: Phaser.Cameras.Scene2D.Camera,
  ): NpcMarker | null {
    const npc = VILLAGE.npcs.find((entry) => entry.id === npcId);
    if (!npc) return null;

    const layar = duniaKeLayar(
      kamera,
      npc.x,
      npc.y - TINGGI_KARAKTER - MARKER_OFFSET_Y,
    );

    // Lebar kamera bukan lagi 640 (lebar internal ikut kontainer), jadi batas
    // memakai ukuran kamera sebenarnya. Tanpa ini penanda di sisi kanan layar
    // lebar dijepit ke tempat yang salah.
    const posisi = posisiPenanda(layar, kamera.width, kamera.height);

    return {
      npcId,
      x: Math.round(posisi.x),
      y: Math.round(posisi.y),
      tepi: posisi.tepi,
      sudut: Math.round(posisi.sudut),
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

    // Detour konsekuensi: satu tekanan menyelesaikan ketikan atau maju satu
    // beat detour. Runner belum bergerak, jadi aturan tantangan tidak berlaku.
    if (this.detour !== null) {
      this.mainkanSfx("sfx_click");
      this.lanjutDetour();
      return;
    }

    // Saat challenge, input dialog diabaikan — overlay React yang memegang kendali.
    if (this.runner.getState().phase === "challenge") return;

    this.mainkanSfx("sfx_click");
    if (this.textbox?.isTyping()) {
      this.textbox.complete();
      return;
    }
    // Obrolan singkat hanya menutup textbox; kursor cerita tidak bergerak.
    if (this.obrolanAktif) {
      this.tutupObrolan();
      return;
    }
    this.lanjutBeat();
  }

  /** Lanjut dari beat yang sedang tampil ke beat/scene berikutnya. */
  private lanjutBeat() {
    this.batalkanJadwalBab();
    this.runner.advance();
    this.presentBeat();
  }

  /**
   * Jadwalkan pembukaan bab berikutnya saat cerita mencapai `chapter_end`.
   *
   * Satu jadwal saja: `presentBeat` bisa dipanggil berkali-kali di fase yang
   * sama (mis. saat menjeda), jadi jadwal ganda dicegah. Pemain tetap boleh
   * mempercepat dengan Space/Enter — jadwal ini hanya menutup kasus "diam".
   */
  private jadwalkanBabBerikutnya() {
    if (this.jadwalBab) return;
    this.jadwalBab = this.time.delayedCall(JEDA_AKHIR_BAB_MS, () => {
      this.jadwalBab = undefined;
      // Bisa saja pemain sudah menekan Space lebih dulu; hanya lanjut bila
      // kursor memang masih berhenti di akhir bab.
      if (!akhirBab(this.runner.getState())) return;
      this.lanjutBeat();
    });
  }

  /** Buang jadwal bab berikutnya (dipakai saat bab dimulai ulang/selesai). */
  private batalkanJadwalBab() {
    this.jadwalBab?.remove(false);
    this.jadwalBab = undefined;
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
    if (this.detour !== null) return;

    const beat = state.beat;
    if (beat.type !== "challenge") return;

    const challenge = this.runner.getChallenge(answer.challengeId);
    if (!challenge) return;

    // Skor memakai percobaan pertama; jawaban ulang tidak menimpa (interaction-loop.md).
    this.answers.record(answer);
    this.kirimQuest();

    const hasil = scoreAnswer(challenge, answer);
    const outcome = this.branching.grade(beat, hasil.isCorrect);
    this.mainkanSfx(hasil.isCorrect ? "sfx_correct" : "sfx_wrong");
    // Umpan balik visual: potret pembicara soal berubah senang saat benar dan
    // marah saat salah (docs/04-game/scene-format.md).
    this.textbox?.setPortrait(
      this.potretUntuk(
        this.speakerTantangan,
        hasil.isCorrect ? "happy" : "angry",
      ),
    );

    // Jawaban salah yang masih punya percobaan: mainkan detour lalu ulangi soal
    // yang sama. Penjelasan sengaja belum ditampilkan agar soal ulang bermakna.
    if (outcome.retry) {
      this.mulaiDetour(outcome.retry, beat.challengeId);
      return;
    }

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
      // Akhir bab langsung berlanjut sendiri; tidak perlu menekan tombol.
      if (akhirBab(state)) this.jadwalkanBabBerikutnya();
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
      // Varian teks dipilih dari nilai flag saat ini (story-schema.md).
      const text = resolveDialogueText(beat, this.branching.flags());
      this.pembicaraTerakhir = beat.speakerId;
      // Ingat NPC yang bicara supaya potretnya tetap tampil (meredup) saat MC
      // mengambil giliran berikutnya.
      if (beat.speakerId !== this.playerId) {
        this.lawanBicaraTerakhir = beat.speakerId;
      }
      this.sorotSpeaker(beat.speakerId);
      view = {
        name: this.castNames.get(beat.speakerId) ?? beat.speakerId,
        text,
        portrait: this.potretUntuk(beat.speakerId, beat.expression),
        pendamping: this.potretLawan(beat.speakerId),
      };
    } else {
      // Narasi tidak menampilkan nama, tetapi boleh memunculkan potret
      // lewat `speakerId` bila AI ingin menyorot reaksi seseorang.
      if (beat.speakerId && beat.speakerId !== this.playerId) {
        this.lawanBicaraTerakhir = beat.speakerId;
      }
      this.sorotSpeaker(null);
      view = {
        name: null,
        text: beat.text,
        portrait: this.potretUntuk(beat.speakerId ?? null, beat.expression),
        pendamping: this.potretLawan(beat.speakerId ?? null),
      };
    }
    this.textbox?.show(view);
    this.bus?.emit({
      type: "log",
      name: view.name,
      text: view.text,
      sceneJudul: state.sceneJudul,
    });
  }

  /**
   * Kirim ringkasan sekali main ke React saat cerita selesai. `scoreStory`
   * menghitung poin, jumlah benar, dan konsep lemah dari percobaan pertama.
   *
   * `answers` ikut dikirim karena layar hasil menyimpan hasil main lewat
   * Server Action `savePlayResult`, dan action itu hanya menerima jawaban
   * mentah: skor dihitung ulang di server, bukan dipercaya dari klien.
   */
  private kirimHasil() {
    if (this.selesaiDikirim) return;
    this.selesaiDikirim = true;
    this.bus?.emit({
      type: "finished",
      result: this.answers.result(this.story),
      answers: this.answers.all(),
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
    this.detour = null;
    this.batalkanJadwalBab();
    this.runner.restartChapter();
    this.obrolanAktif = null;
    this.textbox?.hide();
    this.sembunyikanPetunjuk();
    this.sorotSpeaker(null);
    this.sceneAktif = null;
    this.questTerakhir = "";
    this.pembicaraTerakhir = null;
    this.lawanBicaraTerakhir = null;
    this.speakerTantangan = null;
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
   * Dialog dijamin aktif dan menampilkan teks soal beserta potret pembicara.
   */
  private bukaTantangan(challengeId: string, promptOverride?: string) {
    this.sembunyikanPetunjuk();

    const challenge = this.runner.getChallenge(challengeId);
    if (!challenge || !this.bus) return;

    const speakerId =
      (this.pembicaraTerakhir !== this.playerId
        ? this.pembicaraTerakhir
        : null) ??
      this.lawanBicaraTerakhir ??
      this.pemberiQuest ??
      this.story.cast.find((c) => c.role === "mentor")?.id ??
      null;
    const name = speakerId
      ? (this.castNames.get(speakerId) ?? speakerId)
      : null;
    // Simpan pembicara soal supaya feedback jawaban bisa memakai potretnya lagi.
    this.speakerTantangan = speakerId;
    if (speakerId && speakerId !== this.playerId) {
      this.lawanBicaraTerakhir = speakerId;
    }

    if (speakerId) {
      this.sorotSpeaker(speakerId);
    }

    // Soal ulang hanya mengganti teks soal; opsi dan jawaban benar tetap sama.
    const prompt = promptOverride ?? challenge.prompt;
    const text =
      challenge.type === "true_false" && challenge.statement
        ? `${prompt}\n\n"${challenge.statement}"`
        : prompt;

    this.textbox?.show({
      name,
      text,
      portrait: this.potretUntuk(speakerId),
      pendamping: this.potretLawan(speakerId),
    });
    this.textbox?.complete();

    const view = buildChallengeView(challenge);
    this.bus.emit({
      type: "challenge",
      view: promptOverride ? { ...view, prompt } : view,
    });
  }

  /**
   * Mulai deretan detour setelah jawaban salah. Setiap beat diputar lewat
   * renderer dialog/narasi yang sama dengan beat biasa; setelah habis, soal
   * yang sama dibuka lagi dengan teks `retryQuestions`.
   */
  private mulaiDetour(retry: RetryPlan, challengeId: string) {
    this.detour = {
      beats: retry.detour,
      index: 0,
      challengeId,
      retryQuestion: retry.retryQuestion,
    };
    this.sembunyikanPetunjuk();

    // Overlay tantangan menutup sendiri lewat event ini supaya detour terlihat.
    // Tidak boleh mengandalkan `dialogue`: dialog soal tantangan juga memakai
    // event itu, jadi menutup overlay di sana menghapus umpan balik jawaban.
    this.bus?.emit({ type: "detour", aktif: true });

    if (this.detour.beats.length === 0) {
      this.bukaTantanganUlang();
      return;
    }
    this.tampilkanDetourBeat();
  }

  /** Tampilkan satu beat detour; dialog memakai varian teks seperti biasa. */
  private tampilkanDetourBeat() {
    const detour = this.detour;
    if (!detour) return;

    const beat = detour.beats[detour.index];
    if (!beat) {
      this.bukaTantanganUlang();
      return;
    }

    let view: BeatView;
    if (beat.type === "dialogue") {
      const text = resolveDialogueText(beat, this.branching.flags());
      this.pembicaraTerakhir = beat.speakerId;
      if (beat.speakerId !== this.playerId) {
        this.lawanBicaraTerakhir = beat.speakerId;
      }
      this.sorotSpeaker(beat.speakerId);
      view = {
        name: this.castNames.get(beat.speakerId) ?? beat.speakerId,
        text,
        portrait: this.potretUntuk(beat.speakerId, beat.expression),
        pendamping: this.potretLawan(beat.speakerId),
      };
    } else {
      if (beat.speakerId && beat.speakerId !== this.playerId) {
        this.lawanBicaraTerakhir = beat.speakerId;
      }
      this.sorotSpeaker(null);
      view = {
        name: null,
        text: beat.text,
        portrait: this.potretUntuk(beat.speakerId ?? null, beat.expression),
        pendamping: this.potretLawan(beat.speakerId ?? null),
      };
    }

    this.textbox?.show(view);
    this.bus?.emit({
      type: "log",
      name: view.name,
      text: view.text,
      sceneJudul: this.runner.getState().sceneJudul,
    });
  }

  /** Satu langkah detour: selesaikan ketikan, lalu maju atau ulangi soal. */
  private lanjutDetour() {
    const detour = this.detour;
    if (!detour) return;

    if (this.textbox?.isTyping()) {
      this.textbox.complete();
      return;
    }

    detour.index += 1;
    if (detour.index >= detour.beats.length) {
      this.bukaTantanganUlang();
      return;
    }
    this.tampilkanDetourBeat();
  }

  /** Buka lagi challenge yang sama dengan teks soal ulang. */
  private bukaTantanganUlang() {
    const detour = this.detour;
    if (!detour) return;

    this.detour = null;
    this.bus?.emit({ type: "detour", aktif: false });
    this.bukaTantangan(detour.challengeId, detour.retryQuestion);
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

  /** Pemberi quest + keterlibatan pemain untuk scene aktif. */
  private perbaruiPemberiQuest() {
    const state = this.runner.getState();
    const scene =
      state.sceneIndex >= 0
        ? (state.chapter?.scenes[state.sceneIndex] ?? null)
        : null;
    this.pemberiQuest = pilihPemberiQuest(scene, VILLAGE.npcs);
    // Scene dianggap melibatkan pemain bila ada beat yang diucapkan MC. Hanya
    // di scene seperti itu potret MC menemani NPC; dialog yang murni antar-NPC
    // tampil tanpa potret MC.
    this.sceneAdaPemain = sceneMelibatkanPemain(scene, this.playerId);
    // Zona histeresis milik NPC sebelumnya; mulai dari batas masuk.
    this.npcDekat = false;
  }

  /**
   * Kamera desa (world-design.md § Kamera): batas = ukuran peta, ikuti pemain
   * dengan dead zone 128×96 px di layar dan lerp 1. Kamera sedikit keluar dari
   * 1:1 (`ZOOM_KAMERA`) supaya dunia terasa lebih luas; UI Phaser menutup
   * sendiri lewat skala terbalik. Peta desa selalu lebih luas dari layar,
   * tetapi aturan "lock" tetap dipakai supaya peta kecil kelak tenang.
   */
  private pasangKamera() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, VILLAGE.width, VILLAGE.height);
    cam.setZoom(ZOOM_KAMERA);

    if (kameraMode(VILLAGE) === "follow" && this.player) {
      cam.startFollow(this.player, true, CAMERA_LERP, CAMERA_LERP);
      const zona = deadzoneDunia(ZOOM_KAMERA);
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

  /**
   * Potret DOM untuk seorang pembicara pada ekspresi tertentu. `null` bila
   * pembicara tidak dikenal atau sprite-nya tidak punya potret — DialogueBox
   * lalu sekadar menampilkan panel polos.
   */
  private potretUntuk(
    speakerId: string | null,
    expression: Expression = DEFAULT_EXPRESSION,
  ): PortraitView | null {
    if (!speakerId) return null;
    const karakter = this.story.cast.find((member) => member.id === speakerId);
    if (!karakter) return null;
    const entry = assetEntry(karakter.spriteId);
    const src = entry?.portraits?.[expression];
    if (!src) return null;
    return {
      src,
      alt: `Potret ${this.castNames.get(speakerId) ?? speakerId}`,
    };
  }

  /**
   * Potret lawan bicara untuk menemani pembicara: MC saat NPC yang bicara,
   * atau NPC terakhir saat MC yang mengambil giliran. Potret ini tetap tampil
   * tetapi diredupkan `DialogueBox`; `null` bila tidak ada pasangan.
   *
   * MC hanya menemani dialog cerita yang memang punya giliran MC. Dialog
   * antar-NPC dan obrolan singkat NPC non-quest tampil tanpa potret MC — pemain
   * tidak sedang menanggapi apa pun di situ.
   */
  private potretLawan(speakerId: string | null): PortraitView | null {
    if (!speakerId) return null;
    if (speakerId === this.playerId) {
      return this.potretUntuk(this.lawanBicaraTerakhir);
    }
    if (this.obrolanAktif || !this.sceneAdaPemain) return null;
    return this.potretUntuk(this.playerId);
  }

  private kembalikanPemain() {
    if (!this.player) return;
    this.player.setPosition(
      Math.round(SPAWN_PEMAIN.x),
      Math.round(SPAWN_PEMAIN.y),
    );
    this.arahTerakhir = "down";
    this.mainkanKarakter(
      this.player,
      this.playerSpriteId,
      "idle",
      this.arahTerakhir,
    );
    this.player.setDepth(this.player.y);
  }
}
