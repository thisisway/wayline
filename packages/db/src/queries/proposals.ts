import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { getDb } from "../client";
import { clients, proposalItems, proposals } from "../schema";

export interface ProposalItemDTO {
  id: string;
  description: string;
  amountCents: number;
}

export interface ProposalListItem {
  id: string;
  title: string;
  status: string;
  clientName: string | null;
  totalCents: number;
  token: string;
  validUntil: Date | null;
  updatedAt: Date;
}

export interface ProposalDTO {
  id: string;
  title: string;
  intro: string;
  status: string;
  token: string;
  clientId: string | null;
  validUntil: Date | null;
  decidedByName: string | null;
  decidedAt: Date | null;
  items: ProposalItemDTO[];
}

/** Proposta pública (para o link do cliente) — inclui contexto de marca. */
export interface PublicProposal extends ProposalDTO {
  orgName: string;
  clientName: string | null;
}

function token(): string {
  return randomBytes(18).toString("base64url");
}

/** `proposals` não tem RLS: filtramos por org_id em toda query (app-enforced). */
export async function listProposals(orgId: string): Promise<ProposalListItem[]> {
  const db = getDb();
  const rows = await db.query.proposals.findMany({
    where: and(eq(proposals.orgId, orgId), isNull(proposals.deletedAt)),
    orderBy: [desc(proposals.updatedAt)],
    with: { client: true, items: true },
  });
  return rows.map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    clientName: p.client?.name ?? null,
    totalCents: p.items.reduce((s, i) => s + i.amountCents, 0),
    token: p.token,
    validUntil: p.validUntil,
    updatedAt: p.updatedAt,
  }));
}

async function loadProposal(orgId: string, id: string): Promise<ProposalDTO | null> {
  const db = getDb();
  const p = await db.query.proposals.findFirst({
    where: and(eq(proposals.id, id), eq(proposals.orgId, orgId), isNull(proposals.deletedAt)),
    with: { items: true },
  });
  if (!p) return null;
  return {
    id: p.id,
    title: p.title,
    intro: p.intro,
    status: p.status,
    token: p.token,
    clientId: p.clientId,
    validUntil: p.validUntil,
    decidedByName: p.decidedByName,
    decidedAt: p.decidedAt,
    items: p.items
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((i) => ({ id: i.id, description: i.description, amountCents: i.amountCents })),
  };
}

export async function getProposal(orgId: string, id: string): Promise<ProposalDTO | null> {
  return loadProposal(orgId, id);
}

export async function createProposal(orgId: string, createdBy: string | null): Promise<string> {
  const db = getDb();
  const [row] = await db
    .insert(proposals)
    .values({ orgId, createdBy, token: token() })
    .returning({ id: proposals.id });
  return row!.id;
}

export interface ProposalPatch {
  title?: string;
  intro?: string;
  clientId?: string | null;
  status?: string;
  validUntil?: Date | null;
  items?: Array<{ description: string; amountCents: number }>;
}

export async function updateProposal(
  orgId: string,
  id: string,
  patch: ProposalPatch,
): Promise<void> {
  const db = getDb();
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.title !== undefined) set.title = patch.title.trim() || "Proposta";
  if (patch.intro !== undefined) set.intro = patch.intro;
  if (patch.clientId !== undefined) set.clientId = patch.clientId;
  if (patch.status !== undefined) set.status = patch.status;
  if (patch.validUntil !== undefined) set.validUntil = patch.validUntil;
  await db
    .update(proposals)
    .set(set)
    .where(and(eq(proposals.id, id), eq(proposals.orgId, orgId)));

  // Itens: substitui em bloco (simples e consistente).
  if (patch.items) {
    await db
      .delete(proposalItems)
      .where(and(eq(proposalItems.proposalId, id), eq(proposalItems.orgId, orgId)));
    if (patch.items.length) {
      await db.insert(proposalItems).values(
        patch.items.map((it, idx) => ({
          orgId,
          proposalId: id,
          description: it.description,
          amountCents: Math.max(0, Math.round(it.amountCents)),
          position: idx,
        })),
      );
    }
  }
}

export async function deleteProposal(orgId: string, id: string): Promise<void> {
  const db = getDb();
  await db
    .update(proposals)
    .set({ deletedAt: new Date() })
    .where(and(eq(proposals.id, id), eq(proposals.orgId, orgId)));
}

/** Leitura pública pelo token (sem sessão). Marca como "sent" se ainda draft. */
export async function getProposalByToken(tok: string): Promise<PublicProposal | null> {
  const db = getDb();
  const p = await db.query.proposals.findFirst({
    where: and(eq(proposals.token, tok), isNull(proposals.deletedAt)),
    with: { items: true, client: true, organization: true },
  });
  if (!p) return null;
  return {
    id: p.id,
    title: p.title,
    intro: p.intro,
    status: p.status,
    token: p.token,
    clientId: p.clientId,
    validUntil: p.validUntil,
    decidedByName: p.decidedByName,
    decidedAt: p.decidedAt,
    orgName: p.organization?.name ?? "",
    clientName: p.client?.name ?? null,
    items: p.items
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((i) => ({ id: i.id, description: i.description, amountCents: i.amountCents })),
  };
}

/** Cliente aceita/recusa a proposta pelo link público. */
export async function decideProposal(
  tok: string,
  decision: "accepted" | "rejected",
  byName: string,
): Promise<boolean> {
  const db = getDb();
  const p = await db.query.proposals.findFirst({
    where: and(eq(proposals.token, tok), isNull(proposals.deletedAt)),
  });
  // Só decide se ainda estiver pendente (draft/sent).
  if (!p || p.status === "accepted" || p.status === "rejected") return false;
  await db
    .update(proposals)
    .set({ status: decision, decidedByName: byName.slice(0, 80), decidedAt: new Date() })
    .where(eq(proposals.id, p.id));
  return true;
}

/** Clientes da org para o seletor da proposta. */
export async function listClientOptions(
  orgId: string,
): Promise<Array<{ id: string; name: string }>> {
  const db = getDb();
  const rows = await db.query.clients.findMany({
    where: and(eq(clients.orgId, orgId), isNull(clients.deletedAt)),
    orderBy: [asc(clients.name)],
  });
  return rows.map((c) => ({ id: c.id, name: c.name }));
}
