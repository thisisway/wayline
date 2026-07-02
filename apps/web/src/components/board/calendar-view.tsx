"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BoardData, BoardTaskDTO } from "@wayline/db";
import { cn } from "@wayline/ui";
import { useTaskEditor } from "@/lib/use-task-editor";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DAY_MS = 86_400_000;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function keyOf(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Renderizador em CALENDÁRIO: tarefas posicionadas pelo prazo (due_date). */
export function CalendarView({ data }: { data: BoardData }) {
  const editor = useTaskEditor(data);
  const now = new Date();
  const [cursor, setCursor] = React.useState({
    year: now.getUTCFullYear(),
    month: now.getUTCMonth(),
  });

  const statusColor = React.useMemo(
    () => new Map(data.columns.map((c) => [c.id, c.color])),
    [data.columns],
  );

  const byDay = React.useMemo(() => {
    const map = new Map<string, BoardTaskDTO[]>();
    for (const col of data.columns) {
      for (const t of col.tasks) {
        if (!t.dueDate) continue;
        const k = keyOf(new Date(t.dueDate));
        const arr = map.get(k);
        if (arr) arr.push(t);
        else map.set(k, [t]);
      }
    }
    return map;
  }, [data.columns]);

  const todayKey = keyOf(now);
  const firstColumnId = data.columns[0]?.id ?? "";

  // 42 dias começando no domingo da semana do dia 1.
  const gridStart = React.useMemo(() => {
    const first = new Date(Date.UTC(cursor.year, cursor.month, 1));
    return Date.UTC(cursor.year, cursor.month, 1 - first.getUTCDay());
  }, [cursor]);

  const days = Array.from({ length: 42 }, (_, i) => new Date(gridStart + i * DAY_MS));

  function shift(delta: number) {
    setCursor((c) => {
      const m = c.month + delta;
      return { year: c.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });
  }
  function goToday() {
    setCursor({ year: now.getUTCFullYear(), month: now.getUTCMonth() });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col p-4">
      <div className="mb-3 flex items-center gap-3">
        <h2 className="font-display text-h3 font-bold">
          {MONTHS[cursor.month]} {cursor.year}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Mês anterior"
            className="flex size-7 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="rounded-md px-2.5 h-7 text-dense font-medium text-muted hover:bg-elevated hover:text-foreground"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Próximo mês"
            className="flex size-7 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map((w) => (
          <div key={w} className="px-2 py-1.5 text-label uppercase text-subtle">
            {w}
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 overflow-y-auto rounded-b-lg border-x border-b border-border">
        {days.map((d) => {
          const k = keyOf(d);
          const tasks = byDay.get(k) ?? [];
          const inMonth = d.getUTCMonth() === cursor.month;
          const isToday = k === todayKey;
          return (
            <button
              key={k}
              type="button"
              onClick={() => firstColumnId && editor.openCreate(firstColumnId, k)}
              className={cn(
                "flex min-h-24 flex-col gap-1 border-b border-r border-border p-1.5 text-left transition-colors hover:bg-elevated/60",
                !inMonth && "bg-canvas/40",
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-dense font-semibold",
                  isToday ? "bg-brand text-white" : inMonth ? "text-foreground" : "text-subtle",
                )}
              >
                {d.getUTCDate()}
              </span>
              <div className="flex flex-col gap-1">
                {tasks.slice(0, 3).map((t) => (
                  <span
                    key={t.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      editor.openEdit(t);
                    }}
                    className="truncate rounded px-1.5 py-0.5 text-[11px] font-medium text-foreground hover:brightness-110"
                    style={{
                      backgroundColor: `${statusColor.get(t.statusId ?? "") ?? "#94A3B8"}26`,
                      borderLeft: `2px solid ${statusColor.get(t.statusId ?? "") ?? "#94A3B8"}`,
                    }}
                    title={t.title}
                  >
                    {t.title}
                  </span>
                ))}
                {tasks.length > 3 && (
                  <span className="px-1.5 text-[11px] text-muted">+{tasks.length - 3} mais</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {editor.modal}
    </div>
  );
}
