"use client";

import { Sparkles, TrendingUp, X } from "lucide-react";
import { executiveSummary } from "@/mock/data";

export function ExecutiveSummaryPanel() {
  return (
    <div className="pointer-events-auto w-80 overflow-hidden rounded-xl border border-brand-80 bg-brand text-white shadow-xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-white/15 px-3.5 py-3">
        <span className="flex size-7 items-center justify-center rounded-md bg-white/15">
          <Sparkles className="size-4" />
        </span>
        <div className="flex-1">
          <p className="text-dense font-bold">{executiveSummary.title}</p>
          <p className="text-[11px] text-white/70">
            {executiveSummary.generatedBy} · {executiveSummary.updatedLabel}
          </p>
        </div>
        <button
          type="button"
          aria-label="Fechar"
          className="flex size-6 items-center justify-center rounded-md text-white/60 hover:bg-white/10 hover:text-white"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-px bg-white/10">
        {executiveSummary.metrics.map((m) => (
          <div key={m.label} className="bg-brand px-3 py-2.5 text-center">
            <p className="font-display text-h3 font-extrabold leading-none">{m.value}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-white/70">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Bullets */}
      <ul className="space-y-2.5 px-3.5 py-3">
        {executiveSummary.bullets.map((b, i) => (
          <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-white/90">
            <TrendingUp className="mt-0.5 size-3.5 shrink-0 text-white/70" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
