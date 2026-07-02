"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/**
 * Escuta updates ao vivo do board via SSE (`/api/live?listId=...`) e chama
 * `router.refresh()` ao receber um evento. Fallback: poll lento (20s) caso o
 * SSE seja bloqueado por proxy — garante consistência eventual sem depender do
 * stream.
 */
export function useLiveList(listId: string): void {
  const router = useRouter();

  React.useEffect(() => {
    if (!listId) return;

    const es = new EventSource(`/api/live?listId=${encodeURIComponent(listId)}`);
    es.onmessage = () => router.refresh();

    const fallback = setInterval(() => router.refresh(), 20000);

    return () => {
      es.close();
      clearInterval(fallback);
    };
  }, [listId, router]);
}
