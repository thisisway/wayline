"use client";

import * as React from "react";
import { Check, Rocket, X, type LucideIcon } from "lucide-react";
import { cn } from "@wayline/ui";

export interface OnboardStep {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Já concluído por sinal real (ex.: já tem tarefas). */
  done?: boolean;
  onClick: () => void;
}

interface Stored {
  done: string[];
  dismissed: boolean;
}

function read(orgId: string): Stored {
  try {
    const raw = localStorage.getItem(`wl_onboard_${orgId}`);
    if (raw) return JSON.parse(raw) as Stored;
  } catch {
    /* ignora */
  }
  return { done: [], dismissed: false };
}

function write(orgId: string, s: Stored) {
  try {
    localStorage.setItem(`wl_onboard_${orgId}`, JSON.stringify(s));
  } catch {
    /* ignora */
  }
}

/** Painel de primeiros passos (onboarding). Some quando dispensado ou concluído. */
export function WelcomeChecklist({ orgId, steps }: { orgId: string; steps: OnboardStep[] }) {
  const [state, setState] = React.useState<Stored | null>(null);

  React.useEffect(() => {
    setState(read(orgId));
  }, [orgId]);

  if (!state || state.dismissed) return null;

  const isDone = (s: OnboardStep) => s.done || state.done.includes(s.id);
  const doneCount = steps.filter(isDone).length;
  if (doneCount >= steps.length) return null; // tudo pronto → some

  function mark(id: string) {
    setState((prev) => {
      const next = { ...(prev ?? { done: [], dismissed: false }) };
      if (!next.done.includes(id)) next.done = [...next.done, id];
      write(orgId, next);
      return next;
    });
  }

  function dismiss() {
    setState((prev) => {
      const next = { ...(prev ?? { done: [], dismissed: false }), dismissed: true };
      write(orgId, next);
      return next;
    });
  }

  return (
    <div className="shrink-0 border-b border-border bg-surface px-4 py-3">
      <div className="mx-auto flex max-w-5xl items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Rocket className="size-4" />
          </span>
          <div className="leading-tight">
            <p className="text-dense font-semibold text-foreground">Primeiros passos</p>
            <p className="text-[11px] text-subtle">
              {doneCount}/{steps.length} concluídos
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-2">
          {steps.map((s) => {
            const done = isDone(s);
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  mark(s.id);
                  s.onClick();
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 h-8 text-dense font-medium transition-colors",
                  done
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-border text-muted hover:bg-elevated hover:text-foreground",
                )}
              >
                {done ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
                {s.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dispensar"
          title="Dispensar"
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-subtle hover:bg-elevated hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
