"use client";

import { useCallback, useEffect, useRef } from "react";

import { Keycap } from "@/components/game/Keycap";

type TombolPercepatProps = {
  /** Kelas tombol HUD (cerah/gelap) yang sudah dipilih pemanggil. */
  kelas: string;
  /** Tahan ditekan: mulai time-lapse. */
  onMulai: () => void;
  /** Dilepas: kembali ke tempo normal. */
  onHentikan: () => void;
};

/**
 * Tombol "Percepat" ala Persona 3 Reload: **tahan** untuk mempercepat, lepas
 * untuk berhenti (docs/04-game/interaction-loop.md → Aturan input).
 *
 * Kenapa bukan sekadar `onPointerDown`/`onPointerUp` React: di peramban ponsel,
 * satu ketukan-tahan mudah diambil alih peramban sebagai gestur gulir/zoom.
 * Begitu itu terjadi, peramban memancarkan `pointercancel` dan **berhenti
 * mengirim `pointerup`**; kalau tombol berhenti di `pointercancel`, time-lapse
 * mati seketika dan tombol terasa "tidak berfungsi". `pointerleave` pun mudah
 * tersulut oleh jitter jempol, jadi ia tidak dipakai sama sekali.
 *
 * Karena itu pelepasan dipantau langsung dari `window` (`pointerup`,
 * `pointercancel`, `touchend`, `touchcancel`, dan `blur` sebagai jaring terakhir
 * saat jendela kehilangan fokus). Selama ditahan, listener `touchmove`
 * non-passive menahan gulir supaya peramban tidak sempat mengambil alih gestur.
 * React memasang event sentuh sebagai passive, jadi `preventDefault` harus lewat
 * `addEventListener` native dengan `{ passive: false }`.
 */
export function TombolPercepat({
  kelas,
  onMulai,
  onHentikan,
}: TombolPercepatProps) {
  const ref = useRef<HTMLButtonElement>(null);
  /** Sedang ditahan; menjaga `mulai` idempoten dan `berhenti` satu kali. */
  const aktifRef = useRef(false);
  /** Melepas semua listener `window` yang dipasang saat mulai. */
  const lepasRef = useRef<(() => void) | null>(null);
  // Simpan callback terbaru di ref supaya `mulai`/`berhenti` stabil dan tidak
  // pernah memakai closure usang selama tombol ditahan.
  const onMulaiRef = useRef(onMulai);
  const onHentikanRef = useRef(onHentikan);
  useEffect(() => {
    onMulaiRef.current = onMulai;
    onHentikanRef.current = onHentikan;
  }, [onMulai, onHentikan]);

  const berhenti = useCallback(() => {
    if (!aktifRef.current) return;
    aktifRef.current = false;
    lepasRef.current?.();
    onHentikanRef.current();
  }, []);

  const mulai = useCallback(() => {
    if (aktifRef.current) return;
    aktifRef.current = true;

    const cegahGulir = (e: TouchEvent) => {
      if (aktifRef.current) e.preventDefault();
    };

    window.addEventListener("pointerup", berhenti);
    window.addEventListener("pointercancel", berhenti);
    window.addEventListener("touchend", berhenti);
    window.addEventListener("touchcancel", berhenti);
    window.addEventListener("blur", berhenti);
    // Non-passive: satu-satunya cara andal memblokir gulir di iOS Safari.
    window.addEventListener("touchmove", cegahGulir, { passive: false });

    lepasRef.current = () => {
      window.removeEventListener("pointerup", berhenti);
      window.removeEventListener("pointercancel", berhenti);
      window.removeEventListener("touchend", berhenti);
      window.removeEventListener("touchcancel", berhenti);
      window.removeEventListener("blur", berhenti);
      window.removeEventListener("touchmove", cegahGulir);
      lepasRef.current = null;
    };

    onMulaiRef.current();
  }, [berhenti]);

  // `touchstart` non-passive: `touch-action: none` saja tidak cukup di iOS
  // Safari, gestur gulir masih bisa dimulai dari tombol ini.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const tolakSentuh = (e: TouchEvent) => e.preventDefault();
    el.addEventListener("touchstart", tolakSentuh, { passive: false });
    return () => el.removeEventListener("touchstart", tolakSentuh);
  }, []);

  // Komponen dilepas (mis. dialog selesai) saat tombol masih ditahan: jangan
  // tinggalkan listener `window` menggantung.
  useEffect(
    () => () => {
      aktifRef.current = false;
      lepasRef.current?.();
    },
    [],
  );

  return (
    <button
      ref={ref}
      type="button"
      aria-keyshortcuts="Tab"
      title="Percepat dialog — soal tetap muncul"
      className={`${kelas} touch-none select-none`}
      onPointerDown={(e) => {
        e.preventDefault();
        try {
          e.currentTarget.setPointerCapture?.(e.pointerId);
        } catch {
          // Pointer sudah tidak aktif; pelepasan tetap dipantau dari window.
        }
        e.currentTarget.focus();
        mulai();
      }}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        // Pemain keyboard menahan tombol HUD dengan Enter/Space.
        if (e.key !== "Enter" && e.key !== " ") return;
        if (e.repeat) return;
        e.preventDefault();
        mulai();
      }}
      onKeyUp={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        berhenti();
      }}
    >
      <Keycap>Tab</Keycap>
      Percepat
    </button>
  );
}
