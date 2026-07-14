import "server-only";
import { iuguCheckout, iuguEnabled } from "./iugu";
import { stripeCheckout, stripeEnabled } from "./stripe";
import type { BillingProvider, CheckoutInput } from "./types";

export type { BillingProvider, CheckoutInput, PaidPlan, WebhookResult } from "./types";

/** Provedores de pagamento habilitados (por env). */
export function enabledProviders(): BillingProvider[] {
  const list: BillingProvider[] = [];
  if (stripeEnabled()) list.push("stripe");
  if (iuguEnabled()) list.push("iugu");
  return list;
}

/** Cria o checkout no provedor escolhido; retorna a URL de pagamento (ou null). */
export function createCheckout(
  provider: BillingProvider,
  input: CheckoutInput,
): Promise<string | null> {
  return provider === "stripe" ? stripeCheckout(input) : iuguCheckout(input);
}
