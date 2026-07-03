import { asc, eq } from "drizzle-orm";
import { withOrg } from "../client";
import { chatMessages } from "../schema";

export interface ChatMessage {
  id: string;
  body: string;
  createdAt: Date;
  author: { id: string; name: string; avatarUrl: string | null };
}

/** Últimas mensagens do chat da lista (cronológico). */
export async function getChatMessages(orgId: string, listId: string): Promise<ChatMessage[]> {
  return withOrg(orgId, async (tx) => {
    const rows = await tx.query.chatMessages.findMany({
      where: eq(chatMessages.listId, listId),
      orderBy: [asc(chatMessages.createdAt)],
      limit: 100,
      with: { author: true },
    });
    return rows.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt,
      author: { id: m.author.id, name: m.author.name, avatarUrl: m.author.avatarUrl },
    }));
  });
}

export async function sendChatMessage(
  orgId: string,
  listId: string,
  authorId: string,
  body: string,
): Promise<ChatMessage> {
  return withOrg(orgId, async (tx) => {
    const [created] = await tx
      .insert(chatMessages)
      .values({ orgId, listId, authorId, body })
      .returning();
    if (!created) throw new Error("falha ao enviar mensagem");
    const row = await tx.query.chatMessages.findFirst({
      where: eq(chatMessages.id, created.id),
      with: { author: true },
    });
    if (!row) throw new Error("mensagem não encontrada");
    return {
      id: row.id,
      body: row.body,
      createdAt: row.createdAt,
      author: { id: row.author.id, name: row.author.name, avatarUrl: row.author.avatarUrl },
    };
  });
}
