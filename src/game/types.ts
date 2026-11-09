import type { GameBus } from "./gameBus";

export type GameHandle = {
  /** Bridge ke React: event tantangan dan command jawaban. */
  bus: GameBus;
  destroy: () => void;
};

/** Pengaturan gerak pemain top-down (ADR 0008). */
export type PlayerConfig = {
  /** Kecepatan horizontal/vertikal dalam piksel per detik. */
  speed: number;
};
