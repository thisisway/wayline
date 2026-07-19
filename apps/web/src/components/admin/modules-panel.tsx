"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@wayline/ui";
import { MODULES } from "@/lib/modules";
import { setPlatformModulesAction } from "@/actions/admin";

export function ModulesPanel({ enabled }: { enabled: string[] }) {
  const router = useRouter();
  const [active, setActive] = React.useState<string[]>(enabled);
  const [savingId, setSavingId] = React.useState<string | null>(null);

  async function toggle(id: string) {
    const next = active.includes(id) ? active.filter((m) => m !== id) : [...active, id];
    setActive(next);
    setSavingId(id);
    await setPlatformModulesAction(next).catch(() => undefined);
    setSavingId(null);
    router.refresh();
  }

  return (
    <div className="max-w-2xl">
      <h2 className="mb-1 font-display text-h2 font-bold">Módulos</h2>
      <p className="mb-6 text-dense text-muted">
        Ative áreas do sistema. Quando um módulo está desligado, seus recursos ficam ocultos em
        todos os workspaces.
      </p>

      <div className="divide-y divide-border rounded-xl border border-border bg-surface">
        {MODULES.map((m) => {
          const on = active.includes(m.id);
          return (
            <div key={m.id} className="flex items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-ui font-semibold text-foreground">{m.name}</p>
                <p className="text-dense text-subtle">{m.description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                disabled={savingId === m.id}
                onClick={() => toggle(m.id)}
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60",
                  on ? "bg-brand" : "bg-elevated",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
                    on ? "translate-x-[22px]" : "translate-x-0.5",
                  )}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
