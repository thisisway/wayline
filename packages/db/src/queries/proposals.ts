import { and, asc, desc, eq, ilike, isNull, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { getDb, withOrg } from "../client";
import { clients, proposalActivity, proposalItems, proposals, spaces } from "../schema";
import { getPortfolioByIds, type PortfolioItemDTO } from "./portfolio";
import { notifyCommercial } from "./notifications";
import { emitEvent } from "./integrations";
import { createClient } from "./clients";
import { createList, createSpace } from "./orgs";
import type { ActivityDTO } from "./activity";

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

/** Etapas do funil comercial (ordem = colunas do Kanban). */
export const PROPOSAL_STAGES = ["lead", "qualificado", "proposta", "ganho", "perdido"] as const;
export type ProposalStage = (typeof PROPOSAL_STAGES)[number];

export interface ProposalListItem {
  id: string;
  number: number;
  title: string;
  status: string;
  stage: string;
  clientName: string | null;
  totalCents: number;
  token: string;
  validUntil: Date | null;
  updatedAt: Date;
  ownerId: string | null;
  ownerName: string | null;
  ownerAvatarUrl: string | null;
  estimatedValueCents: number;
  expectedCloseAt: Date | null;
  lostReason: string | null;
  source: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
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
  stage: string;
  token: string;
  clientId: string | null;
  validUntil: Date | null;
  decidedByName: string | null;
  decidedByDoc: string | null;
  decidedAt: Date | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  ownerId: string | null;
  ownerName: string | null;
  ownerAvatarUrl: string | null;
  estimatedValueCents: number;
  expectedCloseAt: Date | null;
  lostReason: string | null;
  source: string;
  items: ProposalItemDTO[];
}

/** Proposta pública (link do cliente). Sem `internalNotes`/dados internos (dono, motivo de perda). */
export interface PublicProposal
  extends Omit<ProposalDTO, "internalNotes" | "ownerId" | "ownerName" | "ownerAvatarUrl" | "lostReason"> {
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

/** Valor efetivo do negócio: soma dos itens (se houver) senão o valor manual. */
function effectiveValueCents(
  items: Array<{ quantity: number; amountCents: number }>,
  estimatedValueCents: number,
  discountPct: number,
): number {
  if (items.length === 0) return estimatedValueCents;
  const sub = items.reduce((s, i) => s + subtotal(i), 0);
  return Math.round(sub * (1 - discountPct / 100));
}

/** `proposals` não tem RLS: filtramos por org_id em toda query (app-enforced). */
export async function listProposals(orgId: string): Promise<ProposalListItem[]> {
  try {
    const db = getDb();
    const rows = await db.query.proposals.findMany({
      where: and(eq(proposals.orgId, orgId), isNull(proposals.deletedAt)),
      orderBy: [desc(proposals.updatedAt)],
      with: { client: true, items: true, owner: true },
    });
    return rows.map((p) => {
      return {
        id: p.id,
        number: p.number,
        title: p.title,
        status: p.status,
        stage: p.stage,
        clientName: p.client?.name ?? null,
        totalCents: effectiveValueCents(p.items, p.estimatedValueCents, p.discountPct),
        token: p.token,
        validUntil: p.validUntil,
        updatedAt: p.updatedAt,
        ownerId: p.ownerId,
        ownerName: p.owner?.name ?? null,
        ownerAvatarUrl: p.owner?.avatarUrl ?? null,
        estimatedValueCents: p.estimatedValueCents,
        expectedCloseAt: p.expectedCloseAt,
        lostReason: p.lostReason,
        source: p.source,
        contactName: p.contactName,
        contactEmail: p.contactEmail,
        contactPhone: p.contactPhone,
      };
    });
  } catch {
    return [];
  }
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

type RawProposal = typeof proposals.$inferSelect & {
  items: RawItem[];
  owner?: { name: string; avatarUrl: string | null } | null;
};
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
    stage: p.stage,
    token: p.token,
    clientId: p.clientId,
    validUntil: p.validUntil,
    decidedByName: p.decidedByName,
    decidedByDoc: p.decidedByDoc,
    decidedAt: p.decidedAt,
    contactName: p.contactName,
    contactEmail: p.contactEmail,
    contactPhone: p.contactPhone,
    ownerId: p.ownerId,
    ownerName: p.owner?.name ?? null,
    ownerAvatarUrl: p.owner?.avatarUrl ?? null,
    estimatedValueCents: p.estimatedValueCents,
    expectedCloseAt: p.expectedCloseAt,
    lostReason: p.lostReason,
    source: p.source,
    items: p.items
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(itemDTO),
  };
}

export async function getProposal(orgId: string, id: string): Promise<ProposalDTO | null> {
  try {
    const db = getDb();
    const p = await db.query.proposals.findFirst({
      where: and(eq(proposals.id, id), eq(proposals.orgId, orgId), isNull(proposals.deletedAt)),
      with: { items: true, owner: true },
    });
    return p ? baseDTO(p as RawProposal) : null;
  } catch {
    return null;
  }
}

export async function createProposal(orgId: string, createdBy: string | null): Promise<string> {
  const db = getDb();
  const [{ max }] = (await db
    .select({ max: sql<number>`coalesce(max(${proposals.number}), 0)`.mapWith(Number) })
    .from(proposals)
    .where(eq(proposals.orgId, orgId))) as [{ max: number }];
  const [row] = await db
    .insert(proposals)
    .values({ orgId, createdBy, token: token(), number: max + 1, ownerId: createdBy })
    .returning({ id: proposals.id });
  return row!.id;
}

export interface CreateLeadInput {
  title: string;
  notes: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  source: "form" | "api" | "manual";
  estimatedValueCents?: number;
  ownerId?: string | null;
}

/** Cria uma oportunidade (lead) na etapa "lead" do funil (formulário, API…). */
export async function createLead(orgId: string, input: CreateLeadInput): Promise<string> {
  const db = getDb();
  const [{ max }] = (await db
    .select({ max: sql<number>`coalesce(max(${proposals.number}), 0)`.mapWith(Number) })
    .from(proposals)
    .where(eq(proposals.orgId, orgId))) as [{ max: number }];
  const [row] = await db
    .insert(proposals)
    .values({
      orgId,
      token: token(),
      number: max + 1,
      title: input.title.slice(0, 200) || "Lead",
      stage: "lead",
      internalNotes: input.notes.slice(0, 5000),
      contactName: (input.contactName ?? "").trim().slice(0, 200),
      contactEmail: (input.contactEmail ?? "").trim().slice(0, 200),
      contactPhone: (input.contactPhone ?? "").trim().slice(0, 60),
      source: input.source,
      estimatedValueCents: Math.max(0, Math.round(input.estimatedValueCents ?? 0)),
      ownerId: input.ownerId ?? null,
    })
    .returning({ id: proposals.id });
  return row!.id;
}

export interface CreateQuickLeadInput {
  title: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  estimatedValueCents: number;
  ownerId: string | null;
  expectedCloseAt: Date | null;
  createdBy: string | null;
}

/** Cadastro rápido de lead (botão "Novo lead"), sempre origem "manual". */
export async function createQuickLead(orgId: string, input: CreateQuickLeadInput): Promise<string> {
  const db = getDb();
  const [{ max }] = (await db
    .select({ max: sql<number>`coalesce(max(${proposals.number}), 0)`.mapWith(Number) })
    .from(proposals)
    .where(eq(proposals.orgId, orgId))) as [{ max: number }];
  const title = (input.title.trim() || input.contactName.trim() || "Lead").slice(0, 200);
  const [row] = await db
    .insert(proposals)
    .values({
      orgId,
      token: token(),
      number: max + 1,
      title,
      stage: "lead",
      source: "manual",
      contactName: input.contactName.trim().slice(0, 200),
      contactEmail: input.contactEmail.trim().slice(0, 200),
      contactPhone: input.contactPhone.trim().slice(0, 60),
      estimatedValueCents: Math.max(0, Math.round(input.estimatedValueCents)),
      ownerId: input.ownerId,
      expectedCloseAt: input.expectedCloseAt,
      createdBy: input.createdBy,
    })
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
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  ownerId?: string | null;
  estimatedValueCents?: number;
  expectedCloseAt?: Date | null;
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
  if (patch.contactName !== undefined) set.contactName = patch.contactName.slice(0, 200);
  if (patch.contactEmail !== undefined) set.contactEmail = patch.contactEmail.slice(0, 200);
  if (patch.contactPhone !== undefined) set.contactPhone = patch.contactPhone.slice(0, 60);
  if (patch.ownerId !== undefined) set.ownerId = patch.ownerId;
  if (patch.estimatedValueCents !== undefined) {
    set.estimatedValueCents = Math.max(0, Math.round(patch.estimatedValueCents));
  }
  if (patch.expectedCloseAt !== undefined) set.expectedCloseAt = patch.expectedCloseAt;
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
  try {
    return await getProposalByTokenInner(tok);
  } catch {
    return null;
  }
}

async function getProposalByTokenInner(tok: string): Promise<PublicProposal | null> {
  const db = getDb();
  const p = await db.query.proposals.findFirst({
    where: and(eq(proposals.token, tok), isNull(proposals.deletedAt)),
    with: { items: true, client: true, organization: true },
  });
  if (!p) return null;
  const dto = baseDTO(p as RawProposal);
  const { internalNotes: _omit, ownerId: _oid, ownerName: _on, ownerAvatarUrl: _oa, lostReason: _lr, ...pub } = dto;
  void _omit;
  void _oid;
  void _on;
  void _oa;
  void _lr;
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
  // Só decide propostas enviadas e ainda no prazo (a UI já esconde os botões,
  // mas a server action é pública — validamos aqui também).
  if (!p || p.status !== "sent") return false;
  if (p.validUntil && p.validUntil.getTime() < Date.now()) return false;
  await db
    .update(proposals)
    .set({
      status: decision,
      decidedByName: byName.slice(0, 80),
      decidedByDoc: byDoc.slice(0, 30) || null,
      decidedAt: new Date(),
    })
    .where(eq(proposals.id, p.id));
  // Reflete a decisão do cliente no funil automaticamente (mesma automação
  // do drag-and-drop manual: cliente/produção no "ganho", log de atividade).
  await applyStageEffects(p.orgId, p, decision === "accepted" ? "ganho" : "perdido", {
    actorName: byName || "Cliente",
    lostReason: decision === "rejected" ? "Recusada pelo cliente" : undefined,
  });
  await notifyCommercial(
    p.orgId,
    decision === "accepted" ? "proposal_accepted" : "proposal_rejected",
    p.title,
    byName,
    p.createdBy,
  );
  if (decision === "accepted") void emitEvent(p.orgId, "proposal.accepted", { title: p.title, by: byName });
  return true;
}

const STAGE_LABELS: Record<ProposalStage, string> = {
  lead: "Lead",
  qualificado: "Qualificado",
  proposta: "Proposta",
  ganho: "Ganho",
  perdido: "Perdido",
};

/**
 * Aplica os efeitos de uma mudança de etapa: grava a etapa + motivo de perda,
 * registra no histórico da negociação e, no "ganho", dispara a automação
 * (cliente + produção). Chamada tanto pelo Kanban manual (`setProposalStage`)
 * quanto pela decisão pública do cliente (`decideProposal`) — ponto único
 * pra não duplicar a automação nos dois fluxos.
 */
async function applyStageEffects(
  orgId: string,
  p: typeof proposals.$inferSelect,
  stage: ProposalStage,
  opts?: { lostReason?: string; actorId?: string | null; actorName?: string },
): Promise<void> {
  const db = getDb();
  const set: Record<string, unknown> = { stage, updatedAt: new Date() };
  if (stage === "perdido") {
    set.lostReason = (opts?.lostReason ?? "").trim().slice(0, 300) || null;
  } else if (p.stage === "perdido") {
    set.lostReason = null; // saiu de "perdido": limpa o motivo anterior
  }
  await db.update(proposals).set(set).where(eq(proposals.id, p.id));

  const actorId = opts?.actorId ?? null;
  const actorName = opts?.actorName || "Sistema";
  await db.insert(proposalActivity).values({
    orgId,
    proposalId: p.id,
    actorId,
    actorName,
    action: "stage",
    detail: `${STAGE_LABELS[p.stage as ProposalStage] ?? p.stage} → ${STAGE_LABELS[stage]}`,
  });
  if (stage === "perdido" && set.lostReason) {
    await db.insert(proposalActivity).values({
      orgId,
      proposalId: p.id,
      actorId,
      actorName,
      action: "lost_reason",
      detail: String(set.lostReason),
    });
  }

  if (stage === "ganho") {
    await ensureClientFromLead(orgId, p.id).catch(() => {});
    await sendProposalToProduction(orgId, p.id).catch(() => {});
  }
}

/** Vincula um cliente existente ou cria um novo a partir do contato do lead. Best-effort. */
async function ensureClientFromLead(orgId: string, proposalId: string): Promise<void> {
  const db = getDb();
  const p = await db.query.proposals.findFirst({ where: eq(proposals.id, proposalId) });
  if (!p || p.clientId) return; // já tem cliente vinculado
  const name = p.contactName.trim() || p.title.trim();
  if (!name) return;
  const client = await createClient(orgId, {
    name,
    color: "#1D66FF",
    contactEmail: p.contactEmail || null,
  });
  await db.update(proposals).set({ clientId: client.id }).where(eq(proposals.id, proposalId));
}

/**
 * Handoff "ganho → produção" (mesmo padrão de `sendInvoiceToProduction` em
 * invoices.ts): idempotente via `production_list_id`, acha/cria o space
 * "Produção" e cria uma lista vazia nomeada pelo cliente/título. Best-effort.
 */
async function sendProposalToProduction(orgId: string, proposalId: string): Promise<void> {
  const db = getDb();
  const p = await db.query.proposals.findFirst({
    where: and(eq(proposals.id, proposalId), eq(proposals.orgId, orgId)),
  });
  if (!p || p.productionListId) return; // já enviado

  // ponytail: prefixo "Produ%" pode casar "Produtos"; aceitável p/ uma agência.
  const existing = await withOrg(orgId, (tx) =>
    tx.query.spaces.findFirst({
      where: and(ilike(spaces.name, "Produ%"), isNull(spaces.deletedAt)),
    }),
  );
  const spaceId = existing?.id ?? (await createSpace(orgId, "Produção"));

  const client = p.clientId
    ? await withOrg(orgId, (tx) => tx.query.clients.findFirst({ where: eq(clients.id, p.clientId!) }))
    : null;
  const name = client?.name || (p.title && p.title !== "Lead" ? p.title : "Novo projeto");

  const listId = await createList(orgId, spaceId, name);
  await db
    .update(proposals)
    .set({ productionListId: listId })
    .where(and(eq(proposals.id, proposalId), eq(proposals.orgId, orgId)));
  void emitEvent(orgId, "production.created", { title: name });
}

/** Move a proposta no funil comercial (Kanban). Motivo obrigatório em "perdido". */
export async function setProposalStage(
  orgId: string,
  id: string,
  stage: ProposalStage,
  opts?: { lostReason?: string; actorId?: string | null; actorName?: string },
): Promise<boolean> {
  if (!PROPOSAL_STAGES.includes(stage)) return false;
  if (stage === "perdido" && !opts?.lostReason?.trim()) return false;
  const db = getDb();
  const p = await db.query.proposals.findFirst({
    where: and(eq(proposals.id, id), eq(proposals.orgId, orgId), isNull(proposals.deletedAt)),
  });
  if (!p) return false;
  await applyStageEffects(orgId, p, stage, opts);
  if (stage === "ganho") {
    await notifyCommercial(orgId, "deal_won", p.title, p.contactName || p.title, p.createdBy).catch(() => {});
  } else if (stage === "perdido") {
    await notifyCommercial(orgId, "lead_lost", p.title, p.contactName || p.title, p.createdBy).catch(() => {});
  }
  return true;
}

/** Histórico de atividade da negociação (mesmo padrão de getTaskActivity). */
export async function getProposalActivity(orgId: string, proposalId: string): Promise<ActivityDTO[]> {
  try {
    const db = getDb();
    const rows = await db.query.proposalActivity.findMany({
      where: and(eq(proposalActivity.proposalId, proposalId), eq(proposalActivity.orgId, orgId)),
      orderBy: [asc(proposalActivity.createdAt)],
    });
    return rows.map((r) => ({
      id: r.id,
      actorName: r.actorName,
      action: r.action,
      detail: r.detail,
      createdAt: r.createdAt,
    }));
  } catch {
    return [];
  }
}

export async function listClientOptions(
  orgId: string,
): Promise<Array<{ id: string; name: string }>> {
  try {
    const db = getDb();
    const rows = await db.query.clients.findMany({
      where: and(eq(clients.orgId, orgId), isNull(clients.deletedAt)),
      orderBy: [asc(clients.name)],
    });
    return rows.map((c) => ({ id: c.id, name: c.name }));
  } catch {
    return [];
  }
}
