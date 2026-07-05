import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { withOrg } from "../client";
import { comments, notifications } from "../schema";

export interface CommentAuthor {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface CommentDTO {
  id: string;
  body: string;
  createdAt: Date;
  parentId: string | null;
  author: CommentAuthor;
  assignedTo: CommentAuthor | null;
}

export interface AddCommentInput {
  taskId: string;
  authorId: string;
  body: string;
  parentId?: string | null;
}

type CommentRow = {
  id: string;
  body: string;
  createdAt: Date;
  parentId: string | null;
  author: CommentAuthor;
  assignee: CommentAuthor | null;
};

function toCommentDTO(row: CommentRow): CommentDTO {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.createdAt,
    parentId: row.parentId,
    author: { id: row.author.id, name: row.author.name, avatarUrl: row.author.avatarUrl },
    assignedTo: row.assignee
      ? { id: row.assignee.id, name: row.assignee.name, avatarUrl: row.assignee.avatarUrl }
      : null,
  };
}

/** Comentários de uma tarefa (mais antigos primeiro). */
export async function getTaskComments(orgId: string, taskId: string): Promise<CommentDTO[]> {
  return withOrg(orgId, async (tx) => {
    const rows = await tx.query.comments.findMany({
      where: and(eq(comments.taskId, taskId), isNull(comments.deletedAt)),
      orderBy: [asc(comments.createdAt)],
      with: { author: true, assignee: true },
    });
    return rows.map(toCommentDTO);
  });
}

export async function addComment(orgId: string, input: AddCommentInput): Promise<CommentDTO> {
  return withOrg(orgId, async (tx) => {
    const [created] = await tx
      .insert(comments)
      .values({
        orgId,
        taskId: input.taskId,
        authorId: input.authorId,
        body: input.body,
        parentId: input.parentId ?? null,
      })
      .returning();
    if (!created) throw new Error("falha ao criar comentário");
    const row = await tx.query.comments.findFirst({
      where: eq(comments.id, created.id),
      with: { author: true, assignee: true },
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

/** Atribui (ou desatribui) um comentário; notifica o novo responsável. */
export async function assignComment(
  orgId: string,
  commentId: string,
  assigneeId: string | null,
  actorId: string,
  actorName: string,
): Promise<void> {
  await withOrg(orgId, async (tx) => {
    await tx
      .update(comments)
      .set({ assignedTo: assigneeId, updatedAt: new Date() })
      .where(eq(comments.id, commentId));

    if (assigneeId && assigneeId !== actorId) {
      const c = await tx.query.comments.findFirst({
        where: eq(comments.id, commentId),
        with: { task: true },
      });
      if (c?.task) {
        await tx.insert(notifications).values({
          orgId,
          userId: assigneeId,
          type: "assigned_comment",
          taskId: c.taskId,
          listId: c.task.listId,
          taskTitle: c.task.title,
          actorName,
        });
      }
    }
  });
}

/** Notifica o autor do comentário-pai sobre uma resposta. */
export async function notifyReply(
  orgId: string,
  parentId: string,
  actorId: string,
  actorName: string,
): Promise<{ recipientIds: string[]; taskTitle: string }> {
  return withOrg(orgId, async (tx) => {
    const parent = await tx.query.comments.findFirst({
      where: eq(comments.id, parentId),
      with: { task: true },
    });
    if (!parent || parent.authorId === actorId || !parent.task) {
      return { recipientIds: [], taskTitle: "" };
    }
    await tx.insert(notifications).values({
      orgId,
      userId: parent.authorId,
      type: "reply",
      taskId: parent.taskId,
      listId: parent.task.listId,
      taskTitle: parent.task.title,
      actorName,
    });
    return { recipientIds: [parent.authorId], taskTitle: parent.task.title };
  });
}

export interface ReplyDTO {
  id: string;
  body: string;
  taskId: string;
  listId: string | null;
  taskTitle: string;
  authorName: string;
  createdAt: Date;
}

/** Respostas aos comentários que o usuário escreveu (sidebar Replies). */
export async function getMyReplies(orgId: string, userId: string): Promise<ReplyDTO[]> {
  return withOrg(orgId, async (tx) => {
    const mine = await tx.query.comments.findMany({
      where: and(eq(comments.authorId, userId), isNull(comments.deletedAt)),
      columns: { id: true },
    });
    const ids = mine.map((c) => c.id);
    if (ids.length === 0) return [];

    const rows = await tx.query.comments.findMany({
      where: and(inArray(comments.parentId, ids), isNull(comments.deletedAt)),
      orderBy: [desc(comments.createdAt)],
      limit: 50,
      with: { author: true, task: true },
    });
    return rows.map((c) => ({
      id: c.id,
      body: c.body,
      taskId: c.taskId,
      listId: c.task?.listId ?? null,
      taskTitle: c.task?.title ?? "—",
      authorName: c.author?.name ?? "—",
      createdAt: c.createdAt,
    }));
  });
}

export interface AssignedComment {
  id: string;
  body: string;
  taskId: string;
  listId: string | null;
  taskTitle: string;
  authorName: string;
  createdAt: Date;
}

/** Comentários atribuídos ao usuário na org (para o drawer). */
export async function getAssignedComments(orgId: string, userId: string): Promise<AssignedComment[]> {
  return withOrg(orgId, async (tx) => {
    const rows = await tx.query.comments.findMany({
      where: and(eq(comments.assignedTo, userId), isNull(comments.deletedAt)),
      orderBy: [desc(comments.createdAt)],
      limit: 50,
      with: { author: true, task: true },
    });
    return rows.map((c) => ({
      id: c.id,
      body: c.body,
      taskId: c.taskId,
      listId: c.task?.listId ?? null,
      taskTitle: c.task?.title ?? "—",
      authorName: c.author?.name ?? "—",
      createdAt: c.createdAt,
    }));
  });
}
