import { NextResponse, type NextRequest } from "next/server";
import { setOrgPlan } from "@wayline/db";
import { stripeWebhook } from "@/lib/billing/stripe";
import { isKnownPlan } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Webhook do Stripe: valida a assinatura e aplica o plano na org. */
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "no signature" }, { status: 400 });

  const body = await req.text(); // corpo cru para verificar a assinatura
  const result = await stripeWebhook(body, signature);
  if (!result.handled) return NextResponse.json({ error: "invalid" }, { status: 400 });

  if (result.orgId && result.plan && isKnownPlan(result.plan)) {
    await setOrgPlan(result.orgId, result.plan).catch(() => undefined);
  }
  return NextResponse.json({ received: true });
}
