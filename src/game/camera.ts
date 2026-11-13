/**
 * Keputusan kamera dunia (world-design.md § Kamera, ADR 0010).
 *
 * Modul murni supaya keputusannya bisa dites tanpa Phaser. GameScene yang
 * menerapkannya lewat `setBounds`, `startFollow`, `setDeadzone`, dan
 * `centerOn`.
 */

import { GAME_HEIGHT, GAME_WIDTH } from "./constants";

/** Ukuran dunia dalam piksel (bentuknya dari `WorldData`). */
export type UkuranDunia = { width: number; height: number };

/** Dead zone: kamera diam selama pemain masih di dalam kotak 128×96 px. */
export const DEADZONE_PX = { width: 128, height: 96 };

/**
 * Kamera menempel pemain (world-design.md § Kamera).
 *
 * `1` berarti posisi kamera mengikuti target apa adanya; tidak ada luncuran
 * yang mengejar ketinggalan di belakang pemain. Luncuran halus (`0,12`) dulu
 * dipakai supaya gerak terasa sinematik, tetapi di pixel art ia justru membuat
 * seluruh dunia bergeser pelan setiap saat: mata membaca getaran itu sebagai
 * pusing/mual (catatan lanjutan 2026-11-13 di ADR 0010).
 *
 * Nilai 1 juga menjaga `scrollX/scrollY` tetap bilangan bulat — target pemain
 * dan dead zone sama-sama bulat — sehingga objek tidak pernah duduk di
 * setengah piksel.
 */
export const CAMERA_LERP = 1;

/**
 * Zoom kamera dunia.
 *
 * Pada 1:1 bingkai 640×360 hanya menampilkan potongan dunia selebar 640 px,
 * sehingga karakter desa setinggi 56 px menutupi ~15,5% tinggi layar dan
 * terasa dekat. Dengan `0,8` kamera melihat 800×450 px dunia (25% lebih luas)
 * dan karakter turun ke ~12,4%, tanpa menyentuh ukuran aset maupun resolusi
 * internal.
 *
 * Nilai ini **pecahan**, jadi `renderRoundPixels` Phaser mati dan pixel art
 * bisa sedikit tidak rata saat bergerak. Efeknya ditekan `CAMERA_LERP = 1`
 * (kamera tidak meluncur tiap frame, hanya bergeser saat pemain melangkah).
 * Satu angka ini cukup diubah bila perlu lebih jauh atau lebih dekat.
 */
export const ZOOM_KAMERA = 0.8;

export type CameraMode = "lock" | "follow";

/**
 * Dunia yang muat satu layar dikunci ke tengah; dunia lebih luas dari layar
 * mengikuti pemain dengan batas map. Dunia desa selalu lebih luas, tetapi
 * aturannya tetap ada supaya peta kecil kelak tidak goyang.
 */
export function kameraMode(dunia: UkuranDunia): CameraMode {
  return dunia.width <= GAME_WIDTH && dunia.height <= GAME_HEIGHT
    ? "lock"
    : "follow";
}

/** Dead zone efektif dalam piksel, disalin supaya pemanggil tidak bisa mengubah. */
export function deadzonePx(): { width: number; height: number } {
  return { ...DEADZONE_PX };
}

/**
 * Dead zone dalam **piksel dunia** untuk zoom kamera saat ini.
 *
 * `DEADZONE_PX` adalah ukuran yang diinginkan di layar, sedangkan Phaser
 * membandingkan dead zone dengan posisi pemain di koordinat dunia. Karena zoom
 * ikut mengecilkan tampilannya, nilainya dibagi zoom supaya kotak "kamera diam"
 * tetap terasa 128×96 px setelah kamera keluar dari 1:1.
 */
export function deadzoneDunia(zoom: number): {
  width: number;
  height: number;
} {
  return {
    width: DEADZONE_PX.width / zoom,
    height: DEADZONE_PX.height / zoom,
  };
}
