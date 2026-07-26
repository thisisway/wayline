"use server";

import {
  addSupportMessage,
  countAwaitingUser,
  createSupportTicket,
  getSupportAlertWhatsapp,
  getSupportWhatsappUrl,
  getTicket,
  getTicketThread,
  listMyTickets,
  listSupportTickets,
  markTicketReadByUser,
  setSupportAlertWhatsapp,
  setSupportTicketStatus,
  setSupportWhatsappUrl,
  type SupportTicketDTO,
  type TicketCategory,
  type TicketStatus,
  type TicketThread,
} from "@wayline/db";
import { revalidatePath } from "next/cache";
import { assertMember, getSessionUser, isPlatformAdmin } from "@/lib/authz";
import { sendSupportUpdateEmail } from "@/lib/email";
import { sendWhatsappAlert } from "@/lib/whatsapp";

const CAT_PT: Record<string, string> = { support: "Suporte", bug: "Bug", idea: "Sugestão" };

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

  // Avisa o admin de um novo chamado via WhatsApp (best-effort; no-op se não configurado).
  if (id) {
    const to = await getSupportAlertWhatsapp();
    if (to) {
      const link = process.env.APP_URL ? `\n${process.env.APP_URL}/admin/suporte` : "";
      const body =
        `🆘 Novo chamado (${CAT_PT[category] ?? "Suporte"})` +
        (input.subject.trim() ? ` — ${input.subject.trim()}` : "") +
        `\nDe: ${user?.name ?? "Alguém"}${user?.email ? ` (${user.email})` : ""} · ${orgName}` +
        `\n${input.message.trim().slice(0, 400)}` +
        link;
      await sendWhatsappAlert(to, body).catch(() => false);
    }
  }
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
  // Dono abriu a conversa → marca como lida (limpa o badge "aguardando você").
  if (owner && !admin) await markTicketReadByUser(ticketId);
  return getTicketThread(ticketId);
}

/** Contador de chamados do usuário com resposta do suporte não lida (badge). */
export async function supportAwaitingCountAction(orgId: string): Promise<number> {
  const user = await getSessionUser();
  if (!user || !(await assertMember(orgId))) return 0;
  return countAwaitingUser(orgId, user.id);
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
  // Admin respondeu → e-mail ao autor do chamado (além da notificação in-app).
  if (ok && admin && t.userEmail) {
    await sendSupportUpdateEmail(t.userEmail, {
      kind: "reply",
      ticketSubject: t.subject,
      ticketId,
    }).catch(() => false);
  }
  // Usuário respondeu → alerta o admin no WhatsApp (best-effort, se configurado).
  if (ok && !admin) {
    const to = await getSupportAlertWhatsapp();
    if (to) {
      const link = process.env.APP_URL ? `\n${process.env.APP_URL}/admin/suporte` : "";
      const wbody =
        `💬 Resposta no chamado — ${t.subject || "chamado"}` +
        `\nDe: ${user.name}${user.email ? ` (${user.email})` : ""} · ${t.orgName}` +
        `\n${body.trim().slice(0, 400)}` +
        link;
      await sendWhatsappAlert(to, wbody).catch(() => false);
    }
  }
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
  const t = await getTicket(id);
  await setSupportTicketStatus(id, status);
  if (status === "closed" && t?.userEmail) {
    await sendSupportUpdateEmail(t.userEmail, {
      kind: "resolved",
      ticketSubject: t.subject,
      ticketId: id,
    }).catch(() => false);
  }
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

/** Superadmin: número (E.164) que recebe alerta de novo chamado via WhatsApp. */
export async function setSupportAlertWhatsappAction(num: string): Promise<boolean> {
  if (!(await isPlatformAdmin())) return false;
  const digits = num.replace(/\D/g, "");
  if (digits && (digits.length < 10 || digits.length > 15)) return false;
  await setSupportAlertWhatsapp(digits || null);
  revalidatePath("/admin/suporte");
  return true;
}
