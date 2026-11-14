/**
 * Sintesis audio untuk aset game: lima SFX dan lima musik loop.
 *
 * Semua dibangkitkan dari kode (gelombang kotak/segitiga + noise halus),
 * lalu dienkode ke OGG Vorbis oleh ffmpeg saat pembuatan aset — kecuali SFX
 * pendek yang bisa ditulis langsung sebagai WAV. Hasilnya file kecil, bebas
 * lisensi, dan bisa dibuat ulang persis sama.
 *
 * Spesifikasi: docs/07-assets/asset-guide.md → Musik (30–60 s, loop mulus,
 * 96–128 kbps) dan SFX (≤ 1 s).
 */

/** Nada dalam Hz untuk nama not, mis. `A4`. */
export function noteHz(name) {
  const match = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!match) throw new Error(`Not tidak dikenal: ${name}`);
  const [, letter, accidental, octave] = match;
  const offsets = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const semitone =
    offsets[letter] + (accidental === "#" ? 1 : accidental === "b" ? -1 : 0);
  const midi = (Number(octave) + 1) * 12 + semitone;
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Buffer mono float32. */
function buffer(seconds, sampleRate) {
  return new Float32Array(Math.round(seconds * sampleRate));
}

/** Envelope attack-decay-sustain-release sederhana, nilai 0–1. */
function adsr(
  t,
  duration,
  { attack = 0.01, decay = 0.08, sustain = 0.6, release = 0.12 } = {},
) {
  if (t < 0 || t > duration) return 0;
  if (t < attack) return t / attack;
  const afterAttack = t - attack;
  if (afterAttack < decay) return 1 - (1 - sustain) * (afterAttack / decay);
  const releaseStart = duration - release;
  if (t > releaseStart) return sustain * Math.max(0, (duration - t) / release);
  return sustain;
}

/** Gelombang kotak dengan duty cycle (0.5 = kotak penuh). */
function square(phase, duty = 0.5) {
  return phase % 1 < duty ? 1 : -1;
}

/** Gelombang segitiga, lebih lembut dari kotak. */
function triangle(phase) {
  const t = phase % 1;
  return 4 * Math.abs(t - 0.5) - 1;
}

/** Tambahkan satu nada ke buffer. */
function addNote(
  out,
  sampleRate,
  { at, duration, freq, wave = "square", gain = 0.2, duty = 0.5, envelope },
) {
  const start = Math.round(at * sampleRate);
  const length = Math.round(duration * sampleRate);
  let phase = 0;

  for (let i = 0; i < length; i += 1) {
    const index = start + i;
    if (index < 0 || index >= out.length) continue;
    const t = i / sampleRate;
    phase += freq / sampleRate;
    const raw =
      wave === "square"
        ? square(phase, duty)
        : wave === "triangle"
          ? triangle(phase)
          : Math.sin(phase * Math.PI * 2);
    const amp = envelope ? envelope(t, duration) : adsr(t, duration);
    out[index] += raw * amp * gain;
  }
  return out;
}

/** Noise deterministik untuk hi-hat/kendang. */
function addNoise(out, sampleRate, { at, duration, gain = 0.05, decay = 40 }) {
  const start = Math.round(at * sampleRate);
  const length = Math.round(duration * sampleRate);
  let state = 0x2545f491;

  for (let i = 0; i < length; i += 1) {
    const index = start + i;
    if (index < 0 || index >= out.length) continue;
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const value = ((state >>> 0) / 4294967296) * 2 - 1;
    const t = i / sampleRate;
    out[index] += value * Math.exp(-t * decay) * gain;
  }
  return out;
}

/** Normalisasi ke puncak tertentu lalu haluskan awal/akhir agar loop mulus. */
function finish(out, { peak = 0.7, fade = 0.02, sampleRate }) {
  let max = 0;
  for (const value of out) max = Math.max(max, Math.abs(value));
  const scale = max > 0 ? peak / max : 1;
  const fadeSamples = Math.round(fade * sampleRate);
  return out.map((value, index) => {
    const fromStart = Math.min(1, index / Math.max(1, fadeSamples));
    const fromEnd = Math.min(
      1,
      (out.length - 1 - index) / Math.max(1, fadeSamples),
    );
    return value * scale * Math.min(fromStart, fromEnd);
  });
}

/**
 * Float32 mono → WAV 16-bit. Dipakai langsung untuk SFX berformat `.wav`
 * (tanpa ffmpeg) dan sebagai input ffmpeg untuk `.ogg`.
 */
