import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { getDb } from "../client";
import { clients, proposalItems, proposals } from "../schema";
import { getPortfolioByIds, type PortfolioItemDTO } from "./portfolio";

export interface SchedulePhase {
  label: string;
  duration: string;
}

export interface ProposalItemDTO {
  id: string;
  description: string;
  details: string;
  amountCents: number; // preço unitário
  quantity: number;
  unit: string;
  term: string;
}

export interface ProposalListItem {
  id: string;
  number: number;
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
  number: number;
  title: string;
  intro: string;
  objective: string;
  terms: string;
  bonus: string;
  schedule: SchedulePhase[];
  discountPct: number;
  paymentMethod: string;
  paymentTerms: string;
  recurrence: string;
  nextSteps: string;
  internalNotes: string;
  portfolioIds: string[];
  status: string;
  token: string;
  clientId: string | null;
  validUntil: Date | null;
  decidedByName: string | null;
  decidedByDoc: string | null;
  decidedAt: Date | null;
  items: ProposalItemDTO[];
}

/** Proposta pública (link do cliente). Sem `internalNotes`; portfólio resolvido. */
export interface PublicProposal extends Omit<ProposalDTO, "internalNotes"> {
  orgName: string;
  clientName: string | null;
  portfolio: PortfolioItemDTO[];
}

function token(): string {
  return randomBytes(18).toString("base64url");
}

function subtotal(i: { quantity: number; amountCents: number }): number {
  return i.quantity * i.amountCents;
}

/** `proposals` não tem RLS: filtramos por org_id em toda query (app-enforced). */
export async function listProposals(orgId: string): Promise<ProposalListItem[]> {
  const db = getDb();
  const rows = await db.query.proposals.findMany({
    where: and(eq(proposals.orgId, orgId), isNull(proposals.deletedAt)),
    orderBy: [desc(proposals.updatedAt)],
    with: { client: true, items: true },
  });
  return rows.map((p) => {
    const sub = p.items.reduce((s, i) => s + subtotal(i), 0);
    return {
      id: p.id,
      number: p.number,
      title: p.title,
      status: p.status,
      clientName: p.client?.name ?? null,
      totalCents: Math.round(sub * (1 - p.discountPct / 100)),
      token: p.token,
      validUntil: p.validUntil,
      updatedAt: p.updatedAt,
    };
  });
}

type RawItem = typeof proposalItems.$inferSelect;
function itemDTO(i: RawItem): ProposalItemDTO {
  return {
    id: i.id,
    description: i.description,
    details: i.details,
    amountCents: i.amountCents,
    quantity: i.quantity,
    unit: i.unit,
    term: i.term,
  };
}

type RawProposal = typeof proposals.$inferSelect & { items: RawItem[] };
function baseDTO(p: RawProposal): Omit<ProposalDTO, "internalNotes"> & { internalNotes: string } {
  return {
    id: p.id,
    number: p.number,
    title: p.title,
    intro: p.intro,
    objective: p.objective,
    terms: p.terms,
    bonus: p.bonus,
    schedule: p.schedule ?? [],
    discountPct: p.discountPct,
    paymentMethod: p.paymentMethod,
    paymentTerms: p.paymentTerms,
    recurrence: p.recurrence,
    nextSteps: p.nextSteps,
    internalNotes: p.internalNotes,
    portfolioIds: p.portfolioIds ?? [],
    status: p.status,
    token: p.token,
    clientId: p.clientId,
    validUntil: p.validUntil,
    decidedByName: p.decidedByName,
    decidedByDoc: p.decidedByDoc,
    decidedAt: p.decidedAt,
    items: p.items
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(itemDTO),
  };
}

export async function getProposal(orgId: string, id: string): Promise<ProposalDTO | null> {
  const db = getDb();
  const p = await db.query.proposals.findFirst({
    where: and(eq(proposals.id, id), eq(proposals.orgId, orgId), isNull(proposals.deletedAt)),
    with: { items: true },
  });
  return p ? baseDTO(p as RawProposal) : null;
}

