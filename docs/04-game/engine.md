---
status: draft
last_reviewed: 2026-11-08
owner: tim ClassQuest
---

# Arsitektur Game (Phaser 4.2.1)

Game berjalan **sepenuhnya di client**. Server hanya mengirim `Story` dan
menerima hasil. Tidak ada Phaser di server, tidak ada `window` saat SSR.

- Keputusan engine: [ADR 0004](../09-decisions/0004-phaser-4.md)
- UI hybrid: [ADR 0007](../09-decisions/0007-hybrid-ui.md)
- Desain: [`game-design.md`](./game-design.md)

## Pembagian tanggung jawab

| Bagian                      | Teknologi        | Isi                                          |
| --------------------------- | ---------------- | -------------------------------------------- |
| Dunia, background, karakter | Phaser           | Sprite, posisi, animasi, transisi            |
| Dialog                      | Phaser           | Textbox, typewriter, portrait                |
| Tantangan                   | React DOM        | Form, tombol, input, feedback, aksesibilitas |
| HUD, menu, hasil            | React DOM        | Chapter indicator, jeda, layar hasil         |
| State cerita                | TypeScript murni | `StoryRunner` (tanpa Phaser)                 |
| Persistensi progres         | `localStorage`   | Ditulis oleh React, dibaca saat mulai        |

Alasannya: input teks dan aksesibilitas jauh lebih baik di DOM, sementara dunia
game butuh render loop. Memaksakan semuanya ke canvas akan memperlambat
pengembangan dan merusak aksesibilitas.

## Konfigurasi Phaser

Kode yang ada hari ini (`src/game/config.ts`):

```ts
// src/game/config.ts
import Phaser from "phaser";
import { GameScene } from "./scenes/GameScene";
import { PreloadScene } from "./scenes/PreloadScene";

export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

export function createGameConfig(
  parent: HTMLElement,
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#14201a",
    pixelArt: true,
    roundPixels: true, // Phaser 4 default false — wajib diset eksplisit
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [PreloadScene, GameScene],
  };
}
```

