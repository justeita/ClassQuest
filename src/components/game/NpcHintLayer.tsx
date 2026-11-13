"use client";

import { useEffect, useState } from "react";

import { InteractHint } from "@/components/game/InteractHint";
import { NpcMarker } from "@/components/game/NpcMarker";
import { NpcNameplate } from "@/components/game/NpcNameplate";
import type {
  GameBus,
  NpcMarker as NpcMarkerView,
  NpcNameplate as NpcNameplateView,
  PromptView,
} from "@/game/gameBus";

type NpcHintLayerProps = {
  /** Bus game; `null` selama Phaser belum siap. */
  bus: GameBus | null;
  /** Dialog, tantangan, atau menu jeda sedang menutupi dunia. */
  tersembunyi: boolean;
};

/**
 * Papan nama NPC, penanda quest, dan kotak `Space`, dipisah dari `GameCanvas`.
 *
 * Prompt pemberi quest tidak berdiri sendiri: ia digabung ke paket penanda `!`
 * supaya keduanya naik-turun bersama. Prompt NPC obrolan singkat (dan prompt
 * pemberi quest saat penandanya jadi beacon tepi) tetap tampil sendiri lewat
 * `InteractHint`.
 *
 * Pemisahan dari `GameCanvas` bukan soal rapi-rapian: scene mengirim posisi
 * **setiap frame** supaya tanda tetap menempel pada NPC saat kamera bergeser.
 * Kalau posisi itu masuk ke state `GameCanvas`, seluruh overlay (HUD, dialog,
 * jurnal) ikut dirender ulang 60 kali per detik. Di sini hanya elemen kecil
 * yang berubah.
 *
 * Posisi dikirim scene hanya saat berubah (dibulatkan ke piksel internal), dan
 * React mengabaikan `setState` dengan nilai sama, jadi saat pemain diam tidak
 * ada render sama sekali.
 */
export function NpcHintLayer({ bus, tersembunyi }: NpcHintLayerProps) {
  const [nama, setNama] = useState<NpcNameplateView[]>([]);
  const [penanda, setPenanda] = useState<NpcMarkerView[]>([]);
  const [hint, setHint] = useState<PromptView | null>(null);

  useEffect(() => {
    if (!bus) return;

    const lepas = [
      bus.on("nametags", ({ plates }) => setNama(plates)),
      bus.on("markers", ({ markers }) => setPenanda(markers)),
      bus.on("prompt", (payload) => setHint(payload.hint)),
    ];
    return () => lepas.forEach((off) => off());
  }, [bus]);

  if (tersembunyi) return null;

  // Prompt pemberi quest digabung ke paket penanda `!` di `NpcMarker`, supaya
  // `!` dan `Space` naik-turun bersama sebagai satu widget. Bila penanda sedang
  // menjadi beacon tepi layar, tidak ada `!` di kepala NPC, jadi kotak tetap
  // tampil sendiri lewat `InteractHint`.
  const promptGabung =
    hint !== null && hint.menempel && penanda.some((p) => p.tepi !== true)
      ? hint.text
      : null;

  return (
    <>
      {nama.map((plate) => (
        <NpcNameplate key={plate.npcId} plate={plate} />
      ))}
      {penanda.map((marker) => (
        <NpcMarker
          key={marker.npcId}
          marker={marker}
          prompt={
            marker.tepi !== true && promptGabung !== null
              ? promptGabung
              : undefined
          }
        />
      ))}
      {hint && promptGabung === null && <InteractHint hint={hint} />}
    </>
  );
}
