#!/usr/bin/env bun
/**
 * Membuat ulang seluruh aset game di `public/assets/`.
 *
 *   bun run assets:generate            # gambar + audio
 *   bun run assets:generate -- --only=image
 *   bun run assets:generate -- --only=audio
 *
 * Gambar digambar dengan kanvas piksel di `scripts/lib/` (tanpa dependensi,
 * deterministik). Audio disintesis ke WAV lalu dienkode ke OGG memakai ffmpeg:
 * variabel lingkungan `FFMPEG` bila ada, kalau tidak `ffmpeg` dari PATH.
 *
 * Aturan: hasil gambar harus identik kotak demi kotak bila dijalankan ulang,
 * jadi tidak ada waktu, locale, atau PRNG tanpa benih di dalamnya. Audio
 * disintesis deterministik, tetapi berkas OGG tidak dijamin byte-identik antar
 * versi ffmpeg (encoder menulis string vendor sendiri) — yang di-commit adalah
 * hasil sekali jadi, bukan hasil yang dihitung ulang saat build.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { encodePng } from "./lib/pixel.mjs";
import {
  backgroundDefault,
  classroomDay,
  cloudSky,
  libraryEvening,
  mountainNight,
  riverDay,
  schoolyardDay,
  schoolyardEvening,
} from "./lib/scenes.mjs";
import {
  characterDefaultSheet,
  characterSheet,
  defaultPanel,
  portrait,
  portraitFrame,
  textboxPanel,
} from "./lib/characters.mjs";
import {
  propBlackboard,
  propDefault,
  propDesk,
  propFence,
  propPond,
  propTree,
  tileCanopy,
  tileDefault,
  tileFloorCloud,
  tileFloorCorridor,
  tileFloorGrass,
  tileFloorRock,
  tileFloorWater,
  tileFloorWood,
  tileWallHedge,
  tileWallPlaster,
  tileWallRock,
} from "./lib/tiles.mjs";
import {
  musicAdventure,
  musicDefault,
  musicEnding,
  musicMystery,
  musicSchoolCalm,
  sfxClick,
  sfxCorrect,
  sfxPage,
  sfxWrong,
} from "./lib/audio.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");

/* -------------------------------------------------------------------------- */
/* Daftar aset: id manifest → berkas                                              */
/* -------------------------------------------------------------------------- */

const IMAGES = [
  ["bg/classroom_day.png", classroomDay],
  ["bg/schoolyard_day.png", schoolyardDay],
  ["bg/schoolyard_evening.png", schoolyardEvening],
  ["bg/cloud_sky.png", cloudSky],
  ["bg/mountain_night.png", mountainNight],
  ["bg/river_day.png", riverDay],
  ["bg/library_evening.png", libraryEvening],
  ["bg/default.png", backgroundDefault],
  ["char/nara.png", () => characterSheet("nara")],
  ["char/pak_bima.png", () => characterSheet("bima")],
  ["char/tirta.png", () => characterSheet("tirta")],
  ["char/rani.png", () => characterSheet("rani")],
  ["char/default.png", characterDefaultSheet],
  ["portrait/nara.png", () => portrait("nara")],
  ["portrait/pak_bima.png", () => portrait("bima")],
  ["portrait/tirta.png", () => portrait("tirta")],
  ["portrait/rani.png", () => portrait("rani")],
  ["ui/textbox.png", textboxPanel],
  ["ui/portrait_frame.png", portraitFrame],
  ["ui/default.png", defaultPanel],

  /* Tile lantai dan dinding (map top-down, ADR 0010) */
  ["tile/floor_wood.png", tileFloorWood],
  ["tile/floor_grass.png", tileFloorGrass],
  ["tile/floor_cloud.png", tileFloorCloud],
  ["tile/floor_rock.png", tileFloorRock],
  ["tile/floor_water.png", tileFloorWater],
  ["tile/floor_corridor.png", tileFloorCorridor],
  ["tile/wall_plaster.png", tileWallPlaster],
  ["tile/wall_hedge.png", tileWallHedge],
  ["tile/wall_rock.png", tileWallRock],
  ["tile/canopy.png", tileCanopy],
  ["tile/default.png", tileDefault],

  /* Prop padat dengan collider dari data yang sama */
  ["prop/desk.png", propDesk],
  ["prop/blackboard.png", propBlackboard],
  ["prop/tree.png", propTree],
  ["prop/fence.png", propFence],
  ["prop/pond.png", propPond],
  ["prop/default.png", propDefault],
];