export function toWav(samples, sampleRate) {
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

/* -------------------------------------------------------------------------- */
/* SFX                                                                        */
/* -------------------------------------------------------------------------- */

/** Klik pendek: dua nada naik cepat. */
export function sfxClick(sampleRate = 44100) {
  const out = buffer(0.1, sampleRate);
  addNote(out, sampleRate, {
    at: 0,
    duration: 0.05,
    freq: noteHz("E6"),
    gain: 0.28,
    wave: "square",
    duty: 0.3,
  });
  addNote(out, sampleRate, {
    at: 0.045,
    duration: 0.055,
    freq: noteHz("B6"),
    gain: 0.22,
    wave: "square",
    duty: 0.3,
  });
  return finish(out, { sampleRate, peak: 0.8, fade: 0.005 });
}

/** Benar: arpeggio mayor naik. */
export function sfxCorrect(sampleRate = 44100) {
  const out = buffer(0.6, sampleRate);
  const step = 0.075;
  ["C5", "E5", "G5", "C6"].forEach((name, index) => {
    addNote(out, sampleRate, {
      at: index * step,
      duration: 0.22,
      freq: noteHz(name),
      gain: 0.2,
      wave: "triangle",
    });
  });
  addNote(out, sampleRate, {
    at: 0.3,
    duration: 0.28,
    freq: noteHz("E6"),
    gain: 0.11,
    wave: "square",
    duty: 0.25,
  });
  return finish(out, { sampleRate, peak: 0.75, fade: 0.01 });
}

/** Salah: dua nada turun lembut, tanpa disonansi keras. */
export function sfxWrong(sampleRate = 44100) {
  const out = buffer(0.55, sampleRate);
  addNote(out, sampleRate, {
    at: 0,
    duration: 0.24,
    freq: noteHz("A4"),
    gain: 0.2,
    wave: "triangle",
  });
  addNote(out, sampleRate, {
    at: 0.17,
    duration: 0.32,
    freq: noteHz("F4"),
    gain: 0.18,
    wave: "triangle",
  });
  return finish(out, { sampleRate, peak: 0.6, fade: 0.02 });
}

/** Ganti scene: whoosh halus dari noise + nada rendah. */
export function sfxPage(sampleRate = 44100) {
  const out = buffer(0.45, sampleRate);
  addNoise(out, sampleRate, { at: 0, duration: 0.42, gain: 0.12, decay: 7 });
  addNote(out, sampleRate, {
    at: 0,
    duration: 0.42,
    freq: noteHz("D3"),
    gain: 0.09,
    wave: "triangle",
  });
  addNote(out, sampleRate, {
    at: 0.1,
    duration: 0.3,
    freq: noteHz("A3"),
    gain: 0.06,
    wave: "triangle",
  });
  return finish(out, { sampleRate, peak: 0.55, fade: 0.03 });
}

/**
 * Ketik dialog: "tick" pendek untuk tiap karakter.
 *
 * Rancangan sengaja sederhana dan lembut supaya tidak mengganggu saat diputar
 * puluhan kali per detik: chirp naik singkat (D5 → A5) dari gelombang segitiga
 * dengan sedikit kotak, plus sisa klik mekanis yang sangat halus. Diputar secara
 * bergantian nadanya oleh `GameScene`, jadi terasa hidup tanpa jadi bising.
 * Semua dibangkitkan di sini — bukan sampel dari game mana pun.
 */
export function sfxType(sampleRate = 44100) {
  const duration = 0.05;
  const out = buffer(duration, sampleRate);
  const base = noteHz("D5");
  const target = noteHz("A5");
  const glide = 0.014;
  let phase = 0;

  for (let i = 0; i < out.length; i += 1) {
    const t = i / sampleRate;
    const freq = base + (target - base) * Math.min(1, t / glide);
    phase += freq / sampleRate;
    const raw = triangle(phase) * 0.75 + square(phase, 0.18) * 0.25;
    const envelope = Math.min(1, t / 0.003) * Math.exp(-t * 70);
    out[i] += raw * envelope * 0.5;
  }

  // Sisa "klik" tombol: noise sangat singkat agar terasa mekanis, bukan hanya nada.
  addNoise(out, sampleRate, { at: 0, duration: 0.007, gain: 0.12, decay: 320 });
  return finish(out, { sampleRate, peak: 0.5, fade: 0.003 });
}

/* -------------------------------------------------------------------------- */
/* Musik                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Bangun lagu dari progresi akor dan pola. Tiap bagian dijadwalkan per birama.
 *
 * `plan` = { bpm, bars, chords, melody, bass, hats }.
 * `chords` satu akor per birama (array nada). `melody` nada per ketukan
 * (null = istirahat). Nada dimainkan di oktaf yang diberikan lewat nama not.
 */
function buildSong(
  sampleRate,
  { bpm, bars, chords, melody, arpeggio = true, pulse = 0.5 },
) {
  const beat = 60 / bpm;
  const barSeconds = beat * 4;
  const total = bars * barSeconds;
  const out = buffer(total, sampleRate);

  for (let bar = 0; bar < bars; bar += 1) {
    const chord = chords[bar % chords.length];
    const barStart = bar * barSeconds;

    // Pad: akor ditahan satu birama, dua gelombang lembut.
    for (const name of chord) {
      addNote(out, sampleRate, {
        at: barStart,
        duration: barSeconds * 0.98,
        freq: noteHz(name),
        gain: 0.055,
        wave: "triangle",
        envelope: (t, duration) =>
          Math.min(1, t / 0.25) * Math.min(1, (duration - t) / 0.3),
      });
    }

    // Bas: akar akor, dua kali per birama.
    addNote(out, sampleRate, {
      at: barStart,
      duration: beat * 1.4,
      freq: noteHz(chord[0]) / 2,
      gain: 0.16,
      wave: "square",
      duty: 0.5,
    });
    addNote(out, sampleRate, {
      at: barStart + beat * 2,
      duration: beat * 1.2,
      freq: noteHz(chord[0]) / 2,
      gain: 0.13,
      wave: "square",
      duty: 0.5,
    });

    // Arpeggio: nada akor bergantian tiap setengah ketukan.
    if (arpeggio) {
      for (let step = 0; step < 8; step += 1) {
        const name = chord[step % chord.length];
        addNote(out, sampleRate, {
          at: barStart + step * (beat / 2),
          duration: beat * 0.42,
          freq: noteHz(name) * pulse,
          gain: 0.05,
          wave: "square",
          duty: 0.25,
          envelope: (t, duration) =>
            Math.exp(-t * 12) * Math.min(1, (duration - t) / 0.05),
        });
      }
    }

    // Hi-hat tiap ketukan.
    for (let beatIndex = 0; beatIndex < 4; beatIndex += 1) {
      addNoise(out, sampleRate, {
        at: barStart + beatIndex * beat,
        duration: 0.06,
        gain: beatIndex % 2 === 0 ? 0.05 : 0.03,
        decay: 60,
      });
    }
  }

  // Melodi di atas progresi.
  melody.forEach((name, index) => {
    if (!name) return;
    addNote(out, sampleRate, {
      at: index * (beat / 2),
      duration: beat * 0.9,
      freq: noteHz(name),
      gain: 0.11,
      wave: "triangle",
      envelope: (t, duration) =>
        Math.min(1, t / 0.02) *
        Math.exp(-t * 3) *
        Math.min(1, (duration - t) / 0.1),
    });
  });

  return finish(out, { sampleRate, peak: 0.62, fade: 0.35 });
}

/** Ulangi daftar nada/simbol `times` kali (dipakai memperpanjang lagu). */
function repeat(list, times) {
  const out = [];
  for (let i = 0; i < times; i += 1) out.push(...list);
  return out;
}

/** Musik sekolah tenang: akor mayor lembut, tempo lambat. */
export function musicSchoolCalm(sampleRate = 44100) {
  const bars = 16;
  return buildSong(sampleRate, {
    bpm: 78,
    bars,
    pulse: 1,
    chords: [
      ["C4", "E4", "G4"],
      ["A3", "C4", "E4"],
      ["F3", "A3", "C4"],
      ["G3", "B3", "D4"],
      ["C4", "E4", "G4"],
      ["E4", "G4", "B4"],
      ["F3", "A3", "C4"],
      ["G3", "B3", "D4"],
    ],
    melody: repeat(
      [
        "E5",
        null,
        "G5",
        null,
        "D5",
        null,
        null,
        null,
        "C5",
        null,
        "E5",
        null,
        "A4",
        null,
        null,
        null,
        "A4",
        null,
        "C5",
        null,
        "F5",
        null,
        "E5",
        null,
        "D5",
        null,
        "B4",
        null,
        "G4",
        null,
        null,
        null,
        "E5",
        null,
        "G5",
        null,
        "C6",
        null,
        "B5",
        null,
        "G5",
        null,
        "E5",
        null,
        "B4",
        null,
        null,
        null,
        "A4",
        null,
        "C5",
        null,
        "F5",
        null,
        "A5",
        null,
        "G5",
        null,
        "D5",
        null,
        null,
        null,
        null,
        null,
      ],
      2,
    ),
  });
}

/** Musik petualangan: tempo lebih cepat, arpeggio naik. */
export function musicAdventure(sampleRate = 44100) {
  const bars = 16;
  return buildSong(sampleRate, {
    bpm: 104,
    bars,
    pulse: 2,
    chords: [
      ["D4", "F#4", "A4"],
      ["G4", "B4", "D5"],
      ["A3", "C#4", "E4"],
      ["D4", "F#4", "A4"],
      ["B3", "D4", "F#4"],
      ["G4", "B4", "D5"],
      ["E4", "G4", "B4"],
      ["A3", "C#4", "E4"],
    ],
    melody: repeat(
      [
        "D5",
        "F#5",
        "A5",
        null,
        "F#5",
        null,
        "D5",
        null,
        "B4",
        "D5",
        "G5",
        null,
        "D5",
        null,
        "B4",
        null,
        "A4",
        "C#5",
        "E5",
        null,
        "C#5",
        null,
        "A4",
        null,
        "D5",
        null,
        "F#5",
        "A5",
        null,
        "F#5",
        null,
        null,
        "F#5",
        null,
        "D5",
        null,
        "B4",
        null,
        null,
        null,
        "G5",
        null,
        "E5",
        null,
        "D5",
        null,
        "B4",
        null,
        "E5",
        null,
        "G5",
        null,
        "B5",
        null,
        "A5",
        null,
        "C#5",
        null,
        "E5",
        null,
        "A5",
        null,
        null,
        null,
      ],
      2,
    ),
  });
}

/** Musik misteri: tangga minor, tempo lambat, tanpa arpeggio terang. */
export function musicMystery(sampleRate = 44100) {
  const bars = 16;
  return buildSong(sampleRate, {
    bpm: 66,
    bars,
    pulse: 1,
    arpeggio: true,
    chords: [
      ["A3", "C4", "E4"],
      ["F3", "A3", "C4"],
      ["D3", "F3", "A3"],
      ["E3", "G#3", "B3"],
      ["A3", "C4", "E4"],
      ["G3", "B3", "D4"],
      ["F3", "A3", "C4"],
      ["E3", "G#3", "B3"],
    ],
    melody: repeat(
      [
        null,
        "A4",
        null,
        "C5",
        null,
        "B4",
        null,
        null,
        "A4",
        null,
        null,
        "F4",
        null,
        null,
        null,
        null,
        "D4",
        null,
        "F4",
        null,
        "A4",
        null,
        null,
        null,
        "G#4",
        null,
        "B4",
        null,
        null,
        null,
        null,
        null,
        null,
        "E5",
        null,
        "C5",
        null,
        "A4",
        null,
        null,
        "B4",
        null,
        "G4",
        null,
        null,
        null,
        null,
        null,
        "F4",
        null,
        "A4",
        null,
        "C5",
        null,
        "A4",
        null,
        "G#4",
        null,
        null,
        null,
        "B4",
        null,
        null,
        null,
      ],
      2,
    ),
  });
}

/** Musik penutup: hangat, resolusi mayor, tempo sedang. */
export function musicEnding(sampleRate = 44100) {
  const bars = 16;
  return buildSong(sampleRate, {
    bpm: 72,
    bars,
    pulse: 1,
    chords: [
      ["F3", "A3", "C4"],
      ["C4", "E4", "G4"],
      ["D3", "F3", "A3"],
      ["Bb3", "D4", "F4"],
      ["F3", "A3", "C4"],
      ["A3", "C4", "E4"],
      ["Bb3", "D4", "F4"],
      ["C4", "E4", "G4"],
    ],
    melody: repeat(
      [
        "C5",
        null,
        "F5",
        null,
        "E5",
        null,
        null,
        null,
        "E5",
        null,
        "G5",
        null,
        "C5",
        null,
        null,
        null,
        "F5",
        null,
        "A5",
        null,
        "G5",
        null,
        "F5",
        null,
        "D5",
        null,
        "F5",
        null,
        null,
        null,
        null,
        null,
        "C5",
        null,
        "A4",
        null,
        "F4",
        null,
        null,
        null,
        "E5",
        null,
        "C5",
        null,
        "A4",
        null,
        null,
        null,
        "F5",
        null,
        "D5",
        null,
        "Bb4",
        null,
        null,
        null,
        "C5",
        null,
        "E5",
        null,
        "G5",
        null,
        null,
        null,
      ],
      2,
    ),
  });
}

/** Musik default: nada tunggal tenang untuk fallback. */
export function musicDefault(sampleRate = 44100) {
  const bars = 12;
  return buildSong(sampleRate, {
    bpm: 70,
    bars,
    pulse: 1,
    chords: [
      ["C4", "E4", "G4"],
      ["A3", "C4", "E4"],
      ["F3", "A3", "C4"],
      ["G3", "B3", "D4"],
    ],
    melody: repeat(
      [
        null,
        "G4",
        null,
        null,
        "E4",
        null,
        null,
        null,
        null,
        "C5",
        null,
        null,
        "A4",
        null,
        null,
        null,
        null,
        "A4",
        null,
        null,
        "F4",
        null,
        null,
        null,
        null,
        "B4",
        null,
        null,
        "D5",
        null,
        null,
        null,
      ],
      3,
    ),
  });
}