export async function createProposal(orgId: string, createdBy: string | null): Promise<string> {
  const db = getDb();
  const [{ max }] = (await db
    .select({ max: sql<number>`coalesce(max(${proposals.number}), 0)`.mapWith(Number) })
    .from(proposals)
    .where(eq(proposals.orgId, orgId))) as [{ max: number }];
  const [row] = await db
    .insert(proposals)
    .values({ orgId, createdBy, token: token(), number: max + 1 })
    .returning({ id: proposals.id });
  return row!.id;
}

export interface ProposalItemInput {
  description: string;
  details: string;
  amountCents: number;
  quantity: number;
  unit: string;
  term: string;
}

export interface ProposalPatch {
  title?: string;
  intro?: string;
  objective?: string;
  terms?: string;
  bonus?: string;
  schedule?: SchedulePhase[];
  discountPct?: number;
  paymentMethod?: string;
  paymentTerms?: string;
  recurrence?: string;
  nextSteps?: string;
  internalNotes?: string;
  portfolioIds?: string[];
  clientId?: string | null;
  status?: string;
  validUntil?: Date | null;
  items?: ProposalItemInput[];
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
  if (patch.objective !== undefined) set.objective = patch.objective;
  if (patch.terms !== undefined) set.terms = patch.terms;
  if (patch.bonus !== undefined) set.bonus = patch.bonus;
  if (patch.schedule !== undefined) set.schedule = patch.schedule;
  if (patch.discountPct !== undefined) set.discountPct = Math.min(100, Math.max(0, Math.round(patch.discountPct)));
  if (patch.paymentMethod !== undefined) set.paymentMethod = patch.paymentMethod;
  if (patch.paymentTerms !== undefined) set.paymentTerms = patch.paymentTerms;
  if (patch.recurrence !== undefined) set.recurrence = patch.recurrence;
  if (patch.nextSteps !== undefined) set.nextSteps = patch.nextSteps;
  if (patch.internalNotes !== undefined) set.internalNotes = patch.internalNotes;
  if (patch.portfolioIds !== undefined) set.portfolioIds = patch.portfolioIds;
  if (patch.clientId !== undefined) set.clientId = patch.clientId;
  if (patch.status !== undefined) set.status = patch.status;
  if (patch.validUntil !== undefined) set.validUntil = patch.validUntil;
  await db.update(proposals).set(set).where(and(eq(proposals.id, id), eq(proposals.orgId, orgId)));

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
          details: it.details,
          amountCents: Math.max(0, Math.round(it.amountCents)),
          quantity: Math.max(1, Math.round(it.quantity || 1)),
          unit: it.unit || "Unidade",
          term: it.term,
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

/** Leitura pública pelo token (sem sessão, sem notas internas). */
export async function getProposalByToken(tok: string): Promise<PublicProposal | null> {
  const db = getDb();
  const p = await db.query.proposals.findFirst({
    where: and(eq(proposals.token, tok), isNull(proposals.deletedAt)),
    with: { items: true, client: true, organization: true },
  });
  if (!p) return null;
  const dto = baseDTO(p as RawProposal);
  const { internalNotes: _omit, ...pub } = dto;
  void _omit;
  const portfolio = await getPortfolioByIds(p.orgId, dto.portfolioIds);
  return {
    ...pub,
    orgName: (p as RawProposal & { organization?: { name?: string } }).organization?.name ?? "",
    clientName: (p as RawProposal & { client?: { name?: string } }).client?.name ?? null,
    portfolio,
  };
}

/** Cliente aceita/recusa a proposta pelo link público (com CPF/CNPJ). */
export async function decideProposal(
  tok: string,
  decision: "accepted" | "rejected",
  byName: string,
  byDoc: string,
): Promise<boolean> {
  const db = getDb();
  const p = await db.query.proposals.findFirst({
    where: and(eq(proposals.token, tok), isNull(proposals.deletedAt)),
  });
  if (!p || p.status === "accepted" || p.status === "rejected") return false;
  await db
    .update(proposals)
    .set({
      status: decision,
      decidedByName: byName.slice(0, 80),
      decidedByDoc: byDoc.slice(0, 30) || null,
      decidedAt: new Date(),
    })
    .where(eq(proposals.id, p.id));
  return true;
}

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
