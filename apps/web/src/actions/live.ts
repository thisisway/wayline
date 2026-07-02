"use server";

import { auth } from "@/auth";
import { send } from "@/lib/live";
import { heartbeat, leave, viewers, type Viewer } from "@/lib/presence";

/** Sinaliza aos outros clientes que o board da lista mudou (fire-and-forget). */
export async function pokeList(listId: string): Promise<void> {
  if (listId) send(listId, "board", String(Date.now()));
}

/** Registra/renova presença na lista e devolve os viewers atuais. */
export async function heartbeatAction(listId: string): Promise<Viewer[]> {
  const session = await auth();
  if (!session?.user?.id || !listId) return [];

  heartbeat(listId, {
    userId: session.user.id,
    name: session.user.name ?? "Usuário",
    avatarUrl: null,
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
