"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { heartbeatAction, leaveAction } from "@/actions/live";
import type { Viewer } from "@/lib/presence";

/**
 * Conexão SSE única por lista:
 * - evento `board` → `router.refresh()` (refetch do board);
 * - evento `presence` → atualiza a lista de viewers;
 * - heartbeat a cada 10s (registra presença) e `leave` na saída;
 * - fallback: poll de 20s caso o SSE seja bloqueado por proxy.
 * Retorna os viewers atuais (para renderizar os avatares de presença).
 */
export function useBoardLive(listId: string): Viewer[] {
  const router = useRouter();
  const [viewers, setViewers] = React.useState<Viewer[]>([]);

  React.useEffect(() => {
    if (!listId) {
      setViewers([]);
      return;
    }

    const es = new EventSource(`/api/live?listId=${encodeURIComponent(listId)}`);
    es.addEventListener("board", () => router.refresh());
    es.addEventListener("presence", (e) => {
      try {
        setViewers(JSON.parse((e as MessageEvent).data));
      } catch {
        /* payload inválido — ignora */
      }
    });

    const beat = () => heartbeatAction(listId).then(setViewers).catch(() => {});
    beat();
    const heartbeatTimer = setInterval(beat, 10_000);
    const fallbackTimer = setInterval(() => router.refresh(), 20_000);

    return () => {
      es.close();
      clearInterval(heartbeatTimer);
      clearInterval(fallbackTimer);
      void leaveAction(listId);
    };
  }, [listId, router]);

  return viewers;
}
