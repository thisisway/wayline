import { and, asc, eq, isNull } from "drizzle-orm";
import { withOrg } from "../client";
import { comments } from "../schema";

export interface CommentDTO {
  id: string;
  body: string;
  createdAt: Date;
  author: { id: string; name: string; avatarUrl: string | null };
}

export interface AddCommentInput {
  taskId: string;
  authorId: string;
  body: string;
}

function toCommentDTO(row: {
  id: string;
  body: string;
  createdAt: Date;
  author: { id: string; name: string; avatarUrl: string | null };
}): CommentDTO {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.createdAt,
    author: { id: row.author.id, name: row.author.name, avatarUrl: row.author.avatarUrl },
  };
}

/** Comentários de uma tarefa (mais antigos primeiro). */
export async function getTaskComments(orgId: string, taskId: string): Promise<CommentDTO[]> {
  return withOrg(orgId, async (tx) => {
    const rows = await tx.query.comments.findMany({
      where: and(eq(comments.taskId, taskId), isNull(comments.deletedAt)),
      orderBy: [asc(comments.createdAt)],
      with: { author: true },
    });
    return rows.map(toCommentDTO);
  });
}

export async function addComment(orgId: string, input: AddCommentInput): Promise<CommentDTO> {
  return withOrg(orgId, async (tx) => {
    const [created] = await tx
      .insert(comments)
      .values({ orgId, taskId: input.taskId, authorId: input.authorId, body: input.body })
      .returning();
    if (!created) throw new Error("falha ao criar comentário");
    const row = await tx.query.comments.findFirst({
      where: eq(comments.id, created.id),
      with: { author: true },
    });
    if (!row) throw new Error("comentário não encontrado após criação");
    return toCommentDTO(row);
  });
}

/** Soft delete de comentário. */
export async function deleteComment(orgId: string, id: string): Promise<void> {
  await withOrg(orgId, async (tx) => {
    await tx
      .update(comments)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(comments.id, id));
  });
}
