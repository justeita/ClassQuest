/**
 * Efek ketik murni tanpa Phaser (sesuai docs/04-game/scene-format.md):
 * kecepatan 30–40 karakter/detik, teks disusun lewat `setText(slice)` pada
 * pemanggil — kelas ini hanya menghitung berapa karakter yang terungkap.
 */
export class Typewriter {
  private readonly text: string;
  private readonly charsPerSecond: number;
  private revealed = 0;

  constructor(text: string, charsPerSecond = 35) {
    if (charsPerSecond <= 0) {
      throw new Error("Kecepatan ketik harus positif.");
    }
    this.text = text;
    this.charsPerSecond = charsPerSecond;
  }

  /** Majukan animasi sebesar waktu yang berlalu (ms). */
  tick(elapsedMs: number): void {
    if (elapsedMs <= 0 || this.isDone()) return;
    const char = this.charsPerSecond * (elapsedMs / 1000);
    this.revealed = Math.min(this.text.length, this.revealed + char);
  }

  /** Tampilkan seluruh teks seketika (dipanggil saat pemain menekan lanjut). */
  finish(): void {
    this.revealed = this.text.length;
  }

  /** Teks yang sudah terungkap sampai tick terakhir. */
  current(): string {
    // Floor terakhir, bukan di tiap tick, agar karakter tak loncat-loncat.
    return this.text.slice(0, Math.floor(this.revealed));
  }

  isDone(): boolean {
    return this.revealed >= this.text.length;
  }
}
