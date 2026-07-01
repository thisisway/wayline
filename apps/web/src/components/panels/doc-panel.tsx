"use client";

import { FileText, Sparkles, X } from "lucide-react";
import { AvatarGroup } from "@wayline/ui";
import { docBrief } from "@/mock/data";

export function DocPanel() {
  return (
    <div className="pointer-events-auto w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-lg animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-3.5 py-3">
        <span className="flex size-7 items-center justify-center rounded-md bg-brand/15 text-brand">
          <FileText className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-dense font-semibold text-foreground">{docBrief.title}</p>
          <p className="truncate text-[11px] text-subtle">
            {docBrief.client.name} · {docBrief.updatedLabel}
          </p>
        </div>
        <AvatarGroup people={docBrief.collaborators} size="xs" max={3} />
        <button
          type="button"
          aria-label="Fechar"
          className="flex size-6 items-center justify-center rounded-md text-subtle hover:bg-elevated hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Corpo do doc */}
      <div className="max-h-72 space-y-3 overflow-y-auto px-3.5 py-3">
        {docBrief.sections.map((s) => (
          <div key={s.heading}>
            <h4 className="mb-1 font-display text-dense font-bold text-foreground">{s.heading}</h4>
            <p className="text-[13px] leading-relaxed text-muted">{s.body}</p>
          </div>
        ))}
      </div>

      {/* Indicador de agente de IA */}
      <div className="flex items-center gap-2 border-t border-border bg-brand/[0.06] px-3.5 py-2.5">
        <span className="relative flex size-6 items-center justify-center rounded-md bg-brand text-white">
          <Sparkles className="size-3.5" />
          <span className="absolute -right-0.5 -top-0.5 size-2 animate-pulse rounded-full bg-success ring-2 ring-surface" />
        </span>
        <div className="flex-1">
          <p className="text-[12px] font-semibold text-foreground">{docBrief.agent.name}</p>
          <p className="text-[11px] text-brand">{docBrief.agent.status}</p>
        </div>
        <span className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1.5 animate-pulse rounded-full bg-brand"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
