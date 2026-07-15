import "server-only";
import Stripe from "stripe";
import type { CheckoutInput, WebhookResult } from "./types";

/**
 * Provedor Stripe (cartão internacional, Pix/boleto via Stripe BR).
 * 100% env-gated: sem `STRIPE_SECRET_KEY`, `stripeEnabled()` é false e nada roda.
 *
 * Envs:
 *   STRIPE_SECRET_KEY       — chave secreta (sk_...)
 *   STRIPE_WEBHOOK_SECRET   — segredo do endpoint de webhook (whsec_...)
 *   STRIPE_PRICE_PRO / _PRO_YEARLY            — price ids do Pro (mensal/anual)
 *   STRIPE_PRICE_BUSINESS / _BUSINESS_YEARLY  — price ids do Business
 */
const secret = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const PRICE: Record<"monthly" | "yearly", Record<string, string | undefined>> = {
  monthly: {
    pro: process.env.STRIPE_PRICE_PRO,
    business: process.env.STRIPE_PRICE_BUSINESS,
  },
  yearly: {
    pro: process.env.STRIPE_PRICE_PRO_YEARLY,
    business: process.env.STRIPE_PRICE_BUSINESS_YEARLY,
  },
};

export function stripeEnabled(): boolean {
  return Boolean(secret);
}

let cached: Stripe | undefined;
function stripe(): Stripe {
  if (!cached) cached = new Stripe(secret!);
  return cached;
}

export async function stripeCheckout(input: CheckoutInput): Promise<string | null> {
  if (!stripeEnabled()) return null;
  const price = PRICE[input.cycle][input.plan];
  if (!price) return null;
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: Math.max(1, input.seats) }],
    customer_email: input.customerEmail,
    client_reference_id: input.orgId,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    allow_promotion_codes: true,
    metadata: { orgId: input.orgId, plan: input.plan },
    subscription_data: { metadata: { orgId: input.orgId, plan: input.plan } },
  });
  return session.url;
}

export async function stripeWebhook(body: string, signature: string): Promise<WebhookResult> {
  if (!stripeEnabled() || !webhookSecret) return { handled: false };
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return { handled: false };
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const orgId = s.metadata?.orgId ?? s.client_reference_id ?? undefined;
      const plan = s.metadata?.plan;
      return { handled: true, orgId: orgId ?? undefined, plan: plan ?? undefined };
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const orgId = sub.metadata?.orgId;
      const plan = sub.metadata?.plan;
      const active = sub.status === "active" || sub.status === "trialing";
      return { handled: true, orgId: orgId ?? undefined, plan: active ? plan ?? undefined : "free" };
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      return { handled: true, orgId: sub.metadata?.orgId ?? undefined, plan: "free" };
    }
    default:
      return { handled: true };
  }
}
