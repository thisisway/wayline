"use client";

import { MousePointer2 } from "lucide-react";
import { presence } from "@/mock/data";

/**
 * Presença ao vivo simulada: cursores nomeados sobre a área do board.
 * Estático nesta fase — quando o realtime entrar, as posições virão do
 * canal de presença (WebSocket / Liveblocks).
 */
export function PresenceLayer() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {presence
        .filter((u) => u.active)
        .map((u) => (
          <div
            key={u.id}
            className="absolute -translate-x-1 -translate-y-1 transition-all duration-700"
            style={{ left: `${u.x}%`, top: `${u.y}%` }}
          >
            <MousePointer2
              className="size-4 drop-shadow"
              style={{ color: u.color, fill: u.color }}
            />
            <span
              className="ml-3 inline-block whitespace-nowrap rounded-pill px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm"
              style={{ backgroundColor: u.color }}
            >
              {u.name.split(" ")[0]}
            </span>
          </div>
        ))}
    </div>
  );
}
