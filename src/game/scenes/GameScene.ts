import Phaser from "phaser";

import { scoreAnswer, type Answer } from "@/story/scoring";
import type { Story } from "@/story/schema";

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
import { createTextbox, type BeatView, type Textbox } from "../textbox";
import { StoryRunner, akhirBab, bolehTerusLewati } from "../StoryRunner";
import { AnswerLog } from "../answerLog";
import { buildChallengeView } from "../challengeView";
import type { GameBus, NpcMarker, NpcNameplate, PromptView } from "../gameBus";
import { npcBisaDiajak, petaObrolan } from "../npcTalk";
import { buildQuestState, pilihPemberiQuest } from "../questLog";
import { assetEntry, resolveSceneLook } from "../sceneAssets";
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
  private readonly playerId: string;
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
  private tandaNama = "";
  /** Pemain sedang di zona NPC mana pun (dengan histeresis). */
  private npcDekat = false;
  /** NPC yang sedang berbicara singkat di luar perannya; null bila tidak ada. */
  private obrolanAktif: string | null = null;
  /** Jadwal pembukaan bab berikutnya; dibatalkan saat "Ulangi chapter". */
  private jadwalBab?: Phaser.Time.TimerEvent;

  constructor(story: Story, bus?: GameBus) {
    super("GameScene");
    this.story = story;
    this.bus = bus;
    this.runner = new StoryRunner(story);
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

    this.player = this.buatKarakter(
      SPAWN_PEMAIN.x,
      SPAWN_PEMAIN.y,
      pemain?.spriteId ?? "",
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

    // Scene dihancurkan (mis. "Main lagi"): mode lewati dan jadwal bab tidak
    // boleh tertinggal menunjuk scene yang sudah tidak tampil.
    this.events.once("shutdown", () => {
      this.hentikanLewati();
      this.batalkanJadwalBab();
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
   *
   * Posisi dan gambar dibulatkan ke piksel utuh: skala 0,875 membuat sprite
   * bukan objek "hanya translasi", jadi tanpa `fullAuto` ia ikut meluncur di
   * sub-piksel saat kamera bergeser (pixel art bergetar).
   *
   * Tidak ada sprite cadangan: `manifest.test.ts` menjamin setiap sprite di
   * manifest punya berkasnya, dan `PreloadScene` memuat semua sprite `cast`.
   */
  private buatKarakter(
    x: number,
    y: number,
    spriteId: string,
    face: number,
  ): Phaser.GameObjects.Sprite {
    const info = assetEntry(spriteId);
    const ukuran = ukuranKarakter(
      info?.frameWidth ?? 24,
      info?.frameHeight ?? 32,
    );
    return this.add
      .sprite(Math.round(x), Math.round(y), spriteId, face)
      .setOrigin(0.5, 1)
      .setDisplaySize(ukuran.width, ukuran.height)
      .setVertexRoundMode("fullAuto");
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

    this.perbaruiPetunjuk(dekat);

    if (!dekat || !this.lanjutKeysBaruDitekan()) return;

    // Debounce yang sama dengan dialog: menahan Space tidak memicu obrolan
    // berulang tiap frame setelah textbox ditutup.
    if (this.time.now - this.lastAdvance < DEBOUNCE_MS) return;
    this.lastAdvance = this.time.now;

    if (dekat === this.pemberiQuest) {
      this.runner.interact();
      this.presentBeat();
      return;
    }

    const teks = this.obrolan.get(dekat);
    if (teks) this.mulaiObrolan(dekat, teks);
  }

  /**
   * Buka obrolan singkat NPC di luar perannya (ADR 0016).
   *
   * Satu kalimat saja, memakai textbox dan portrait yang sama dengan dialog
   * cerita. Runner tidak disentuh: setelah textbox ditutup, pemain kembali
   * bebas berjalan di scene yang sama.
   */
  private mulaiObrolan(npcId: string, teks: string) {
    this.obrolanAktif = npcId;
    this.sembunyikanPetunjuk();
    this.sorotSpeaker(npcId);

    const nama = this.castNames.get(npcId) ?? npcId;
    this.textbox?.show({
      name: nama,
      text: teks,
      portraitKey: this.portraitKey(npcId),
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
    this.textbox?.hide();
    this.sorotSpeaker(null);
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

    // Posisi dibulatkan ke piksel utuh: kamera dan objek dunia sama-sama
    // duduk di grid yang sama, jadi tidak ada setengah piksel yang membuat
    // gambar "berkedip" saat berjalan.
    sprite.setPosition(Math.round(tujuan.x), Math.round(tujuan.y));
    if (arah) {
      this.arahTerakhir = arah;
      sprite.setFrame(FRAME_ARAH[arah]);
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
    const dunia = posisiPrompt(VILLAGE.npcs, npcId);
    if (!dunia) return null;
    const layar = duniaKeLayar(kamera, dunia.x, dunia.y);
    return {
      text: dunia.text,
      x: Math.round(layar.x),
      y: Math.round(layar.y),
      // Hanya pemberi quest yang punya penanda `!`; promptnya menempel pada
      // kotak itu. Obrolan singkat muncul sebagai pop-up terpisah.
      menempel: npcId === this.pemberiQuest,
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
    this.batalkanJadwalBab();
    this.runner.restartChapter();
    this.obrolanAktif = null;
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

  private portraitKey(speakerId: string): string | null {
    const karakter = this.story.cast.find((member) => member.id === speakerId);
    if (!karakter) return null;
    const entry = assetEntry(karakter.spriteId);
    return entry?.portraitPath ? `${entry.id}:portrait` : null;
  }

  private kembalikanPemain() {
    if (!this.player) return;
    this.player.setPosition(
      Math.round(SPAWN_PEMAIN.x),
      Math.round(SPAWN_PEMAIN.y),
    );
    this.arahTerakhir = "down";
    this.player.setFrame(FRAME_ARAH[this.arahTerakhir]);
    this.player.setDepth(this.player.y);
  }
}
