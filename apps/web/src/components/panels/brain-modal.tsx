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

/**
 * Wayline Brain: painel de insights de IA da lista atual.
 * Reaproveita `boardInsightsAction`; se a IA estiver desligada, cai num
 * fallback calculado localmente. Aberto pela IconRail / botão do Topbar.
 */
export function BrainModal({
  data,
  listName,
  onClose,
}: {
  data: BoardData | null;
  listName: string;
  onClose: () => void;
}) {
  const [bullets, setBullets] = React.useState<string[] | null>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  React.useEffect(() => {
    if (!data) return;
    let alive = true;
    setBullets(null);
    boardInsightsAction(data.orgId, data.listId).then((b) => alive && setBullets(b));
    return () => {
      alive = false;
    };
  }, [data]);

  const metrics = React.useMemo(() => {
    if (!data) return { total: 0, done: 0, overdue: 0, review: 0, progress: 0 };
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

  const fallback = React.useMemo(() => {
    const b: string[] = [];
    if (metrics.overdue > 0) b.push(`${metrics.overdue} tarefa(s) atrasada(s) exigem atenção.`);
    if (metrics.review > 0) b.push(`${metrics.review} em revisão aguardando aprovação.`);
    b.push(`${metrics.progress}% do board concluído (${metrics.done}/${metrics.total}).`);
    return b;
  }, [metrics]);

  const shown = bullets && bullets.length > 0 ? bullets : fallback;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-dark/60 p-4 pt-24 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md overflow-hidden rounded-xl border border-brand-80 bg-brand text-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-white/15 px-4 py-3.5">
          <span className="flex size-8 items-center justify-center rounded-md bg-white/15">
            <Sparkles className="size-4.5" />
          </span>
          <div className="flex-1">
            <p className="font-display text-ui font-bold">Wayline Brain</p>
            <p className="text-[11px] text-white/70">
              {data ? `${listName} · ${bullets === null ? "gerando…" : "agora"}` : "Nenhum board aberto"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-7 items-center justify-center rounded-md text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        {!data ? (
          <p className="px-4 py-8 text-center text-dense text-white/75">
            Abra um board (lista) para o Brain analisar as tarefas.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-px bg-white/10">
              {[
                { label: "Progresso", value: `${metrics.progress}%` },
                { label: "Em revisão", value: String(metrics.review) },
                { label: "Atrasadas", value: String(metrics.overdue) },
              ].map((m) => (
                <div key={m.label} className="bg-brand px-3 py-3 text-center">
                  <p className="font-display text-h3 font-extrabold leading-none">{m.value}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-white/70">
                    {m.label}
                  </p>
                </div>
              ))}
            </div>

            <ul className="space-y-2.5 px-4 py-4">
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
          </>
        )}
      </div>
    </div>
  );
}
