import { desc, eq } from "drizzle-orm";
import { getDb } from "../client";
import { platformSettings, supportTickets } from "../schema";

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
}

export interface SupportTicketDTO {
  id: string;
  orgId: string;
  userName: string;
  userEmail: string;
  orgName: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  createdAt: Date;
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
      orderBy: [desc(supportTickets.createdAt)],
      limit: 200,
    });
    return rows.map((t) => ({
      id: t.id,
      orgId: t.orgId,
      userName: t.userName,
      userEmail: t.userEmail,
      orgName: t.orgName,
      category: t.category,
      subject: t.subject,
      message: t.message,
      status: t.status,
      createdAt: t.createdAt,
    }));
  } catch {
    return [];
  }
}

/** Quantidade de chamados abertos (badge do admin). Resiliente. */
export async function countOpenTickets(): Promise<number> {
  try {
    return (await listSupportTickets()).filter((t) => t.status === "open").length;
  } catch {
    return 0;
  }
}

export async function setSupportTicketStatus(id: string, status: TicketStatus): Promise<void> {
  const db = getDb();
  await db
    .update(supportTickets)
    .set({ status, updatedAt: new Date() })
    .where(eq(supportTickets.id, id));
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
