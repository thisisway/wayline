"use server";

import {
  createSupportTicket,
  getSupportWhatsappUrl,
  listSupportTickets,
  setSupportTicketStatus,
  setSupportWhatsappUrl,
  type SupportTicketDTO,
  type TicketCategory,
  type TicketStatus,
} from "@wayline/db";
import { revalidatePath } from "next/cache";
import { assertMember, getSessionUser, isPlatformAdmin } from "@/lib/authz";

const CATEGORIES: TicketCategory[] = ["support", "bug", "idea"];

export interface SupportFormInput {
  category: string;
  subject: string;
  message: string;
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
  });
  return id !== null;
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
