import type { BillingCycle, PlanId } from "@/lib/plans";

export type BillingProvider = "stripe" | "iugu";

/** Planos cobráveis (Free é grátis; Enterprise é contato comercial). */
export type PaidPlan = Extract<PlanId, "pro" | "business">;

export interface CheckoutInput {
  orgId: string;
  plan: PaidPlan;
  cycle: BillingCycle;
  /** Assentos = nº de membros (cobrança por usuário). */
  seats: number;
  customerEmail: string;
  customerName: string;
  successUrl: string;
  cancelUrl: string;
}

/** Resultado do processamento de um webhook: o que aplicar no plano da org. */
export interface WebhookResult {
  handled: boolean;
  orgId?: string;
  /** Novo plano a gravar ("free" em cancelamento/inadimplência). */
  plan?: string;
}