Resolusi internal **480×270** (16:9) dan latar `#14201a`. Angka dan warna ini
harus sama dengan [`game-design.md`](./game-design.md#resolusi-dan-skala) dan
[`../07-assets/asset-guide.md`](../07-assets/asset-guide.md). Mengubahnya berarti
mengubah ukuran aset juga.

Physics arcade dipasang dengan gravitasi nol. Belum dipakai, tapi sudah disiapkan
untuk gerak pemain di map (`PlayerConfig.speed` di `src/game/types.ts`).

Catatan Phaser 4:

- `roundPixels` **default `false`** di v4. Tanpa ini, pixel art akan blur/bergetar.
- `setTintFill()` sudah dihapus. Untuk efek highlight, pakai `setTint()` +
  `setTintMode()`.
- FX dan mask kini satu sistem filter. Jangan menyalin contoh Phaser 3.
- `Phaser.Geom.Point` tidak ada; pakai `Phaser.Math.Vector2`.
- `DynamicTexture` butuh `render()` setelah menggambar.

## Integrasi dengan Next.js 16

### Aturan

1. Komponen host **wajib** `"use client"`.
2. Phaser **wajib** diimpor dinamis di dalam `useEffect` — jangan di top-level.
3. Game **wajib** di-`destroy()` saat cleanup.
4. Jangan memakai `next/dynamic` dengan `ssr: false` di Server Component.
5. Jangan menyimpan instance Phaser di state React (menyebabkan re-render).

### Komponen host

Kode yang ada hari ini (`src/components/game/GameCanvas.tsx`):

```tsx
// src/components/game/GameCanvas.tsx
"use client";

import { useEffect, useRef } from "react";
import type { GameHandle } from "@/game/types";

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameHandle | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    void import("@/game/createGame")
      .then(({ createGame }) => {
        if (cancelled) return;
        gameRef.current = createGame(container);
      })
      .catch((error: unknown) => {
        console.error("Gagal memuat game:", error);
      });

    return () => {
      cancelled = true;
      gameRef.current?.destroy();
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      role="region"
      aria-label="Area permainan ClassQuest"
    />
  );
}
```

Yang perlu diperhatikan dari kode ini:

- Modul `@/game/createGame` diimpor **di dalam** `useEffect`, bukan di top-level.
  `createGame.ts` mengimpor Phaser, jadi top-level import akan membuat `window is
not defined` saat build.
- Instance game disimpan di `useRef`, bukan `useState` — supaya tidak memicu
  re-render.
- Flag `cancelled` menutup celah balapan: `import()` bisa selesai setelah cleanup
  dijalankan, dan tanpa flag itu game akan hidup tanpa pemilik.
- `GameHandle.destroy()` memanggil `game.destroy(true)`, jadi canvas ikut dilepas.

Catatan penting: **jangan** memberi `aria-hidden="true"` pada host canvas. Itu
menghapus seluruh game dari accessibility tree, padahal
[`accessibility.md`](./accessibility.md) mewajibkan canvas punya `aria-label` dan
bisa menerima fokus keyboard. Yang dekoratif cukup elemen di dalam canvas.

### Keadaan sekarang vs target

`GameCanvas`, `createGame`, dan scene placeholder **sudah ada**. `GameShell`,
bridge, dan `Story` belum. Bentuk target saat cerita siap:

```tsx
type Props = {
  story: Story;
  onEvent: (event: GameEvent) => void;
};

// di dalam useEffect:
const [PhaserModule, { createGameConfig }] = await Promise.all([
  import("phaser"),
  import("@/game/config"),
]);
const bridge = createBridge();
bridge.on("event", onEvent);
game = new PhaserModule.default.Game(createGameConfig(hostRef.current));
game.registry.set("story", story);
game.registry.set("bridge", bridge);
```

Selama `story` dan `bridge` belum ada, halaman `/game` hanya menampilkan scene
placeholder. Jangan menambahkan props itu setengah jalan — tunggu `Story` dari
`src/story/schema.ts` ada lebih dulu.

### Jebakan `<Activity>` di Next 16

Dengan `cacheComponents: true`, Next memakai React `<Activity>` untuk menyimpan
state route yang ditinggalkan. Artinya:

- Saat pengguna pindah route, **effect cleanup dijalankan** → game dihancurkan.
- Saat kembali, effect dijalankan lagi → game dibuat ulang.

Konsekuensi: **jangan** mengandalkan state di dalam Phaser untuk menyimpan progres.
Semua progres harus ada di `localStorage` (atau state React di atas), dan game
harus bisa dibuat ulang dari `story` + `progress`.

### SSR

Gejala kalau salah: `ReferenceError: window is not defined` atau
`document is not defined` saat `next build`.

Penyebab: Phaser diimpor di module scope komponen yang dirender server.

Perbaikan: pastikan hanya di dalam `useEffect` (seperti contoh) atau di file yang
ditandai `"use client"` dan diimpor dinamis.

## Scene Phaser

| Scene          | Tanggung jawab sekarang                       | Target                                        |
| -------------- | --------------------------------------------- | --------------------------------------------- |
| `PreloadScene` | Langsung pindah ke `GameScene`                | Muat aset cerita + progress bar               |
| `GameScene`    | Latar `#14201a` + teks "ClassQuest" di tengah | Background, karakter, dialog, perintah lanjut |
| `ResultScene`  | Belum ada                                     | (Opsional) transisi akhir                     |

`GameScene` sekarang hanya placeholder untuk membuktikan boot berhasil. Saat
`StoryRunner` dan manifest aset ada, isinya diganti — bukan ditambah scene baru
dengan nama lain.

`ChallengeScene` **tidak ada** — tantangan adalah overlay React.

## Pemuatan aset

Hanya muat aset yang dipakai (`assetUsage`), bukan seluruh manifest.

```ts
// src/game/systems/asset-loader.ts
export function queueStoryAssets(
  load: Phaser.Loader.LoaderPlugin,
  story: Story,
) {
  for (const id of story.assetUsage.backgrounds) {
    const asset = ASSETS_BY_ID.get(id);
    if (asset) load.image(asset.id, asset.path);
  }
  for (const id of story.assetUsage.sprites) {
    const asset = ASSETS_BY_ID.get(id);
    if (asset)
      load.spritesheet(asset.id, asset.path, {
        frameWidth: 32,
        frameHeight: 48,
      });
  }
  for (const id of story.assetUsage.music) {
    const asset = ASSETS_BY_ID.get(id);
    if (asset) load.audio(asset.id, asset.path);
  }
}
```

Aturan:

- Key di Phaser **sama dengan `assetId`**. Jangan membuat key lain.
- Kalau `loaderror`, pakai fallback (`bg_default`, `char_default`) dan lanjut.
- Tampilkan progress yang jujur; jangan freeze tanpa indikator.

## Bridge Phaser ↔ React

Event yang dikirim **dari** Phaser:

```ts
type GameEvent =
  | { type: "ready" }
  | { type: "chapter_start"; chapterId: string; index: number; total: number }
  | { type: "scene_start"; sceneId: string }
  | { type: "beat"; beat: BeatView }
  | { type: "challenge"; challengeId: string }
  | { type: "chapter_complete"; chapterId: string }
  | { type: "story_complete" }
  | { type: "error"; code: string };
```

Perintah **ke** Phaser:

```ts
type GameCommand =
  | { type: "advance" }
  | { type: "resolve_challenge"; challengeId: string; correct: boolean }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "restart_chapter" };
```

Implementasi: emitter kecil bertipe (bukan `EventEmitter` global) agar mudah
dites dan tidak bocor antar-instance.

## Alur state

`StoryRunner` adalah **state machine murni** yang tidak tahu Phaser:

```ts
type RunnerState = {
  chapterIndex: number;
  sceneIndex: number;
  beatIndex: number;
  phase: "dialog" | "challenge" | "chapter_end" | "done";
};

export function advance(state: RunnerState, story: Story): RunnerState;
export function currentBeat(state: RunnerState, story: Story): Beat;
export function resolveChallenge(state: RunnerState, story: Story): RunnerState;
```

Phaser hanya **menampilkan** hasil `currentBeat`. Ini membuat logika cerita bisa
dites tanpa browser dan tanpa Phaser.

## Konsekuensi performa

- Satu instance `Phaser.Game` per halaman. Jangan membuat game baru tiap render.
- `useEffect` dependency harus stabil (`story` dan `onEvent` di-memo).
- Aset audio dimuat sekali per cerita; jangan memuat ulang saat pindah scene.
- Hindari membuat `Text` baru setiap frame; update teks yang ada.

## Checklist implementasi

Yang sudah berlaku di kode hari ini:

- [x] `"use client"` di komponen host.
- [x] Phaser diimpor dinamis di dalam `useEffect`.
- [x] `game.destroy(true)` di cleanup.
- [x] `pixelArt: true`, `roundPixels: true`.
- [x] `scale.mode = FIT`, resolusi 480×270.
- [x] `bun run build` tidak menghasilkan error `window is not defined`.

Yang belum, karena fiturnya belum ada:

- [ ] Key aset = `assetId`.
- [ ] `loaderror` punya fallback.
- [ ] Tidak ada state penting hanya di dalam Phaser.
- [ ] Bridge mengirim `GameEvent` dan menerima `GameCommand`.
