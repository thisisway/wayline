import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { getDb } from "../client";
import { contracts, proposals } from "../schema";

export interface ContractListItem {
  id: string;
  number: number;
  title: string;
  status: string;
  clientName: string | null;
  valueCents: number;
  token: string;
  updatedAt: Date;
}

export interface ContractDTO {
  id: string;
  number: number;
  title: string;
  content: string;
  valueCents: number;
  status: string;
  token: string;
  clientId: string | null;
  signedByName: string | null;
  signedByDoc: string | null;
  signedAt: Date | null;
}

export interface PublicContract extends ContractDTO {
  orgName: string;
  clientName: string | null;
}

function token(): string {
  return randomBytes(18).toString("base64url");
}

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export async function listContracts(orgId: string): Promise<ContractListItem[]> {
  try {
    const db = getDb();
    const rows = await db.query.contracts.findMany({
      where: and(eq(contracts.orgId, orgId), isNull(contracts.deletedAt)),
      orderBy: [desc(contracts.updatedAt)],
      with: { client: true },
    });
    return rows.map((c) => ({
      id: c.id,
      number: c.number,
      title: c.title,
      status: c.status,
      clientName: c.client?.name ?? null,
      valueCents: c.valueCents,
      token: c.token,
      updatedAt: c.updatedAt,
    }));
  } catch {
    return [];
  }
}

function toDTO(c: typeof contracts.$inferSelect): ContractDTO {
  return {
    id: c.id,
    number: c.number,
    title: c.title,
    content: c.content,
    valueCents: c.valueCents,
    status: c.status,
    token: c.token,
    clientId: c.clientId,
    signedByName: c.signedByName,
    signedByDoc: c.signedByDoc,
    signedAt: c.signedAt,
  };
}

export async function getContract(orgId: string, id: string): Promise<ContractDTO | null> {
  try {
    const db = getDb();
    const c = await db.query.contracts.findFirst({
      where: and(eq(contracts.id, id), eq(contracts.orgId, orgId), isNull(contracts.deletedAt)),
    });
    return c ? toDTO(c) : null;
  } catch {
    return null;
  }
}

async function nextNumber(orgId: string): Promise<number> {
  const db = getDb();
  const [{ max }] = (await db
    .select({ max: sql<number>`coalesce(max(${contracts.number}), 0)`.mapWith(Number) })
    .from(contracts)
    .where(eq(contracts.orgId, orgId))) as [{ max: number }];
  return max + 1;
}

export async function createContract(orgId: string, createdBy: string | null): Promise<string> {
  const db = getDb();
  const [row] = await db
    .insert(contracts)
    .values({ orgId, createdBy, token: token(), number: await nextNumber(orgId) })
    .returning({ id: contracts.id });
  return row!.id;
}

/** Cria um contrato a partir de uma proposta aceita (prefill do conteúdo). */
export async function createContractFromProposal(
  orgId: string,
  proposalId: string,
  createdBy: string | null,
): Promise<string | null> {
  const db = getDb();
  const p = await db.query.proposals.findFirst({
    where: and(eq(proposals.id, proposalId), eq(proposals.orgId, orgId)),
    with: { items: true, client: true },
  });
  if (!p) return null;
  const sub = p.items.reduce((s, i) => s + i.amountCents * i.quantity, 0);
  const total = Math.round(sub * (1 - p.discountPct / 100));
  const lines = p.items
    .map((i) => `• ${i.description} — ${i.quantity} × ${brl(i.amountCents)} = ${brl(i.amountCents * i.quantity)}`)
    .join("\n");
  const content = [
    `CONTRATO DE PRESTAÇÃO DE SERVIÇOS`,
    ``,
    `CONTRATANTE: ${p.client?.name ?? "________________"}`,
    ``,
    `OBJETO: ${p.title}`,
    p.intro ? `\n${p.intro}` : "",
    ``,
    `ESCOPO:`,
    lines,
    ``,
    `VALOR TOTAL: ${brl(total)}${p.recurrence === "monthly" ? " / mês" : ""}`,
    p.paymentMethod ? `PAGAMENTO: ${p.paymentMethod}${p.paymentTerms ? ` — ${p.paymentTerms}` : ""}` : "",
    ``,
    p.terms ? `CONDIÇÕES:\n${p.terms}` : "",
  ]
    .filter((x) => x !== undefined)
    .join("\n");

  const [row] = await db
    .insert(contracts)
    .values({
      orgId,
      createdBy,
      token: token(),
      number: await nextNumber(orgId),
      title: `Contrato — ${p.title}`,
      clientId: p.clientId,
      proposalId: p.id,
      valueCents: total,
      content,
    })
    .returning({ id: contracts.id });
  return row!.id;
}

export interface ContractPatch {
  title?: string;
  content?: string;
  valueCents?: number;
  clientId?: string | null;
  status?: string;
}

export async function updateContract(orgId: string, id: string, patch: ContractPatch): Promise<void> {
  const db = getDb();
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.title !== undefined) set.title = patch.title.trim() || "Contrato";
  if (patch.content !== undefined) set.content = patch.content;
  if (patch.valueCents !== undefined) set.valueCents = Math.max(0, Math.round(patch.valueCents));
  if (patch.clientId !== undefined) set.clientId = patch.clientId;
  if (patch.status !== undefined) set.status = patch.status;
  await db.update(contracts).set(set).where(and(eq(contracts.id, id), eq(contracts.orgId, orgId)));
}

export async function deleteContract(orgId: string, id: string): Promise<void> {
  const db = getDb();
  await db
    .update(contracts)
    .set({ deletedAt: new Date() })
    .where(and(eq(contracts.id, id), eq(contracts.orgId, orgId)));
}

export async function getContractByToken(tok: string): Promise<PublicContract | null> {
  try {
    const db = getDb();
    const c = await db.query.contracts.findFirst({
      where: and(eq(contracts.token, tok), isNull(contracts.deletedAt)),
      with: { client: true, organization: true },
    });
    if (!c) return null;
    return {
      ...toDTO(c),
      orgName: (c as typeof c & { organization?: { name?: string } }).organization?.name ?? "",
      clientName: (c as typeof c & { client?: { name?: string } }).client?.name ?? null,
    };
  } catch {
    return null;
  }
}

/** Cliente assina o contrato pelo link (nome + CPF/CNPJ). */
export async function signContract(tok: string, name: string, doc: string): Promise<boolean> {
  const db = getDb();
  const c = await db.query.contracts.findFirst({
    where: and(eq(contracts.token, tok), isNull(contracts.deletedAt)),
  });
  if (!c || c.status === "signed" || c.status === "canceled") return false;
  await db
    .update(contracts)
    .set({
      status: "signed",
      signedByName: name.slice(0, 80),
      signedByDoc: doc.slice(0, 30) || null,
      signedAt: new Date(),
    })
    .where(eq(contracts.id, c.id));
  return true;
}
