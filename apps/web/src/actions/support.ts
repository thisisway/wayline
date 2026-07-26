"use server";

import {
  addSupportMessage,
  createSupportTicket,
  getSupportWhatsappUrl,
  getTicket,
  getTicketThread,
  listMyTickets,
  listSupportTickets,
  setSupportTicketStatus,
  setSupportWhatsappUrl,
  type SupportTicketDTO,
  type TicketCategory,
  type TicketStatus,
  type TicketThread,
} from "@wayline/db";
import { revalidatePath } from "next/cache";
import { assertMember, getSessionUser, isPlatformAdmin } from "@/lib/authz";

const CATEGORIES: TicketCategory[] = ["support", "bug", "idea"];
const MAX_IMG = 1_500_000; // ~1.5MB (data URL de print)

function validImage(url?: string | null): string | null {
  if (!url) return null;
  if (!url.startsWith("data:image/") || url.length > MAX_IMG) return null;
  return url;
}

export interface SupportFormInput {
  category: string;
  subject: string;
  message: string;
  attachmentUrl?: string | null;
}

/** Usuário abre um chamado (suporte/bug/sugestão). */
export async function createSupportTicketAction(
  orgId: string,
  orgName: string,
  input: SupportFormInput,
): Promise<boolean> {
  if (!(await assertMember(orgId))) return false;
  if (!input.message.trim()) return false;
  const user = await getSessionUser();
  const category = (CATEGORIES.includes(input.category as TicketCategory)
    ? input.category
    : "support") as TicketCategory;
  const id = await createSupportTicket({
    orgId,
    userId: user?.id ?? null,
    userName: user?.name ?? "",
    userEmail: user?.email ?? "",
    orgName,
    category,
    subject: input.subject.trim(),
    message: input.message.trim(),
    attachmentUrl: validImage(input.attachmentUrl),
  });
  return id !== null;
}

/** Chamados do próprio usuário (área de suporte no app). */
export async function myTicketsAction(orgId: string): Promise<SupportTicketDTO[]> {
  if (!(await assertMember(orgId))) return [];
  const user = await getSessionUser();
  if (!user) return [];
  return listMyTickets(orgId, user.id);
}

/** Thread de um chamado — dono do chamado OU superadmin. */
export async function ticketThreadAction(ticketId: string): Promise<TicketThread | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const t = await getTicket(ticketId);
  if (!t) return null;
  const admin = await isPlatformAdmin();
  const owner = t.userId === user.id && (await assertMember(t.orgId));
  if (!admin && !owner) return null;
  return getTicketThread(ticketId);
}

/** Responde um chamado — usuário (dono) ou superadmin. */
export async function replyTicketAction(
  ticketId: string,
  body: string,
  attachmentUrl?: string | null,
): Promise<boolean> {
  const user = await getSessionUser();
  if (!user) return false;
  if (!body.trim() && !validImage(attachmentUrl)) return false;
  const t = await getTicket(ticketId);
  if (!t) return false;
  const admin = await isPlatformAdmin();
  const owner = t.userId === user.id && (await assertMember(t.orgId));
  if (!admin && !owner) return false;
  const ok = await addSupportMessage({
    ticketId,
    authorId: user.id,
    authorName: admin ? "Suporte" : user.name,
    isAdmin: admin,
    body: body.trim(),
    attachmentUrl: validImage(attachmentUrl),
  });
  if (admin) revalidatePath("/admin/suporte");
  return ok;
}

/** Link do grupo de WhatsApp para o modal (qualquer usuário logado). */
export async function supportWhatsappUrlAction(): Promise<string | null> {
  const user = await getSessionUser();
  if (!user) return null;
  return getSupportWhatsappUrl();
}

/** Superadmin: lista todos os chamados. */
export async function listSupportTicketsAction(): Promise<SupportTicketDTO[]> {
  if (!(await isPlatformAdmin())) return [];
  return listSupportTickets();
}

/** Superadmin: marca chamado como aberto/resolvido. */
export async function setSupportTicketStatusAction(
  id: string,
  status: TicketStatus,
): Promise<boolean> {
  if (!(await isPlatformAdmin())) return false;
  await setSupportTicketStatus(id, status);
  revalidatePath("/admin/suporte");
  return true;
}

/** Superadmin: define o link do grupo de WhatsApp. */
export async function setSupportWhatsappUrlAction(url: string): Promise<boolean> {
  if (!(await isPlatformAdmin())) return false;
  const clean = url.trim();
  if (clean && !/^https?:\/\//i.test(clean)) return false;
  await setSupportWhatsappUrl(clean || null);
  revalidatePath("/admin/suporte");
  return true;
}
