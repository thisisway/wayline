import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { getDb } from "../client";
import { contracts, invoices } from "../schema";

export interface InvoiceListItem {
  id: string;
  number: number;
  title: string;
  status: string;
  clientName: string | null;
  amountCents: number;
  dueDate: Date | null;
  paidAt: Date | null;
  token: string;
  updatedAt: Date;
}

export interface InvoiceDTO {
  id: string;
  number: number;
  title: string;
  description: string;
  amountCents: number;
  dueDate: Date | null;
  status: string;
  clientId: string | null;
  paidAt: Date | null;
  token: string;
}

export interface PublicInvoice extends InvoiceDTO {
  orgName: string;
  clientName: string | null;
}

function token(): string {
  return randomBytes(18).toString("base64url");
}

/** `invoices` é no-RLS: filtramos por org_id em toda query. Resiliente. */
export async function listInvoices(orgId: string): Promise<InvoiceListItem[]> {
  try {
    const db = getDb();
    const rows = await db.query.invoices.findMany({
      where: and(eq(invoices.orgId, orgId), isNull(invoices.deletedAt)),
      orderBy: [desc(invoices.updatedAt)],
      with: { client: true },
    });
    return rows.map((iv) => ({
      id: iv.id,
      number: iv.number,
      title: iv.title,
      status: iv.status,
      clientName: (iv as typeof iv & { client?: { name?: string } }).client?.name ?? null,
      amountCents: iv.amountCents,
      dueDate: iv.dueDate,
      paidAt: iv.paidAt,
      token: iv.token,
      updatedAt: iv.updatedAt,
    }));
  } catch {
    return [];
  }
}

function toDTO(iv: typeof invoices.$inferSelect): InvoiceDTO {
  return {
    id: iv.id,
    number: iv.number,
    title: iv.title,
    description: iv.description,
    amountCents: iv.amountCents,
    dueDate: iv.dueDate,
    status: iv.status,
    clientId: iv.clientId,
    paidAt: iv.paidAt,
    token: iv.token,
  };
}

export async function getInvoice(orgId: string, id: string): Promise<InvoiceDTO | null> {
  try {
    const db = getDb();
    const iv = await db.query.invoices.findFirst({
      where: and(eq(invoices.id, id), eq(invoices.orgId, orgId), isNull(invoices.deletedAt)),
    });
    return iv ? toDTO(iv) : null;
  } catch {
    return null;
  }
}

async function nextNumber(orgId: string): Promise<number> {
  const db = getDb();
  const [{ max }] = (await db
    .select({ max: sql<number>`coalesce(max(${invoices.number}), 0)`.mapWith(Number) })
    .from(invoices)
    .where(eq(invoices.orgId, orgId))) as [{ max: number }];
  return max + 1;
}

export async function createInvoice(orgId: string, createdBy: string | null): Promise<string> {
  const db = getDb();
  const [row] = await db
    .insert(invoices)
    .values({ orgId, createdBy, token: token(), number: await nextNumber(orgId) })
    .returning({ id: invoices.id });
  return row!.id;
}

/** Gera uma fatura a partir de um contrato (prefill valor + cliente + título). */
export async function createInvoiceFromContract(
  orgId: string,
  contractId: string,
  createdBy: string | null,
): Promise<string | null> {
  const db = getDb();
  const c = await db.query.contracts.findFirst({
    where: and(eq(contracts.id, contractId), eq(contracts.orgId, orgId)),
  });
  if (!c) return null;
  const [row] = await db
    .insert(invoices)
    .values({
      orgId,
      createdBy,
      token: token(),
      number: await nextNumber(orgId),
      title: `Fatura — ${c.title}`,
      clientId: c.clientId,
      contractId: c.id,
      amountCents: c.valueCents,
    })
    .returning({ id: invoices.id });
  return row!.id;
}

export interface InvoicePatch {
  title?: string;
  description?: string;
  amountCents?: number;
  dueDate?: Date | null;
  clientId?: string | null;
  status?: string;
}

export async function updateInvoice(orgId: string, id: string, patch: InvoicePatch): Promise<void> {
  const db = getDb();
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.title !== undefined) set.title = patch.title.trim() || "Fatura";
  if (patch.description !== undefined) set.description = patch.description;
  if (patch.amountCents !== undefined) set.amountCents = Math.max(0, Math.round(patch.amountCents));
  if (patch.dueDate !== undefined) set.dueDate = patch.dueDate;
  if (patch.clientId !== undefined) set.clientId = patch.clientId;
  if (patch.status !== undefined) {
    set.status = patch.status;
    // Marca/limpa a data de pagamento conforme o status.
    set.paidAt = patch.status === "paid" ? new Date() : null;
  }
  await db.update(invoices).set(set).where(and(eq(invoices.id, id), eq(invoices.orgId, orgId)));
}

export async function deleteInvoice(orgId: string, id: string): Promise<void> {
  const db = getDb();
  await db
    .update(invoices)
    .set({ deletedAt: new Date() })
    .where(and(eq(invoices.id, id), eq(invoices.orgId, orgId)));
}

export async function getInvoiceByToken(tok: string): Promise<PublicInvoice | null> {
  try {
    const db = getDb();
    const iv = await db.query.invoices.findFirst({
      where: and(eq(invoices.token, tok), isNull(invoices.deletedAt)),
      with: { client: true, organization: true },
    });
    if (!iv) return null;
    return {
      ...toDTO(iv),
      orgName: (iv as typeof iv & { organization?: { name?: string } }).organization?.name ?? "",
      clientName: (iv as typeof iv & { client?: { name?: string } }).client?.name ?? null,
    };
  } catch {
    return null;
  }
}
