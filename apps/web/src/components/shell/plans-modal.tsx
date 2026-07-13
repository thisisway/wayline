"use client";

import * as React from "react";
import { Check, Sparkles, X } from "lucide-react";
import { Badge, cn } from "@wayline/ui";
import {
  PLANS,
  PLAN_ORDER,
  formatPrice,
  resolvePlan,
  type PlanId,
} from "@/lib/plans";

/** Email de vendas para o CTA do Enterprise. */
const SALES_EMAIL = "suporte@waycloud.com.br";

export function PlansModal({
  currentPlan,
  onClose,
}: {
  /** Valor bruto de organizations.plan (pode ser legado). */
  currentPlan: string;
  onClose: () => void;
}) {
  const active = resolvePlan(currentPlan);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function cta(id: PlanId) {
    if (id === active.id) return; // plano atual
    if (id === "enterprise") {
      window.location.href = `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(
        "Wayline Enterprise — quero falar com vendas",
      )}`;
      return;
    }
    // Sem gateway ainda: sinaliza que a cobrança entra em breve.
    window.location.href = `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(
      `Quero assinar o plano ${PLANS[id].name}`,
    )}`;
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
          Cobrança em breve. Por enquanto, os CTAs abrem contato com o time — as
          assinaturas recorrentes serão ativadas na próxima fase.
        </p>
      </div>
    </div>
  );
}
