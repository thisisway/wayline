import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "../client";
import { platformSettings, supportMessages, supportTickets } from "../schema";
import { notifyUser } from "./notifications";

export type TicketCategory = "support" | "bug" | "idea";
export type TicketStatus = "open" | "closed";

export interface SupportTicketInput {
  orgId: string;
  userId: string | null;
  userName: string;
  userEmail: string;
  orgName: string;
  category: TicketCategory;
  subject: string;
  message: string;
  attachmentUrl?: string | null;
}

export interface SupportTicketDTO {
  id: string;
  orgId: string;
  userId: string | null;
  userName: string;
  userEmail: string;
  orgName: string;
  category: string;
  subject: string;
  message: string;
  attachmentUrl: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupportMessageDTO {
  id: string;
  authorName: string;
  isAdmin: boolean;
  body: string;
  attachmentUrl: string | null;
  createdAt: Date;
}

export interface TicketThread {
  ticket: SupportTicketDTO;
  messages: SupportMessageDTO[];
}

function ticketDTO(t: typeof supportTickets.$inferSelect): SupportTicketDTO {
  return {
    id: t.id,
    orgId: t.orgId,
    userId: t.userId,
    userName: t.userName,
    userEmail: t.userEmail,
    orgName: t.orgName,
    category: t.category,
    subject: t.subject,
    message: t.message,
    attachmentUrl: t.attachmentUrl ?? null,
    status: t.status,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

/** Abre um chamado de suporte. Retorna o id ou null (resiliente). */
export async function createSupportTicket(input: SupportTicketInput): Promise<string | null> {
  try {
    const db = getDb();
    const [row] = await db
      .insert(supportTickets)
      .values({
        orgId: input.orgId,
        userId: input.userId,
        userName: input.userName.slice(0, 120),
        userEmail: input.userEmail.slice(0, 160),
        orgName: input.orgName.slice(0, 160),
        category: input.category,
        subject: input.subject.slice(0, 200),
        message: input.message.slice(0, 4000),
        attachmentUrl: input.attachmentUrl ?? null,
      })
      .returning({ id: supportTickets.id });
    return row?.id ?? null;
  } catch {
    return null;
  }
}

/** Todos os chamados (superadmin). Resiliente: [] se a tabela faltar. */
export async function listSupportTickets(): Promise<SupportTicketDTO[]> {
  try {
    const db = getDb();
    const rows = await db.query.supportTickets.findMany({
      orderBy: [desc(supportTickets.updatedAt)],
      limit: 200,
    });
    return rows.map(ticketDTO);
  } catch {
    return [];
  }
}

/** Chamados de um usuário específico (área do usuário). Resiliente. */
export async function listMyTickets(orgId: string, userId: string): Promise<SupportTicketDTO[]> {
  try {
    const db = getDb();
    const rows = await db.query.supportTickets.findMany({
      where: and(eq(supportTickets.orgId, orgId), eq(supportTickets.userId, userId)),
      orderBy: [desc(supportTickets.updatedAt)],
      limit: 100,
    });
    return rows.map(ticketDTO);
  } catch {
    return [];
  }
}

export async function getTicket(id: string): Promise<SupportTicketDTO | null> {
  try {
    const db = getDb();
    const t = await db.query.supportTickets.findFirst({ where: eq(supportTickets.id, id) });
    return t ? ticketDTO(t) : null;
  } catch {
    return null;
  }
}

/** Thread completa (ticket + mensagens). Resiliente. */
export async function getTicketThread(id: string): Promise<TicketThread | null> {
  try {
    const db = getDb();
    const t = await db.query.supportTickets.findFirst({ where: eq(supportTickets.id, id) });
    if (!t) return null;
    const msgs = await db.query.supportMessages.findMany({
      where: eq(supportMessages.ticketId, id),
      orderBy: [asc(supportMessages.createdAt)],
    });
    return {
      ticket: ticketDTO(t),
      messages: msgs.map((m) => ({
        id: m.id,
        authorName: m.authorName,
        isAdmin: m.isAdmin,
        body: m.body,
        attachmentUrl: m.attachmentUrl ?? null,
        createdAt: m.createdAt,
      })),
    };
  } catch {
    return null;
  }
}

export interface SupportReplyInput {
  ticketId: string;
  authorId: string | null;
  authorName: string;
  isAdmin: boolean;
  body: string;
  attachmentUrl?: string | null;
}

/** Adiciona uma resposta ao chamado. Admin → notifica o usuário; usuário → reabre. */
export async function addSupportMessage(input: SupportReplyInput): Promise<boolean> {
  const db = getDb();
  const t = await db.query.supportTickets.findFirst({
    where: eq(supportTickets.id, input.ticketId),
  });
  if (!t) return false;
  await db.insert(supportMessages).values({
    ticketId: t.id,
    orgId: t.orgId,
    authorId: input.authorId,
    authorName: input.authorName.slice(0, 120),
    isAdmin: input.isAdmin,
    body: input.body.slice(0, 4000),
    attachmentUrl: input.attachmentUrl ?? null,
  });
  // Resposta do usuário reabre o chamado; resposta do admin mantém.
  await db
    .update(supportTickets)
    .set({ updatedAt: new Date(), ...(input.isAdmin ? {} : { status: "open" }) })
    .where(eq(supportTickets.id, t.id));
  // Admin respondeu → notifica o autor do chamado.
  if (input.isAdmin && t.userId) {
    await notifyUser(t.orgId, t.userId, "support_reply", t.subject || "Seu chamado", "Suporte");
  }
  return true;
}

export async function countOpenTickets(): Promise<number> {
  try {
    return (await listSupportTickets()).filter((t) => t.status === "open").length;
  } catch {
    return 0;
  }
}

export async function setSupportTicketStatus(id: string, status: TicketStatus): Promise<void> {
  const db = getDb();
  const t = await db.query.supportTickets.findFirst({ where: eq(supportTickets.id, id) });
  await db
    .update(supportTickets)
    .set({ status, updatedAt: new Date() })
    .where(eq(supportTickets.id, id));
  if (status === "closed" && t?.userId) {
    await notifyUser(t.orgId, t.userId, "support_resolved", t.subject || "Seu chamado", "Suporte");
  }
}

/** Link do grupo de WhatsApp (config global). Resiliente: null se faltar. */
export async function getSupportWhatsappUrl(): Promise<string | null> {
  try {
    const db = getDb();
    const row = await db.query.platformSettings.findFirst();
    return row?.supportWhatsappUrl ?? null;
  } catch {
    return null;
  }
}

/** Define o link do grupo de WhatsApp (upsert do singleton, só essa coluna). */
export async function setSupportWhatsappUrl(url: string | null): Promise<void> {
  const db = getDb();
  await db
    .insert(platformSettings)
    .values({ id: "singleton", supportWhatsappUrl: url, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: platformSettings.id,
      set: { supportWhatsappUrl: url, updatedAt: new Date() },
    });
}
