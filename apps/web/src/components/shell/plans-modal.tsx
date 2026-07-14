"use client";

import * as React from "react";
import { Check, CreditCard, QrCode, Sparkles, X } from "lucide-react";
import { Badge, cn } from "@wayline/ui";
import {
  PLANS,
  PLAN_ORDER,
  formatPrice,
  resolvePlan,
  type PlanId,
} from "@/lib/plans";
import {
  billingProvidersAction,
  startCheckoutAction,
  type CheckoutResult,
} from "@/actions/billing";
import type { BillingProvider, PaidPlan } from "@/lib/billing/types";

/** Email de vendas para o CTA do Enterprise. */
const SALES_EMAIL = "suporte@waycloud.com.br";

const PROVIDER_META: Record<BillingProvider, { label: string; icon: React.ReactNode }> = {
  stripe: { label: "Cartão (Stripe)", icon: <CreditCard className="size-4" /> },
  iugu: { label: "Pix / Boleto / Cartão (Iugu)", icon: <QrCode className="size-4" /> },
};

export function PlansModal({
  orgId,
  currentPlan,
  onClose,
}: {
  orgId: string;
  /** Valor bruto de organizations.plan (pode ser legado). */
  currentPlan: string;
  onClose: () => void;
}) {
  const active = resolvePlan(currentPlan);
  const [providers, setProviders] = React.useState<BillingProvider[]>([]);
  const [choosing, setChoosing] = React.useState<PaidPlan | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    billingProvidersAction().then(setProviders);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function mailTo(subject: string) {
    window.location.href = `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(subject)}`;
  }

  async function checkout(plan: PaidPlan, provider: BillingProvider) {
    setBusy(true);
    setErr(null);
    const res: CheckoutResult = await startCheckoutAction(orgId, plan, provider).catch(() => ({
      status: "error" as const,
    }));
    if (res.status === "ok") {
      window.location.href = res.url;
      return;
    }
    setBusy(false);
    setErr(
      res.status === "forbidden"
        ? "Sem permissão para assinar (peça a um admin)."
        : res.status === "disabled"
          ? "Pagamento indisponível — falando com o time."
          : "Não foi possível iniciar o checkout. Tente novamente.",
    );
    if (res.status === "disabled") mailTo(`Quero assinar o plano ${PLANS[plan].name}`);
  }

  function cta(id: PlanId) {
    if (id === active.id) return;
    if (id === "enterprise") {
      mailTo("Wayline Enterprise — quero falar com vendas");
      return;
    }
    const plan = id as PaidPlan;
    if (providers.length === 0) {
      mailTo(`Quero assinar o plano ${PLANS[id].name}`);
    } else if (providers.length === 1) {
      void checkout(plan, providers[0]!);
    } else {
      setChoosing(plan);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/60 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="font-display text-h2 font-bold">Planos</h2>
            <p className="text-dense text-muted">
              Preços por usuário/mês, em reais. Plano atual:{" "}
              <strong className="text-foreground">{active.name}</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-8 items-center justify-center rounded-md text-subtle hover:bg-elevated hover:text-foreground"
          >
            <X className="size-4.5" />
          </button>
        </div>

        <div className="grid flex-1 gap-4 overflow-y-auto p-6 md:grid-cols-2 xl:grid-cols-4">
          {PLAN_ORDER.map((id) => {
            const plan = PLANS[id];
            const isCurrent = id === active.id;
            return (
              <div
                key={id}
                className={cn(
                  "flex flex-col rounded-xl border p-5",
                  plan.highlight
                    ? "border-brand bg-brand/5 shadow-sm"
                    : "border-border bg-canvas",
                )}
              >
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="font-display text-h3 font-bold">{plan.name}</h3>
                  {plan.highlight && (
                    <Badge variant="brand" size="sm">
                      Popular
                    </Badge>
                  )}
                </div>

                <div className="mb-1 flex items-baseline gap-1">
                  <span className="font-display text-h1 font-extrabold tabular-nums">
                    {formatPrice(plan.priceBRL)}
                  </span>
                  {plan.priceBRL != null && plan.priceBRL > 0 && (
                    <span className="text-dense text-subtle">/usuário/mês</span>
                  )}
                </div>
                <p className="mb-4 min-h-8 text-dense text-muted">{plan.tagline}</p>

                <button
                  type="button"
                  disabled={isCurrent}
                  onClick={() => cta(id)}
                  className={cn(
                    "mb-4 flex h-9 items-center justify-center gap-1.5 rounded-md px-3 text-ui font-medium transition-colors",
                    isCurrent
                      ? "cursor-default border border-border bg-elevated text-muted"
                      : plan.highlight
                        ? "bg-brand text-white hover:bg-brand-80"
                        : "border border-border text-foreground hover:bg-elevated",
                  )}
                >
                  {isCurrent ? (
                    "Plano atual"
                  ) : (
                    <>
                      {plan.highlight && <Sparkles className="size-4" />}
                      {plan.cta}
                    </>
                  )}
                </button>

                <ul className="space-y-2">
                  {plan.features.map((f, i) => {
                    const isHeading = i === 0 && /mais:$/.test(f);
                    if (isHeading) {
                      return (
                        <li key={i} className="pt-1 text-label uppercase text-subtle">
                          {f}
                        </li>
                      );
                    }
                    return (
                      <li key={i} className="flex gap-2 text-dense text-foreground">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                        <span>{f}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="border-t border-border px-6 py-3 text-center text-[11px] text-subtle">
          {providers.length > 0
            ? "Cobrança mensal por usuário. Você escolhe o meio de pagamento no checkout."
            : "Cobrança em breve — os CTAs abrem contato até os provedores serem configurados."}
        </p>

        {/* Escolha de provedor (quando há mais de um) */}
        {choosing && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-dark/50 p-4"
            onClick={() => !busy && setChoosing(null)}
          >
            <div
              className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="mb-1 font-display text-h3 font-bold">
                Assinar {PLANS[choosing].name}
              </h3>
              <p className="mb-4 text-dense text-muted">Escolha o meio de pagamento:</p>
              <div className="space-y-2">
                {providers.map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={busy}
                    onClick={() => checkout(choosing, p)}
                    className="flex w-full items-center gap-2 rounded-md border border-border bg-canvas px-3 h-11 text-ui font-medium text-foreground transition-colors hover:bg-elevated disabled:opacity-60"
                  >
                    {PROVIDER_META[p].icon}
                    {PROVIDER_META[p].label}
                  </button>
                ))}
              </div>
              {err && <p className="mt-3 text-dense text-danger">{err}</p>}
              <button
                type="button"
                disabled={busy}
                onClick={() => setChoosing(null)}
                className="mt-3 w-full text-center text-dense text-subtle hover:text-foreground"
              >
                {busy ? "Redirecionando…" : "Cancelar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
