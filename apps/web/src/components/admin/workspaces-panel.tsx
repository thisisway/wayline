"use client";

import * as React from "react";
import type { AdminOrgRow } from "@wayline/db";
import { cn } from "@wayline/ui";
import { PLAN_ORDER, PLANS, resolvePlan, trialActive, trialDaysLeft, type PlanId } from "@/lib/plans";
import { setOrgPlanAction, setOrgTrialAction } from "@/actions/admin";

export function WorkspacesPanel({ orgs: initial }: { orgs: AdminOrgRow[] }) {
  const [orgs, setOrgs] = React.useState(initial);
  const [savingId, setSavingId] = React.useState<string | null>(null);

  async function changePlan(orgId: string, plan: PlanId) {
    setSavingId(orgId);
    setOrgs((rows) => rows.map((o) => (o.id === orgId ? { ...o, plan } : o)));
    await setOrgPlanAction(orgId, plan).catch(() => undefined);
    setSavingId(null);
  }

  async function changeTrial(orgId: string, days: number | null) {
    setSavingId(orgId);
    const iso = await setOrgTrialAction(orgId, days).catch(() => undefined);
    const ends = iso ? new Date(iso) : null;
    setOrgs((rows) => rows.map((o) => (o.id === orgId ? { ...o, trialEndsAt: ends } : o)));
    setSavingId(null);
  }

  const fmtDate = (d: Date) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div>
      <h2 className="mb-4 font-display text-h2 font-bold">Workspaces</h2>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[720px] text-left text-dense">
          <thead className="border-b border-border text-label uppercase text-subtle">
            <tr>
              <th className="px-4 py-3 font-medium">Workspace</th>
              <th className="px-4 py-3 font-medium">Plano</th>
              <th className="px-4 py-3 font-medium">Trial</th>
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
                <td className="px-4 py-3">
                  {trialActive(o.trialEndsAt) ? (
                    <span className="flex items-center gap-2">
                      <span className="rounded-pill bg-brand/15 px-2 py-0.5 text-[11px] font-semibold text-brand">
                        {trialDaysLeft(o.trialEndsAt)}d
                      </span>
                      <button
                        type="button"
                        disabled={savingId === o.id}
                        onClick={() => changeTrial(o.id, null)}
                        className="text-[11px] font-medium text-subtle hover:text-danger disabled:opacity-50"
                      >
                        encerrar
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={savingId === o.id}
                      onClick={() => changeTrial(o.id, 14)}
                      className="rounded-md border border-border px-2 py-0.5 text-[11px] font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground disabled:opacity-50"
                    >
                      + 14 dias
                    </button>
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
        Alterar o plano aqui vale imediatamente. Com o billing ativo, o plano é atualizado
        automaticamente pelos webhooks de pagamento.
      </p>
    </div>
  );
}
