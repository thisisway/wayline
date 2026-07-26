"use server";

import { getOrgBilling, getWorkspaceMembers } from "@wayline/db";
import { assertMember, assertRole, getSessionUser, getSessionUserId } from "@/lib/authz";
import { appUrl } from "@/lib/email";
import { getUserProfile } from "@wayline/db";
import {
  createCheckout,
  enabledProviders,
  type BillingProvider,
  type PaidPlan,
} from "@/lib/billing";
import { stripeBillingPortal, stripeEnabled } from "@/lib/billing/stripe";
import type { BillingCycle } from "@/lib/plans";

export async function billingProvidersAction(): Promise<BillingProvider[]> {
  return enabledProviders();
}

export interface SubscriptionSummary {
  plan: string;
  members: number;
  trialEndsAt: string | null;
  /** Tem assinatura Stripe gerenciável (mostra "Gerenciar assinatura"). */
  manageable: boolean;
}

/** Resumo de assinatura da org (plano bruto + assentos + fim do trial). */
export async function subscriptionSummaryAction(
  orgId: string,
): Promise<SubscriptionSummary | null> {
  if (!(await assertMember(orgId))) return null;
  const [{ plan, trialEndsAt, stripeCustomerId }, members] = await Promise.all([
    getOrgBilling(orgId),
    getWorkspaceMembers(orgId),
  ]);
  return {
    plan,
    members: members.length,
    trialEndsAt: trialEndsAt ? trialEndsAt.toISOString() : null,
    manageable: stripeEnabled() && Boolean(stripeCustomerId),
  };
}

export type PortalResult =
  | { status: "ok"; url: string }
  | { status: "none" }
  | { status: "forbidden" }
  | { status: "error" };

/**
 * Abre o Portal de Cobrança do Stripe (cancelar, faturas, cartão, trocar
 * plano). Owner/Admin. Requer que a org já tenha um customer no Stripe.
 */
export async function billingPortalAction(orgId: string): Promise<PortalResult> {
  if (!(await assertRole(orgId, "admin"))) return { status: "forbidden" };
  if (!appUrl) return { status: "error" };
  const { stripeCustomerId } = await getOrgBilling(orgId);
  if (!stripeCustomerId || !stripeEnabled()) return { status: "none" };
  const url = await stripeBillingPortal(stripeCustomerId, `${appUrl}/app`);
  return url ? { status: "ok", url } : { status: "error" };
}

export type CheckoutResult =
  | { status: "ok"; url: string }
  | { status: "disabled" }
  | { status: "forbidden" }
  | { status: "error" };

/** Inicia o checkout de um plano pago no provedor escolhido. Owner/Admin. */
export async function startCheckoutAction(
  orgId: string,
  plan: PaidPlan,
  provider: BillingProvider,
  cycle: BillingCycle = "monthly",
): Promise<CheckoutResult> {
  if (!(await assertRole(orgId, "admin"))) return { status: "forbidden" };
  if (!enabledProviders().includes(provider)) return { status: "disabled" };
  if (!appUrl) return { status: "disabled" }; // precisa de URLs absolutas

  const uid = await getSessionUserId();
  const user = await getSessionUser();
  if (!uid || !user) return { status: "forbidden" };
  const profile = await getUserProfile(uid);
  const email = profile?.email;
  if (!email) return { status: "error" };

  const seats = Math.max(1, (await getWorkspaceMembers(orgId)).length);

  try {
    const url = await createCheckout(provider, {
      orgId,
      plan,
      cycle,
      seats,
      customerEmail: email,
      customerName: user.name,
      successUrl: `${appUrl}/app?billing=success`,
      cancelUrl: `${appUrl}/app?billing=cancel`,
    });
    return url ? { status: "ok", url } : { status: "error" };
  } catch {
    return { status: "error" };
  }
}
