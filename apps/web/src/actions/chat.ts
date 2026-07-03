"use server";

import { getChatMessages, sendChatMessage, type ChatMessage } from "@wayline/db";
import { assertMember, getSessionUser } from "@/lib/authz";
import { send } from "@/lib/live";

export async function listChatAction(orgId: string, listId: string): Promise<ChatMessage[]> {
  if (!(await assertMember(orgId))) return [];
  return getChatMessages(orgId, listId);
}

export async function sendChatAction(
  orgId: string,
  listId: string,
  body: string,
): Promise<ChatMessage | null> {
  if (!body.trim() || !(await assertMember(orgId))) return null;
  const user = await getSessionUser();
  if (!user) return null;
  const msg = await sendChatMessage(orgId, listId, user.id, body.trim());
  send(listId, "chat", JSON.stringify(msg)); // realtime para os outros
  return msg;
}
