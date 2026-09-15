"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@wayline/ui";

const EMOJIS = [
  "🚀", "🎯", "📊", "📈", "💡", "🎨", "📝", "✅", "📁", "📌",
  "🔥", "⭐", "💼", "🧩", "⚙️", "🌐", "📣", "💬", "🏷️", "📅",
  "💰", "🎬", "📷", "🎧", "🖥️", "📱", "🛠️", "🧠", "🏆", "🎉",
  "🚩", "📦", "🗂️", "🧭", "🔒", "🔑", "❤️", "🌟",
];

export const ICON_COLORS = [
  "#1D66FF", "#7C5CFF", "#0EA5E9", "#17C86A", "#FFB800",
  "#F97316", "#FF3B30", "#EC4899", "#94A3B8",
];

/** Popover de personalização: grade de emojis + (opcional) cores. */
export function IconPicker({
  anchor,
  color,
  withColors,
  onPickEmoji,
  onPickColor,
  onRemove,
  onClose,
}: {
  anchor: { x: number; y: number };
  color?: string;
  withColors?: boolean;
  onPickEmoji: (emoji: string) => void;
  onPickColor?: (color: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    // Timeout evita fechar no mesmo clique que abriu.
    const t = setTimeout(() => window.addEventListener("mousedown", onClick), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
      clearTimeout(t);
    };
  }, [onClose]);

  // Mantém o popover dentro da tela.
  const left = Math.min(anchor.x, (typeof window !== "undefined" ? window.innerWidth : 1000) - 288);
  const top = Math.min(anchor.y, (typeof window !== "undefined" ? window.innerHeight : 800) - 320);

  return (
    <div
      ref={ref}
      style={{ left: Math.max(8, left), top: Math.max(8, top) }}
      className="fixed z-[70] w-[272px] rounded-lg border border-border bg-surface p-2 shadow-xl"
    >
      {withColors && onPickColor && (
        <div className="mb-2 flex flex-wrap gap-1.5 border-b border-border px-1 pb-2">
          {ICON_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onPickColor(c)}
              aria-label={`Cor ${c}`}
              className={cn(
                "size-5 rounded-full border-2 transition-transform hover:scale-110",
                color === c ? "border-foreground" : "border-transparent",
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      )}
      <div className="grid grid-cols-8 gap-0.5">
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onPickEmoji(e)}
            className="flex size-8 items-center justify-center rounded text-lg hover:bg-elevated"
          >
            {e}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="mt-1 flex w-full items-center justify-center gap-1.5 rounded border-t border-border pt-2 text-dense text-subtle hover:text-foreground"
      >
        <X className="size-3.5" /> Remover ícone
      </button>
    </div>
  );
}
