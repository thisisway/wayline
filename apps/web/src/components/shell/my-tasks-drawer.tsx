"use client";

import * as React from "react";
import { CalendarDays, ListChecks, X } from "lucide-react";
import type { MyTask } from "@wayline/db";
import { cn } from "@wayline/ui";
import { switchList } from "@/actions/org";

const PRIO_COLOR: Record<MyTask["priority"], string> = {
  urgent: "#FF3B30",
  high: "#FFB800",
  normal: "#1D66FF",
  low: "#94A3B8",
};
const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function dueLabel(due: Date | null): { text: string; overdue: boolean } | null {
  if (!due) return null;
  const d = new Date(due);
  const today = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
  const target = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const diff = Math.round((target - today) / 86_400_000);
  const overdue = diff < 0;
  if (diff === 0) return { text: "Hoje", overdue };
  if (diff === 1) return { text: "Amanhã", overdue };
  return { text: `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`, overdue };
}

export function MyTasksDrawer({ myTasks, onClose }: { myTasks: MyTask[]; onClose: () => void }) {
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function goToTask(t: MyTask) {
    startTransition(() => {
      void switchList(t.listId);
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-dark/50 animate-fade-in" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2">
            <ListChecks className="size-5 text-brand" />
            <h2 className="font-display text-h3 font-bold">My Tasks</h2>
            <span className="text-dense font-semibold text-muted">{myTasks.length}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-7 items-center justify-center rounded-md text-subtle hover:bg-elevated hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {myTasks.length === 0 ? (
            <p className="p-4 text-center text-ui text-muted">Nenhuma tarefa atribuída a você.</p>
          ) : (
            myTasks.map((t) => {
              const due = dueLabel(t.dueDate);
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={pending}
                  onClick={() => goToTask(t)}
                  className="flex w-full flex-col gap-1.5 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-elevated"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: PRIO_COLOR[t.priority] }}
                    />
                    <span className="min-w-0 flex-1 truncate text-ui font-medium text-foreground">
                      {t.title}
                    </span>
                    {due && (
                      <span
                        className={cn(
                          "flex shrink-0 items-center gap-1 text-[11px]",
                          due.overdue ? "font-semibold text-danger" : "text-muted",
                        )}
                      >
                        <CalendarDays className="size-3.5" />
                        {due.text}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pl-4 text-[11px] text-subtle">
                    <span className="truncate">{t.listName}</span>
                    {t.statusName && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <span
                            className="size-1.5 rounded-full"
                            style={{ backgroundColor: t.statusColor ?? "#94A3B8" }}
                          />
                          {t.statusName}
                        </span>
                      </>
                    )}
                    {t.clientName && (
                      <>
                        <span>·</span>
                        <span className="truncate">{t.clientName}</span>
                      </>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}
