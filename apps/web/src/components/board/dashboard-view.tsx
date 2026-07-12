"use client";

import * as React from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ListTodo,
  UserX,
} from "lucide-react";
import type { OrgDashboard } from "@wayline/db";
import { Avatar, cn } from "@wayline/ui";
import { orgDashboardAction } from "@/actions/reports";

const PRIORITY_META: { key: keyof OrgDashboard["byPriority"]; label: string; color: string }[] = [
  { key: "urgent", label: "Urgente", color: "#FF3B30" },
  { key: "high", label: "Alta", color: "#FFB800" },
  { key: "normal", label: "Normal", color: "#1D66FF" },
  { key: "low", label: "Baixa", color: "#94A3B8" },
];

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${accent ?? "#1D66FF"}1a`, color: accent ?? "#1D66FF" }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="font-display text-h2 font-bold tabular-nums leading-none">{value}</p>
        <p className="mt-1 text-dense text-subtle">{label}</p>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-3 text-label uppercase text-subtle">{title}</h3>
      {children}
    </div>
  );
}

export function DashboardView({ orgId }: { orgId: string }) {
  const [data, setData] = React.useState<OrgDashboard | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    orgDashboardAction(orgId).then((d) => {
      if (!alive) return;
      setData(d);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [orgId]);

  if (loading && !data) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-ui text-subtle">
        Montando o dashboard…
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-ui text-subtle">
        Não foi possível carregar o dashboard.
      </div>
    );
  }

  const totalTasks = data.openTasks + data.completedTasks;
  const completionPct = totalTasks > 0 ? Math.round((data.completedTasks / totalTasks) * 100) : 0;
  const maxLoad = Math.max(1, ...data.memberLoad.map((m) => m.open));
  const priorityTotal =
    data.byPriority.urgent + data.byPriority.high + data.byPriority.normal + data.byPriority.low;

  return (
    <div className="min-h-0 flex-1 overflow-auto p-5">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={<ListTodo className="size-5" />}
            label="Tarefas abertas"
            value={String(data.openTasks)}
          />
          <StatCard
            icon={<CheckCircle2 className="size-5" />}
            label={`Concluídas (${completionPct}%)`}
            value={String(data.completedTasks)}
            accent="#17C86A"
          />
          <StatCard
            icon={<AlertTriangle className="size-5" />}
            label="Atrasadas"
            value={String(data.overdueTasks)}
            accent={data.overdueTasks > 0 ? "#FF3B30" : "#94A3B8"}
          />
          <StatCard
            icon={<CalendarClock className="size-5" />}
            label="Vencem em 7 dias"
            value={String(data.dueSoon)}
            accent={data.dueSoon > 0 ? "#FFB800" : "#94A3B8"}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {/* Carga do time */}
          <Card title="Carga por responsável">
            {data.memberLoad.length === 0 ? (
              <p className="py-6 text-center text-dense text-subtle">
                Nenhuma tarefa aberta atribuída.
              </p>
            ) : (
              <div className="space-y-3">
                {data.memberLoad.map((m) => (
                  <div key={m.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-dense">
                      <span className="flex min-w-0 items-center gap-2">
                        <Avatar name={m.name} size="xs" />
                        <span className="truncate text-foreground">{m.name}</span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums text-muted">
                        {m.open} aberta{m.open === 1 ? "" : "s"}
                        {m.overdue > 0 && (
                          <span className="ml-1.5 rounded-pill bg-danger/10 px-1.5 text-[10px] font-semibold text-danger">
                            {m.overdue} atrasada{m.overdue === 1 ? "" : "s"}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-pill bg-elevated">
                      <div
                        className="h-full rounded-pill bg-brand transition-all"
                        style={{ width: `${(m.open / maxLoad) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                {data.unassignedOpen > 0 && (
                  <div className="flex items-center gap-2 border-t border-border pt-3 text-dense text-subtle">
                    <UserX className="size-3.5" />
                    <span>
                      <strong className="text-foreground">{data.unassignedOpen}</strong> aberta
                      {data.unassignedOpen === 1 ? "" : "s"} sem responsável
                    </span>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Progresso por cliente */}
          <Card title="Progresso por cliente">
            {data.clientProgress.length === 0 ? (
              <p className="py-6 text-center text-dense text-subtle">Sem tarefas ainda.</p>
            ) : (
              <div className="space-y-3">
                {data.clientProgress.map((c) => {
                  const pct = c.total > 0 ? Math.round((c.done / c.total) * 100) : 0;
                  return (
                    <div key={c.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-dense">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: c.color ?? "#94A3B8" }}
                          />
                          <span className="truncate text-foreground">{c.name}</span>
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums text-muted">
                          {c.done}/{c.total}
                          <span className="ml-1 text-subtle">({pct}%)</span>
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-pill bg-elevated">
                        <div
                          className="h-full rounded-pill bg-success transition-all"
                          style={{ width: `${pct}%`, backgroundColor: c.color ?? "#17C86A" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Abertas por prioridade */}
        <div className="mt-3">
          <Card title="Abertas por prioridade">
            {priorityTotal === 0 ? (
              <p className="py-6 text-center text-dense text-subtle">
                Nenhuma tarefa aberta no momento.
              </p>
            ) : (
              <>
                <div className="flex h-3 overflow-hidden rounded-pill bg-elevated">
                  {PRIORITY_META.map((p) => {
                    const n = data.byPriority[p.key];
                    if (n === 0) return null;
                    return (
                      <div
                        key={p.key}
                        title={`${p.label}: ${n}`}
                        style={{ width: `${(n / priorityTotal) * 100}%`, backgroundColor: p.color }}
                      />
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                  {PRIORITY_META.map((p) => (
                    <span key={p.key} className="flex items-center gap-1.5 text-dense">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="text-muted">{p.label}</span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {data.byPriority[p.key]}
                      </span>
                    </span>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>

        <p className={cn("mt-5 text-center text-[11px] text-subtle", loading && "opacity-60")}>
          Agregados de todas as listas da organização.
        </p>
      </div>
    </div>
  );
}