const AUDIO = [
  ["music/school_calm.ogg", musicSchoolCalm],
  ["music/adventure.ogg", musicAdventure],
  ["music/mystery.ogg", musicMystery],
  ["music/ending.ogg", musicEnding],
  ["music/default.ogg", musicDefault],
  ["sfx/click.ogg", sfxClick],
  ["sfx/correct.ogg", sfxCorrect],
  ["sfx/wrong.ogg", sfxWrong],
  ["sfx/page.ogg", sfxPage],
];

/* -------------------------------------------------------------------------- */
/* Helper                                                                     */
/* -------------------------------------------------------------------------- */

function log(message) {
  process.stdout.write(`${message}\n`);
}

function writeImage(relativePath, factory) {
  const target = join(PUBLIC, "assets", relativePath);
  mkdirSync(dirname(target), { recursive: true });
  const png = encodePng(factory());
  writeFileSync(target, png);
  log(
    `  gambar  ${relativePath.padEnd(30)} ${(png.length / 1024).toFixed(1)} KB`,
  );
}

/** Float32 mono → WAV 16-bit (dipakai sebagai input ffmpeg). */
function toWav(samples, sampleRate) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(clamped * 32767), i * 2);
  }

  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

function ffmpegBinary() {
  return process.env.FFMPEG?.trim() || "ffmpeg";
}

/** Cek ffmpeg sekali di awal supaya kegagalan cepat dan jelas. */
function assertFfmpeg() {
  const binary = ffmpegBinary();
  const result = spawnSync(binary, ["-version"], { encoding: "utf8" });
  if (result.error || result.status !== 0) {
    throw new Error(
      `ffmpeg tidak ditemukan (${binary}). Set variabel FFMPEG ke path ffmpeg.exe, ` +
        "atau lewati audio dengan --only=image.",
    );
  }
  return binary;
}

function writeAudio(relativePath, factory, binary) {
  const target = join(PUBLIC, "assets", relativePath);
  mkdirSync(dirname(target), { recursive: true });

  const sampleRate = 44100;
  const wav = toWav(factory(sampleRate), sampleRate);
  const isMusic = relativePath.startsWith("music/");

  // Musik: Vorbis kualitas 5 (~100 kbps mono) sesuai asset-guide 96–128.
  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-f",
    "wav",
    "-i",
    "pipe:0",
    "-c:a",
    "libvorbis",
    "-q:a",
    isMusic ? "5" : "3",
    "-ac",
    "1",
    target,
  ];

  const result = spawnSync(binary, args, { input: wav, encoding: "buffer" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `ffmpeg gagal untuk ${relativePath}: ${String(result.stderr)}`,
    );
  }
  log(`  audio   ${relativePath.padEnd(30)} ok`);
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

const only = process.argv
  .find((argument) => argument.startsWith("--only="))
  ?.slice("--only=".length);

log("Membuat aset ClassQuest…");

if (only !== "audio") {
  log("Gambar:");
  for (const [relativePath, factory] of IMAGES) {
    writeImage(relativePath, factory);
  }
}

if (only !== "image") {
  log("Audio:");
  const binary = assertFfmpeg();
  for (const [relativePath, factory] of AUDIO) {
    writeAudio(relativePath, factory, binary);
  }
}

log("Selesai.");
