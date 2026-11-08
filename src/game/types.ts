export type GameHandle = {
  destroy: () => void;
};

/** Pengaturan gerak pemain top-down (ADR 0008). */
export type PlayerConfig = {
  /** Kecepatan horizontal/vertikal dalam piksel per detik. */
  speed: number;
};
