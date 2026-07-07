"use client";

import * as React from "react";
import { Sparkles, TrendingUp, X } from "lucide-react";
import type { BoardData } from "@wayline/db";
import { boardInsightsAction } from "@/actions/ai";

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function ExecutiveSummaryPanel({ data }: { data: BoardData }) {
  const [open, setOpen] = React.useState(true);
  const [bullets, setBullets] = React.useState<string[] | null>(null);

  const metrics = React.useMemo(() => {
    const tasks = data.columns.flatMap((c) => c.tasks);
    const total = tasks.length;
    const done = tasks.filter((t) => t.completed).length;
    const today = startOfToday();
    const overdue = tasks.filter(
      (t) => t.dueDate && !t.completed && new Date(t.dueDate).getTime() < today,
    ).length;
    const review = data.columns
      .filter((c) => /review|revis/i.test(c.name))
      .reduce((n, c) => n + c.tasks.length, 0);
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, overdue, review, progress };
  }, [data]);

  React.useEffect(() => {
    let alive = true;
    setBullets(null);
    boardInsightsAction(data.orgId, data.listId).then((b) => alive && setBullets(b));
    return () => {
      alive = false;
    };
  }, [data.orgId, data.listId]);

  // Fallback (IA desligada/sem retorno): insights simples calculados.
  const fallback = React.useMemo(() => {
    const b: string[] = [];
    if (metrics.overdue > 0) b.push(`${metrics.overdue} tarefa(s) atrasada(s) exigem atenção.`);
    if (metrics.review > 0) b.push(`${metrics.review} em revisão aguardando aprovação.`);
    b.push(`${metrics.progress}% do board concluído (${metrics.done}/${metrics.total}).`);
    return b;
  }, [metrics]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-dense font-medium text-white shadow-lg transition-colors hover:bg-brand-80"
      >
        <Sparkles className="size-3.5" /> Resumo
      </button>
    );
  }
  const shown = bullets && bullets.length > 0 ? bullets : fallback;

  return (
    <div className="pointer-events-auto w-80 overflow-hidden rounded-xl border border-brand-80 bg-brand text-white shadow-xl animate-fade-in">
      <div className="flex items-center gap-2 border-b border-white/15 px-3.5 py-3">
        <span className="flex size-7 items-center justify-center rounded-md bg-white/15">
          <Sparkles className="size-4" />
        </span>
        <div className="flex-1">
          <p className="text-dense font-bold">Executive Summary</p>
          <p className="text-[11px] text-white/70">
            Wayline Brain · {bullets === null ? "gerando…" : "agora"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Fechar"
          className="flex size-6 items-center justify-center rounded-md text-white/60 hover:bg-white/10 hover:text-white"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-px bg-white/10">
        {[
          { label: "Progresso", value: `${metrics.progress}%` },
          { label: "Em revisão", value: String(metrics.review) },
          { label: "Atrasadas", value: String(metrics.overdue) },
        ].map((m) => (
          <div key={m.label} className="bg-brand px-3 py-2.5 text-center">
            <p className="font-display text-h3 font-extrabold leading-none">{m.value}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-white/70">{m.label}</p>
          </div>
        ))}
      </div>

      <ul className="space-y-2.5 px-3.5 py-3">
        {bullets === null ? (
          <li className="text-[13px] text-white/70">Analisando o board…</li>
        ) : (
          shown.map((b, i) => (
            <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-white/90">
              <TrendingUp className="mt-0.5 size-3.5 shrink-0 text-white/70" />
              <span>{b}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
