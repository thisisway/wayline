"use client";

import * as React from "react";
import type { BoardData, BoardTaskDTO } from "@wayline/db";
import { cn } from "@wayline/ui";
import { useTaskEditor } from "@/lib/use-task-editor";

const DAY_MS = 86_400_000;
const DAY_W = 40; // px por dia
const NAME_W = 240; // largura da coluna de nomes
const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function utcDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Renderizador em GANTT: barras start→due por tarefa, sobre a mesma base. */
export function GanttView({ data }: { data: BoardData }) {
  const editor = useTaskEditor(data);
  const statusColor = new Map(data.columns.map((c) => [c.id, c.color]));

  const tasks = data.columns.flatMap((c) => c.tasks);
  // Datas efetivas: usa start↔due; tarefas sem nenhuma data ficam sem barra.
  const dated = tasks
    .map((t) => {
      const s = t.startDate ? utcDay(new Date(t.startDate)) : null;
      const e = t.dueDate ? utcDay(new Date(t.dueDate)) : null;
      const start = s ?? e;
      const end = e ?? s;
      return { task: t, start, end };
    })
    .filter((x) => x.start !== null && x.end !== null) as {
    task: BoardTaskDTO;
    start: number;
    end: number;
  }[];

  const now = new Date();
  const todayDay = utcDay(now);

  let rangeStart: number;
  let rangeEnd: number;
  if (dated.length === 0) {
    rangeStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
    rangeEnd = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0);
  } else {
    rangeStart = Math.min(...dated.map((d) => Math.min(d.start, d.end)));
    rangeEnd = Math.max(...dated.map((d) => Math.max(d.start, d.end)));
  }
  rangeStart -= 2 * DAY_MS;
  rangeEnd += 3 * DAY_MS;

  const dayCount = Math.max(1, Math.round((rangeEnd - rangeStart) / DAY_MS) + 1);
  const days = Array.from({ length: dayCount }, (_, i) => new Date(rangeStart + i * DAY_MS));
  const trackW = dayCount * DAY_W;
  const idxOf = (day: number) => Math.round((day - rangeStart) / DAY_MS);

  const rows = dated.sort((a, b) => a.start - b.start);
  const undated = tasks.length - dated.length;

  // Geometria das barras (relativa ao track) para desenhar as setas.
  const ROW_H = 40;
  const posById = new Map<string, { row: number; left: number; width: number }>();
  rows.forEach((r, i) => {
    posById.set(r.task.id, {
      row: i,
      left: idxOf(r.start) * DAY_W,
      width: (idxOf(r.end) - idxOf(r.start) + 1) * DAY_W,
    });
  });
  const completedById = new Map(tasks.map((t) => [t.id, t.completed]));
  const edges = data.dependencies
    .map((e) => {
      const a = posById.get(e.blockerId);
      const b = posById.get(e.blockedId);
      if (!a || !b) return null;
      return {
        key: `${e.blockerId}-${e.blockedId}`,
        x1: a.left + 2 + Math.max(DAY_W - 4, a.width - 4),
        y1: a.row * ROW_H + ROW_H / 2,
        x2: b.left + 2,
        y2: b.row * ROW_H + ROW_H / 2,
        active: !completedById.get(e.blockerId),
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div style={{ width: NAME_W + trackW }}>
        {/* Header: coluna de nomes + eixo de dias */}
        <div className="sticky top-0 z-20 flex border-b border-border bg-surface">
          <div
            className="sticky left-0 z-10 shrink-0 border-r border-border bg-surface px-3 py-2 text-label uppercase text-subtle"
            style={{ width: NAME_W }}
          >
            Tarefa
          </div>
          <div className="flex" style={{ width: trackW }}>
            {days.map((d) => {
              const isToday = utcDay(d) === todayDay;
              const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
              return (
                <div
                  key={d.getTime()}
                  className={cn(
                    "shrink-0 border-r border-border/60 py-1 text-center",
                    weekend && "bg-canvas/50",
                  )}
                  style={{ width: DAY_W }}
                >
                  <div className="text-[10px] text-subtle">
                    {d.getUTCDate() === 1 || utcDay(d) === rangeStart + 2 * DAY_MS
                      ? MONTHS[d.getUTCMonth()]
                      : ""}
                  </div>
                  <div
                    className={cn(
                      "mx-auto flex size-5 items-center justify-center rounded-full text-[11px] font-semibold",
                      isToday ? "bg-brand text-white" : "text-muted",
                    )}
                  >
                    {d.getUTCDate()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Linhas (com overlay de setas de dependência) */}
        <div className="relative" style={{ width: NAME_W + trackW }}>
        {rows.map(({ task, start, end }) => {
          const left = idxOf(start) * DAY_W;
          const width = (idxOf(end) - idxOf(start) + 1) * DAY_W;
          const color = statusColor.get(task.statusId ?? "") ?? "#94A3B8";
          return (
            <div key={task.id} className="flex border-b border-border/60 hover:bg-elevated/40">
              <div
                className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r border-border bg-surface px-3 py-2"
                style={{ width: NAME_W }}
              >
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <span className="truncate text-dense text-foreground">{task.title}</span>
              </div>
              <div className="relative" style={{ width: trackW, height: 40 }}>
                <button
                  type="button"
                  onClick={() => editor.openEdit(task)}
                  className="absolute top-1/2 flex h-6 -translate-y-1/2 items-center overflow-hidden rounded-md px-2 text-[11px] font-medium text-white transition-all hover:brightness-110"
                  style={{ left: left + 2, width: Math.max(DAY_W - 4, width - 4), backgroundColor: color }}
                  title={task.title}
                >
                  <span className="truncate">{task.title}</span>
                </button>
              </div>
            </div>
          );
        })}

        {edges.length > 0 && (
          <svg
            className="pointer-events-none absolute top-0"
            style={{ left: NAME_W, width: trackW, height: rows.length * ROW_H }}
            width={trackW}
            height={rows.length * ROW_H}
          >
            {edges.map((e) => {
              const cx = Math.max(24, Math.abs(e.x2 - e.x1) / 2);
              const stroke = e.active ? "#FF3B30" : "#94A3B8";
              return (
                <g key={e.key} opacity={0.85}>
                  <path
                    d={`M ${e.x1} ${e.y1} C ${e.x1 + cx} ${e.y1}, ${e.x2 - cx} ${e.y2}, ${e.x2} ${e.y2}`}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={1.5}
                    strokeDasharray={e.active ? undefined : "4 3"}
                  />
                  <polygon
                    points={`${e.x2 - 6},${e.y2 - 4} ${e.x2},${e.y2} ${e.x2 - 6},${e.y2 + 4}`}
                    fill={stroke}
                  />
                </g>
              );
            })}
          </svg>
        )}
        </div>

        {rows.length === 0 && (
          <p className="px-3 py-6 text-center text-ui text-muted">
            Nenhuma tarefa com datas. Defina início/prazo nas tarefas.
          </p>
        )}
        {undated > 0 && (
          <p
            className="sticky left-0 px-3 py-2 text-[11px] text-subtle"
            style={{ width: NAME_W + trackW }}
          >
            + {undated} tarefa(s) sem datas (não exibidas no Gantt).
          </p>
        )}
      </div>

      {editor.modal}
    </div>
  );
}
