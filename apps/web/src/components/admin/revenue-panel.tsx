import { DollarSign, TrendingUp, Users } from "lucide-react";
import type { AdminOrgRow } from "@wayline/db";
import { PLAN_ORDER, PLANS, resolvePlan } from "@/lib/plans";

const brl = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;

function Kpi({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <span className="mb-2 flex size-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
        {icon}
      </span>
      <p className="font-display text-h2 font-bold tabular-nums leading-none">{value}</p>
      <p className="mt-1 text-dense text-subtle">{label}</p>
      {hint && <p className="mt-0.5 text-[11px] text-subtle">{hint}</p>}
    </div>
  );
}

/**
 * Receita ESTIMADA: preço de lista mensal do plano × assentos (membros).
 * É uma estimativa — o valor real virá da persistência de assinaturas quando o
 * billing estiver plugado (ciclo anual, descontos, inadimplência etc.).
 */
export function RevenuePanel({ orgs }: { orgs: AdminOrgRow[] }) {
  const rows = orgs
    .map((o) => {
      const plan = resolvePlan(o.plan);
      const price = plan.priceBRL ?? 0;
      return {
        ...o,
        planId: plan.id,
        planName: plan.name,
        monthly: price * o.members,
        paying: price > 0,
      };
    })
    .sort((a, b) => b.monthly - a.monthly);

  const mrr = rows.reduce((s, r) => s + r.monthly, 0);
  const paying = rows.filter((r) => r.paying);
  const arpa = paying.length ? mrr / paying.length : 0;

  const byPlan = PLAN_ORDER.map((id) => {
    const list = rows.filter((r) => r.planId === id);
    return {
      id,
      name: PLANS[id].name,
      count: list.length,
      mrr: list.reduce((s, r) => s + r.monthly, 0),
    };
  }).filter((p) => p.count > 0);
  const maxPlanMrr = Math.max(1, ...byPlan.map((p) => p.mrr));

  return (
    <div>
      <h2 className="mb-1 font-display text-h2 font-bold">Receita</h2>
      <p className="mb-5 text-dense text-muted">
        Estimativa mensal (MRR) por preço de lista × assentos. Valores reais chegam com a
        persistência de assinaturas.
      </p>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi
          icon={<TrendingUp className="size-5" />}
          label="MRR estimada"
          value={brl(mrr)}
          hint="receita recorrente mensal"
        />
        <Kpi
          icon={<Users className="size-5" />}
          label="Contas pagantes"
          value={String(paying.length)}
          hint={`de ${rows.length} workspaces`}
        />
        <Kpi
          icon={<DollarSign className="size-5" />}
          label="ARPA"
          value={brl(arpa)}
          hint="receita média por conta paga"
        />
      </div>

      {/* Receita por plano */}
      <div className="mb-6 rounded-xl border border-border bg-surface p-5">
        <h3 className="mb-3 text-label uppercase text-subtle">Receita por plano</h3>
        {byPlan.length === 0 ? (
          <p className="text-dense text-subtle">Sem receita ainda.</p>
        ) : (
          <div className="space-y-2.5">
            {byPlan.map((p) => (
              <div key={p.id} className="space-y-1">
                <div className="flex items-center justify-between text-dense">
                  <span className="text-foreground">
                    {p.name} <span className="text-subtle">· {p.count}</span>
                  </span>
                  <span className="font-semibold tabular-nums text-muted">{brl(p.mrr)}/mês</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-pill bg-elevated">
                  <div
                    className="h-full rounded-pill bg-brand"
                    style={{ width: `${(p.mrr / maxPlanMrr) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workspaces pagantes */}
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[560px] text-left text-dense">
          <thead className="border-b border-border text-label uppercase text-subtle">
            <tr>
              <th className="px-4 py-3 font-medium">Workspace pagante</th>
              <th className="px-4 py-3 font-medium">Plano</th>
              <th className="px-4 py-3 font-medium text-right">Assentos</th>
              <th className="px-4 py-3 font-medium text-right">R$/mês</th>
            </tr>
          </thead>
          <tbody>
            {paying.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-subtle">
                  Nenhuma conta pagante ainda.
                </td>
              </tr>
            ) : (
              paying.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-elevated/50">
                  <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                  <td className="px-4 py-3 text-muted">{r.planName}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">{r.members}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                    {brl(r.monthly)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
