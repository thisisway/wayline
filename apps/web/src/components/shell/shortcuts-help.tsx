"use client";

import * as React from "react";
import { X } from "lucide-react";

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: "Navegação",
    items: [
      ["1", "Board"],
      ["2", "List"],
      ["3", "Calendar"],
      ["4", "Gantt"],
      ["5", "Chat"],
    ],
  },
  {
    title: "Ações",
    items: [
      ["N", "Nova tarefa"],
      ["⌘K", "Buscar"],
      ["?", "Esta ajuda"],
      ["Esc", "Fechar"],
    ],
  },
];

export function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/60 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="font-display text-h3 font-bold">Atalhos de teclado</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-7 items-center justify-center rounded-md text-subtle hover:bg-elevated hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-5 p-5">
          {GROUPS.map((g) => (
            <div key={g.title} className="space-y-2">
              <p className="text-label uppercase text-subtle">{g.title}</p>
              {g.items.map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-ui text-muted">{label}</span>
                  <kbd className="rounded border border-border bg-canvas px-1.5 py-0.5 text-[11px] font-semibold text-foreground">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
