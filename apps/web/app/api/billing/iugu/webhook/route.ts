import { NextResponse, type NextRequest } from "next/server";
import { setOrgPlan } from "@wayline/db";
import { iuguWebhook } from "@/lib/billing/iugu";
import { isKnownPlan } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Webhook da Iugu (form-urlencoded). A Iugu não assina o payload, então
 * exigimos `?token=` igual a IUGU_WEBHOOK_TOKEN como segredo compartilhado.
 */
export async function POST(req: NextRequest) {
  const expected = process.env.IUGU_WEBHOOK_TOKEN;
  const token = req.nextUrl.searchParams.get("token");
  if (!expected || token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let event = "";
  let subscriptionId: string | undefined;
  try {
    const form = await req.formData();
    event = String(form.get("event") ?? "");
    // Iugu manda os dados como data[...]; a assinatura vem em data[id].
    subscriptionId =
      (form.get("data[subscription_id]") as string | null) ??
      (form.get("data[id]") as string | null) ??
      undefined;
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }

  const result = await iuguWebhook(event, subscriptionId);
  if (result.orgId && result.plan && isKnownPlan(result.plan)) {
    await setOrgPlan(result.orgId, result.plan).catch(() => undefined);
  }
  return NextResponse.json({ received: true });
}
