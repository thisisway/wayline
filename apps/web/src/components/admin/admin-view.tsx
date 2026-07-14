"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Building2, CheckSquare, Layers, Users } from "lucide-react";
import type { PlatformOverview } from "@wayline/db";
import { cn } from "@wayline/ui";
import { PLAN_ORDER, PLANS, resolvePlan, type PlanId } from "@/lib/plans";
import { setOrgPlanAction } from "@/actions/admin";

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

export function AdminView({
  overview,
  adminEmail,
}: {
  overview: PlatformOverview;
  adminEmail: string;
}) {
  const [orgs, setOrgs] = React.useState(overview.orgs);
  const [savingId, setSavingId] = React.useState<string | null>(null);

  async function changePlan(orgId: string, plan: PlanId) {
    setSavingId(orgId);
    setOrgs((rows) => rows.map((o) => (o.id === orgId ? { ...o, plan } : o)));
    await setOrgPlanAction(orgId, plan).catch(() => undefined);
    setSavingId(null);
  }

  const fmtDate = (d: Date) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="min-h-dvh bg-canvas text-foreground">
      <header className="flex h-14 items-center gap-4 border-b border-border bg-surface px-6">
        <span className="flex size-8 items-center justify-center rounded-lg bg-brand font-display text-h3 font-extrabold text-white">
          W
        </span>
        <div className="flex-1">
          <h1 className="font-display text-ui font-bold leading-none">Admin da Plataforma</h1>
          <p className="text-[11px] text-subtle">{adminEmail}</p>
        </div>
        <Link
          href="/app"
          className="flex items-center gap-1.5 rounded-md border border-border px-3 h-9 text-dense font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Voltar ao app
        </Link>
      </header>

      <main className="mx-auto max-w-6xl p-6">
        {/* KPIs */}
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            icon={<Building2 className="size-5" />}
            label="Workspaces"
            value={String(overview.totalOrgs)}
          />
          <Kpi icon={<Users className="size-5" />} label="Usuários" value={String(overview.totalUsers)} />
          <Kpi
            icon={<Layers className="size-5" />}
            label="Membros (soma)"
            value={String(overview.totalMembers)}
          />
          <Kpi
            icon={<CheckSquare className="size-5" />}
            label="Tarefas"
            value={String(overview.totalTasks)}
          />
        </div>

        {/* Distribuição por plano */}
        <div className="mb-6 flex flex-wrap gap-2">
          {PLAN_ORDER.map((id) => (
            <span
              key={id}
              className="flex items-center gap-1.5 rounded-pill border border-border bg-surface px-3 py-1 text-dense"
            >
              <span className="font-medium text-foreground">{PLANS[id].name}</span>
              <span className="tabular-nums text-subtle">{overview.byPlan[id] ?? 0}</span>
            </span>
          ))}
          {/* Planos legados (não catalogados) */}
          {Object.entries(overview.byPlan)
            .filter(([p]) => !PLAN_ORDER.includes(p as PlanId))
            .map(([p, n]) => (
              <span
                key={p}
                className="flex items-center gap-1.5 rounded-pill border border-dashed border-border bg-surface px-3 py-1 text-dense"
                title="Plano legado — resolvido como Business"
              >
                <span className="font-medium text-muted">{p}</span>
                <span className="tabular-nums text-subtle">{n}</span>
              </span>
            ))}
        </div>

        {/* Tabela de orgs */}
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[720px] text-left text-dense">
            <thead className="border-b border-border text-label uppercase text-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">Workspace</th>
                <th className="px-4 py-3 font-medium">Plano</th>
                <th className="px-4 py-3 font-medium text-right">Membros</th>
                <th className="px-4 py-3 font-medium text-right">Tarefas</th>
                <th className="px-4 py-3 font-medium">Criado</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0 hover:bg-elevated/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{o.name}</p>
                    <p className="text-[11px] text-subtle">{o.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={resolvePlan(o.plan).id}
                      disabled={savingId === o.id}
                      onChange={(e) => changePlan(o.id, e.target.value as PlanId)}
                      className={cn(
                        "h-8 rounded-md border border-border bg-canvas px-2 text-dense text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        savingId === o.id && "opacity-60",
                      )}
                    >
                      {PLAN_ORDER.map((id) => (
                        <option key={id} value={id}>
                          {PLANS[id].name}
                        </option>
                      ))}
                    </select>
                    {!PLAN_ORDER.includes(o.plan as PlanId) && (
                      <span className="ml-2 text-[11px] text-subtle">(era “{o.plan}”)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">{o.members}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">{o.tasks}</td>
                  <td className="px-4 py-3 text-muted">{fmtDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-[11px] text-subtle">
          Acesso restrito a superadmins (env <code>PLATFORM_ADMIN_EMAILS</code>). Alterar o plano
          aqui vale imediatamente — a cobrança recorrente será plugada na fase de pagamento.
        </p>
      </main>
    </div>
  );
}
