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
 * Papan nama NPC, penanda quest, dan chip `Space`, dipisah dari `GameCanvas`.
 *
 * Pemisahan ini bukan soal rapi-rapian: scene mengirim posisi **setiap frame**
 * supaya tanda tetap menempel pada NPC saat kamera bergeser. Kalau posisi itu
 * masuk ke state `GameCanvas`, seluruh overlay (HUD, dialog, jurnal) ikut
 * dirender ulang 60 kali per detik. Di sini hanya elemen kecil yang berubah.
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

  return (
    <>
      {nama.map((plate) => (
        <NpcNameplate key={plate.npcId} plate={plate} />
      ))}
      {penanda.map((marker) => (
        <NpcMarker key={marker.npcId} marker={marker} />
      ))}
      {hint && <InteractHint hint={hint} />}
    </>
  );
}
