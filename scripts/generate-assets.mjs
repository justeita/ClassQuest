#!/usr/bin/env bun
/**
 * Membuat ulang aset generik ClassQuest di `public/assets/`.
 *
 *   bun run assets:generate            # gambar + audio
 *   bun run assets:generate -- --only=image
 *   bun run assets:generate -- --only=audio
 *
 * Yang dibuat di sini hanya aset **generik**: latar default, panel UI, dan efek
 * suara. Karakter, potret, peta, dan lagu berasal dari aset dunia desa yang
 * disalin oleh `scripts/import-world.mjs`; berkasnya tidak boleh ditimpa
 * generator.
 *
 * Gambar digambar dengan kanvas piksel di `scripts/lib/` (tanpa dependensi,
 * deterministik). Audio disintesis ke WAV lalu dienkode ke OGG memakai ffmpeg:
 * variabel lingkungan `FFMPEG` bila ada, kalau tidak `ffmpeg` dari PATH.
 *
 * Aturan: hasil gambar harus identik kotak demi kotak bila dijalankan ulang,
 * jadi tidak ada waktu, locale, atau PRNG tanpa benih di dalamnya.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { encodePng } from "./lib/pixel.mjs";
import { backgroundDefault } from "./lib/scenes.mjs";
import { defaultPanel, portraitFrame, textboxPanel } from "./lib/ui.mjs";
import {
  sfxClick,
  sfxCorrect,
  sfxPage,
  sfxType,
  sfxWrong,
  toWav,
} from "./lib/audio.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");

/* -------------------------------------------------------------------------- */
/* Daftar aset: id manifest → berkas                                              */
/* -------------------------------------------------------------------------- */

const IMAGES = [
  ["bg/default.png", backgroundDefault],
  ["ui/textbox.png", textboxPanel],
  ["ui/portrait_frame.png", portraitFrame],
  ["ui/default.png", defaultPanel],
];

const AUDIO = [
  ["sfx/click.ogg", sfxClick],
  ["sfx/correct.ogg", sfxCorrect],
  ["sfx/wrong.ogg", sfxWrong],
  ["sfx/page.ogg", sfxPage],
  // Blip ketik dipakai puluhan kali per detik dan sangat pendek, jadi cukup
  // ditulis langsung sebagai WAV: tidak perlu ffmpeg, hasilnya tetap kecil.
  ["sfx/type.wav", sfxType],
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

/** Float32 mono → WAV 16-bit, ditulis langsung tanpa ffmpeg. */
function writeWav(relativePath, factory) {
  const target = join(PUBLIC, "assets", relativePath);
  mkdirSync(dirname(target), { recursive: true });

  const sampleRate = 44100;
  const wav = toWav(factory(sampleRate), sampleRate);
  writeFileSync(target, wav);
  log(
    `  audio   ${relativePath.padEnd(30)} ${(wav.length / 1024).toFixed(1)} KB`,
  );
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

function writeOgg(relativePath, factory, binary) {
  const target = join(PUBLIC, "assets", relativePath);
  mkdirSync(dirname(target), { recursive: true });

  const sampleRate = 44100;
  const wav = toWav(factory(sampleRate), sampleRate);

  // Efek suara pendek: Vorbis kualitas 3 (~64 kbps mono).
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
    "3",
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

log("Membuat aset ClassQuest...");

if (only !== "audio") {
  log("Gambar:");
  for (const [relativePath, factory] of IMAGES) {
    writeImage(relativePath, factory);
  }
}

if (only !== "image") {
  log("Audio:");
  // WAV ditulis langsung; ffmpeg baru dicek saat ada berkas `.ogg`, supaya SFX
  // WAV tetap bisa dibuat di mesin tanpa ffmpeg.
  let binary = "";
  for (const [relativePath, factory] of AUDIO) {
    if (relativePath.endsWith(".wav")) {
      writeWav(relativePath, factory);
    } else {
      if (!binary) binary = assertFfmpeg();
      writeOgg(relativePath, factory, binary);
    }
  }
}

log("Selesai.");
