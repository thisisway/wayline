import { Building2, CheckSquare, Layers, Users } from "lucide-react";
import type { PlatformOverview } from "@wayline/db";
import { PLAN_ORDER, PLANS, type PlanId } from "@/lib/plans";

function Kpi({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
        {icon}
      </span>
      <div>
        <p className="font-display text-h2 font-bold tabular-nums leading-none">{value}</p>
        <p className="mt-1 text-dense text-subtle">{label}</p>
      </div>
    </div>
  );
}

export function OverviewPanel({ overview }: { overview: PlatformOverview }) {
  return (
    <div>
      <h2 className="mb-4 font-display text-h2 font-bold">Visão geral</h2>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={<Building2 className="size-5" />} label="Workspaces" value={String(overview.totalOrgs)} />
        <Kpi icon={<Users className="size-5" />} label="Usuários" value={String(overview.totalUsers)} />
        <Kpi icon={<Layers className="size-5" />} label="Membros (soma)" value={String(overview.totalMembers)} />
        <Kpi icon={<CheckSquare className="size-5" />} label="Tarefas" value={String(overview.totalTasks)} />
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <h3 className="mb-3 text-label uppercase text-subtle">Workspaces por plano</h3>
        <div className="flex flex-wrap gap-2">
          {PLAN_ORDER.map((id) => (
            <span
              key={id}
              className="flex items-center gap-1.5 rounded-pill border border-border bg-canvas px-3 py-1 text-dense"
            >
              <span className="font-medium text-foreground">{PLANS[id].name}</span>
              <span className="tabular-nums text-subtle">{overview.byPlan[id] ?? 0}</span>
            </span>
          ))}
          {Object.entries(overview.byPlan)
            .filter(([p]) => !PLAN_ORDER.includes(p as PlanId))
            .map(([p, n]) => (
              <span
                key={p}
                className="flex items-center gap-1.5 rounded-pill border border-dashed border-border bg-canvas px-3 py-1 text-dense"
                title="Plano legado — resolvido como Business"
              >
                <span className="font-medium text-muted">{p}</span>
                <span className="tabular-nums text-subtle">{n}</span>
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}
