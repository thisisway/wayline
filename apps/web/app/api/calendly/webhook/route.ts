import { createHmac, timingSafeEqual } from "node:crypto";
import { createLead, getOrgCalendlyKey } from "@wayline/db";
import { send } from "@/lib/live";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Verifica a assinatura do Calendly: header `t=<ts>,v1=<hmac>` sobre `ts.body`. */
function verify(signingKey: string, header: string | null, body: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((kv) => {
      const i = kv.indexOf("=");
      return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
    }),
  ) as { t?: string; v1?: string };
  if (!parts.t || !parts.v1) return false;
  const expected = createHmac("sha256", signingKey).update(`${parts.t}.${body}`).digest("hex");
  try {
    const a = Buffer.from(parts.v1, "hex");
    const b = Buffer.from(expected, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Webhook do Calendly. URL: /api/calendly/webhook?org=<orgId>.
 * Em `invitee.created`, cria uma oportunidade na etapa "lead" do funil.
 */
export async function POST(req: Request) {
  const orgId = new URL(req.url).searchParams.get("org");
  if (!orgId) return new Response("org required", { status: 400 });

  const key = await getOrgCalendlyKey(orgId).catch(() => null);
  if (!key) return new Response("not configured", { status: 404 });

  const body = await req.text();
  if (!verify(key, req.headers.get("calendly-webhook-signature"), body)) {
    return new Response("invalid signature", { status: 401 });
  }

  let evt: {
    event?: string;
    payload?: {
      name?: string;
      email?: string;
      scheduled_event?: { name?: string; start_time?: string };
      questions_and_answers?: Array<{ question?: string; answer?: string }>;
    };
  };
  try {
    evt = JSON.parse(body);
  } catch {
    return new Response("bad json", { status: 400 });
  }

  if (evt.event === "invitee.created" && evt.payload) {
    const p = evt.payload;
    const eventName = p.scheduled_event?.name ?? "Reunião";
    const name = p.name?.trim() || p.email || "Lead";
    const start = p.scheduled_event?.start_time
      ? new Date(p.scheduled_event.start_time).toLocaleString("pt-BR", {
          timeZone: "America/Sao_Paulo",
        })
      : "";
    const notes = [
      `Lead recebido pelo Calendly (${eventName}).`,
      "",
      `Nome: ${p.name ?? "—"}`,
      `Email: ${p.email ?? "—"}`,
      start ? `Agendado para: ${start}` : "",
      ...(p.questions_and_answers ?? []).map((qa) => `${qa.question ?? "?"}: ${qa.answer ?? "—"}`),
    ]
      .filter(Boolean)
      .join("\n");

    await createLead(orgId, `${name} — ${eventName}`, notes).catch(() => {});
    send(`comercial:${orgId}`, "comercial", String(Date.now()));
  }

  return new Response("ok");
}
