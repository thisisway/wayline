import "server-only";
import type { CheckoutInput, WebhookResult } from "./types";

/**
 * Provedor Iugu (Pix, boleto e cartão — recorrência no Brasil). REST, sem SDK.
 * Env-gated por `IUGU_API_TOKEN`.
 *
 * Envs:
 *   IUGU_API_TOKEN      — token da API (live/test)
 *   IUGU_PLAN_PRO / _PRO_YEARLY            — identifiers do Pro (mensal/anual)
 *   IUGU_PLAN_BUSINESS / _BUSINESS_YEARLY  — identifiers do Business
 *   IUGU_WEBHOOK_TOKEN  — segredo exigido na URL do webhook (?token=...)
 *
 * Obs.: os planos precisam existir no painel da Iugu com o mesmo preço/ciclo.
 * O orgId/plan viajam em custom_variables e são lidos de volta no webhook.
 */
const BASE = "https://api.iugu.com/v1";
const token = process.env.IUGU_API_TOKEN;

const PLAN: Record<"monthly" | "yearly", Record<string, string | undefined>> = {
  monthly: {
    pro: process.env.IUGU_PLAN_PRO,
    business: process.env.IUGU_PLAN_BUSINESS,
  },
  yearly: {
    pro: process.env.IUGU_PLAN_PRO_YEARLY,
    business: process.env.IUGU_PLAN_BUSINESS_YEARLY,
  },
};

export function iuguEnabled(): boolean {
  return Boolean(token);
}

function authHeaders(): Record<string, string> {
  const basic = Buffer.from(`${token}:`).toString("base64");
  return {
    Authorization: `Basic ${basic}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export async function iuguCheckout(input: CheckoutInput): Promise<string | null> {
  if (!iuguEnabled()) return null;
  const planIdentifier = PLAN[input.cycle][input.plan];
  if (!planIdentifier) return null;
  try {
    // 1) Cliente
    const cRes = await fetch(`${BASE}/customers`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        email: input.customerEmail,
        name: input.customerName,
        custom_variables: [{ name: "orgId", value: input.orgId }],
      }),
    });
    if (!cRes.ok) return null;
    const customer = (await cRes.json()) as { id?: string };
    if (!customer.id) return null;

    // 2) Assinatura (gera a fatura recorrente; devolve a URL segura de pagamento)
    const sRes = await fetch(`${BASE}/subscriptions`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        plan_identifier: planIdentifier,
        customer_id: customer.id,
        custom_variables: [
          { name: "orgId", value: input.orgId },
          { name: "plan", value: input.plan },
        ],
      }),
    });
    if (!sRes.ok) return null;
    const sub = (await sRes.json()) as {
      recent_invoices?: Array<{ secure_url?: string }>;
    };
    return sub.recent_invoices?.[0]?.secure_url ?? null;
  } catch {
    return null;
  }
}

const ACTIVATE_EVENTS = ["subscription.activated", "subscription.renewed"];
const DEACTIVATE_EVENTS = [
  "subscription.suspended",
  "subscription.expired",
  "subscription.canceled",
];

/**
 * Processa um evento de webhook da Iugu.
 *
 * Ativa o plano apenas quando há confirmação real de pagamento:
 *  - `subscription.activated` / `subscription.renewed`, ou
 *  - `invoice.status_changed` com status `paid`.
 * Rebaixa para Free em suspensão/expiração/cancelamento.
 * Outros eventos (ex.: `subscription.created`, fatura pendente) são ignorados —
 * assim o plano não sobe antes do pagamento (importante p/ Pix/boleto).
 */
export async function iuguWebhook(
  event: string,
  subscriptionId: string | undefined,
  invoiceStatus?: string,
): Promise<WebhookResult> {
  if (!iuguEnabled() || !subscriptionId) return { handled: false };

  const deactivate = DEACTIVATE_EVENTS.includes(event);
  const activate =
    ACTIVATE_EVENTS.includes(event) ||
    (event === "invoice.status_changed" && invoiceStatus === "paid");
  if (!deactivate && !activate) return { handled: true }; // evento irrelevante

  try {
    const res = await fetch(`${BASE}/subscriptions/${subscriptionId}`, {
      headers: authHeaders(),
    });
    if (!res.ok) return { handled: false };
    const sub = (await res.json()) as {
      suspended?: boolean;
      expired_at?: string | null;
      custom_variables?: Array<{ name: string; value: string }>;
    };
    const vars = sub.custom_variables ?? [];
    const orgId = vars.find((v) => v.name === "orgId")?.value;
    const plan = vars.find((v) => v.name === "plan")?.value;
    if (!orgId) return { handled: true };

    // Segurança: mesmo num evento de ativação, se a assinatura está suspensa/
    // expirada no momento da consulta, mantém em Free.
    const inactive = deactivate || sub.suspended === true || Boolean(sub.expired_at);
    return { handled: true, orgId, plan: inactive ? "free" : plan ?? undefined };
  } catch {
    return { handled: false };
  }
}
