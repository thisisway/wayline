"use server";

import { userCanAccessList } from "@wayline/db";
import { auth } from "@/auth";
import { send } from "@/lib/live";
import { heartbeat, leave, viewers, type Viewer } from "@/lib/presence";

/** Sinaliza aos outros clientes que o board da lista mudou (fire-and-forget). */
export async function pokeList(listId: string): Promise<void> {
  if (listId) send(listId, "board", String(Date.now()));
}

/** Sinaliza aos outros clientes que um documento foi salvo (fire-and-forget). */
export async function pokeDoc(pageId: string): Promise<void> {
  if (pageId) send(`doc:${pageId}`, "doc", String(Date.now()));
}

/** Sinaliza aos outros clientes que o comercial (propostas/funil) mudou. */
export async function pokeComercial(orgId: string): Promise<void> {
  if (orgId) send(`comercial:${orgId}`, "comercial", String(Date.now()));
}

/** Sinaliza aos outros clientes que o financeiro (faturas/despesas) mudou. */
export async function pokeFinanceiro(orgId: string): Promise<void> {
  if (orgId) send(`financeiro:${orgId}`, "financeiro", String(Date.now()));
}

/** Sinaliza aos outros clientes que os membros da org mudaram. */
export async function pokeMembers(orgId: string): Promise<void> {
  if (orgId) send(`members:${orgId}`, "members", String(Date.now()));
}

/** Avisa usuários (canal por usuário) que há uma nova notificação. */
export async function pokeUsers(userIds: string[]): Promise<void> {
  for (const id of [...new Set(userIds)]) {
    if (id) send(`user:${id}`, "notify", String(Date.now()));
  }
}

/** Registra/renova presença na lista e devolve os viewers atuais. */
export async function heartbeatAction(listId: string, avatarUrl?: string | null): Promise<Viewer[]> {
  const session = await auth();
  if (!session?.user?.id || !listId) return [];
  if (!(await userCanAccessList(session.user.id, listId))) return [];

  heartbeat(listId, {
    userId: session.user.id,
    name: session.user.name ?? "Usuário",
    // O avatar do próprio usuário (data URL) não cabe no JWT — vem do cliente.
    avatarUrl: avatarUrl && avatarUrl.length < 60_000 ? avatarUrl : null,
  });

  const current = viewers(listId);
  send(listId, "presence", JSON.stringify(current));
  return current;
}

/** Sai da lista (troca de board / desmontagem). */
export async function leaveAction(listId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id || !listId) return;
  leave(listId, session.user.id);
  send(listId, "presence", JSON.stringify(viewers(listId)));
}
