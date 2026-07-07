"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/**
 * Escuta o canal de notificações do usuário (SSE) e atualiza a UI (router.refresh)
 * quando chega uma nova notificação — sino/inbox ficam ao vivo, sem recarregar.
 */
export function useNotificationsLive(): void {
  const router = useRouter();

  React.useEffect(() => {
    let es: EventSource | null = null;
    let closed = false;

    try {
      es = new EventSource("/api/notifications/live");
      es.addEventListener("notify", () => router.refresh());
    } catch {
      /* SSE indisponível — cai no carregamento normal */
    }

    return () => {
      closed = true;
      es?.close();
      void closed;
    };
  }, [router]);
}
