"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Clock, ListTodo } from "lucide-react";
import type { OrgReport, ReportRow } from "@wayline/db";
import { cn } from "@wayline/ui";
import { orgReportAction } from "@/actions/reports";
import { fmtDuration } from "@/components/board/time-tracking-section";

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

function BarList({
  title,
  rows,
  emptyLabel,
}: {
  title: string;
  rows: ReportRow[];
  emptyLabel: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.seconds));
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-3 text-label uppercase text-subtle">{title}</h3>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-dense text-subtle">{emptyLabel}</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r) => (
            <div key={r.id} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-dense">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: r.color ?? "#94A3B8" }}
                  />
                  <span className="truncate text-foreground">{r.name}</span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-muted">
                  {fmtDuration(r.seconds)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-pill bg-elevated">
                <div
                  className="h-full rounded-pill"
                  style={{
                    width: `${(r.seconds / max) * 100}%`,
                    backgroundColor: r.color ?? "#1D66FF",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReportsView({ orgId }: { orgId: string }) {
  const [report, setReport] = React.useState<OrgReport | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    orgReportAction(orgId).then((r) => {
      if (!alive) return;
      setReport(r);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [orgId]);

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-ui text-subtle">
        Calculando relatórios…
      </div>
    );
  }
  if (!report) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-ui text-subtle">
        Não foi possível carregar os relatórios.
      </div>
    );
  }

  const completionPct =
    report.totalTasks > 0 ? Math.round((report.completedTasks / report.totalTasks) * 100) : 0;

  return (
    <div className="min-h-0 flex-1 overflow-auto p-5">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={<Clock className="size-5" />}
            label="Tempo rastreado"
            value={report.trackedSeconds >= 60 ? fmtDuration(report.trackedSeconds) : "—"}
          />
          <StatCard
            icon={<ListTodo className="size-5" />}
            label="Tarefas"
            value={String(report.totalTasks)}
          />
          <StatCard
            icon={<CheckCircle2 className="size-5" />}
            label={`Concluídas (${completionPct}%)`}
            value={String(report.completedTasks)}
            accent="#17C86A"
          />
          <StatCard
            icon={<AlertTriangle className="size-5" />}
            label="Atrasadas"
            value={String(report.overdueTasks)}
            accent={report.overdueTasks > 0 ? "#FF3B30" : "#94A3B8"}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <BarList
            title="Horas por cliente"
            rows={report.hoursByClient}
            emptyLabel="Sem tempo rastreado ainda."
          />
          <BarList
            title="Horas por responsável"
            rows={report.hoursByMember}
            emptyLabel="Sem tempo rastreado ainda."
          />
        </div>

        <p className={cn("text-center text-[11px] text-subtle")}>
          Agregados de toda a organização · atualizados ao abrir a aba.
        </p>
      </div>
    </div>
  );
}
