import { createHmac, randomBytes } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../client";
import { integrations } from "../schema";

export type IntegrationKind = "webhook" | "slack" | "discord";
export type IntegrationEvent =
  | "task.completed"
  | "proposal.accepted"
  | "contract.signed"
  | "invoice.paid";

export const INTEGRATION_EVENTS: IntegrationEvent[] = [
  "task.completed",
  "proposal.accepted",
  "contract.signed",
  "invoice.paid",
];

export interface IntegrationDTO {
  id: string;
  kind: IntegrationKind;
  name: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  lastStatus: string | null;
  lastFiredAt: Date | null;
}

export interface IntegrationInput {
  kind: IntegrationKind;
  name: string;
  url: string;
  events: string[];
}

function toDTO(r: typeof integrations.$inferSelect): IntegrationDTO {
  return {
    id: r.id,
    kind: (r.kind as IntegrationKind) ?? "webhook",
    name: r.name,
    url: r.url,
    secret: r.secret,
    events: Array.isArray(r.events) ? r.events : [],
    active: r.active,
    lastStatus: r.lastStatus ?? null,
    lastFiredAt: r.lastFiredAt ?? null,
  };
}

export async function listIntegrations(orgId: string): Promise<IntegrationDTO[]> {
  try {
    const db = getDb();
    const rows = await db.query.integrations.findMany({
      where: eq(integrations.orgId, orgId),
      orderBy: [asc(integrations.createdAt)],
    });
    return rows.map(toDTO);
  } catch {
    return [];
  }
}

export async function createIntegration(orgId: string, input: IntegrationInput): Promise<string | null> {
  const url = input.url.trim();
  if (!/^https:\/\//i.test(url)) return null; // só HTTPS
  const db = getDb();
  const [row] = await db
    .insert(integrations)
    .values({
      orgId,
      kind: input.kind,
      name: input.name.trim() || input.kind,
      url,
      secret: randomBytes(24).toString("hex"),
      events: input.events.filter((e) => INTEGRATION_EVENTS.includes(e as IntegrationEvent)),
    })
    .returning({ id: integrations.id });
  return row?.id ?? null;
}

export async function updateIntegration(
  orgId: string,
  id: string,
  patch: Partial<Pick<IntegrationDTO, "name" | "url" | "events" | "active">>,
): Promise<void> {
  const set: Record<string, unknown> = {};
  if (patch.name !== undefined) set.name = patch.name.trim() || "Integração";
  if (patch.url !== undefined && /^https:\/\//i.test(patch.url.trim())) set.url = patch.url.trim();
  if (patch.events !== undefined)
    set.events = patch.events.filter((e) => INTEGRATION_EVENTS.includes(e as IntegrationEvent));
  if (patch.active !== undefined) set.active = patch.active;
  if (Object.keys(set).length === 0) return;
  const db = getDb();
  await db.update(integrations).set(set).where(and(eq(integrations.id, id), eq(integrations.orgId, orgId)));
}

export async function deleteIntegration(orgId: string, id: string): Promise<void> {
  const db = getDb();
  await db.delete(integrations).where(and(eq(integrations.id, id), eq(integrations.orgId, orgId)));
}

// --- Dispatch --------------------------------------------------------------

/** Mensagem legível (Slack/Discord) por evento. */
function humanMessage(event: IntegrationEvent, data: Record<string, unknown>): string {
  const title = String(data.title ?? "");
  const by = data.by ? ` — por ${data.by}` : "";
  switch (event) {
    case "task.completed":
      return `✅ Tarefa concluída: ${title}`;
    case "proposal.accepted":
      return `📄 Proposta aceita: ${title}${by}`;
    case "contract.signed":
      return `✍️ Contrato assinado: ${title}${by}`;
    case "invoice.paid": {
      const cents = Number(data.amountCents ?? 0);
      const brl = (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      return `💰 Fatura paga: ${title} — ${brl}`;
    }
  }
}

async function deliver(
  t: IntegrationDTO,
  event: IntegrationEvent,
  data: Record<string, unknown>,
  ts: string,
): Promise<void> {
  let body: string;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (t.kind === "slack") {
    body = JSON.stringify({ text: humanMessage(event, data) });
  } else if (t.kind === "discord") {
    body = JSON.stringify({ content: humanMessage(event, data) });
  } else {
    body = JSON.stringify({ event, data, timestamp: ts });
    headers["x-wayline-event"] = event;
    headers["x-wayline-signature"] = "sha256=" + createHmac("sha256", t.secret).update(body).digest("hex");
  }

  let status = "error";
  try {
    const res = await fetch(t.url, { method: "POST", headers, body, signal: AbortSignal.timeout(5000) });
    status = String(res.status);
  } catch (e) {
    status = "error: " + (e instanceof Error ? e.message : "fetch").slice(0, 60);
  }
  // Diagnóstico best-effort — nunca quebra a entrega.
  try {
    const db = getDb();
    await db
      .update(integrations)
      .set({ lastStatus: status, lastFiredAt: new Date() })
      .where(eq(integrations.id, t.id));
  } catch {
    /* ignore */
  }
}

/**
 * Dispara um evento para as integrações ativas da org que o assinam.
 * Best-effort e não-bloqueante: os chamadores usam `void emitEvent(...)`.
 * ponytail: sem retry/fila; se um endpoint cair, a entrega é perdida (last_status registra).
 */
export async function emitEvent(
  orgId: string,
  event: IntegrationEvent,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const targets = (await listIntegrations(orgId)).filter(
      (t) => t.active && t.events.includes(event),
    );
    if (targets.length === 0) return;
    const ts = new Date().toISOString();
    await Promise.allSettled(targets.map((t) => deliver(t, event, data, ts)));
  } catch {
    /* best-effort */
  }
}

/** Entrega de teste (payload fake) para validar a configuração. */
export async function testIntegration(orgId: string, id: string): Promise<string> {
  const t = (await listIntegrations(orgId)).find((x) => x.id === id);
  if (!t) return "not_found";
  await deliver(t, "task.completed", { title: "Teste de integração Wayline", by: "Wayline" }, new Date().toISOString());
  const after = (await listIntegrations(orgId)).find((x) => x.id === id);
  return after?.lastStatus ?? "error";
}
