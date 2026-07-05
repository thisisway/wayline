import { and, desc, eq, isNull } from "drizzle-orm";
import { withOrg } from "../client";
import { notifications, tasks } from "../schema";

export interface NotificationDTO {
  id: string;
  type: string;
  taskId: string | null;
  listId: string | null;
  taskTitle: string;
  actorName: string;
  createdAt: Date;
  read: boolean;
}

/** Cria notificações para os responsáveis da tarefa (exceto o autor da ação). */
export async function notifyTaskAssignees(
  orgId: string,
  taskId: string,
  actorId: string,
  actorName: string,
  type: "comment" | "assigned",
): Promise<void> {
  await withOrg(orgId, async (tx) => {
    const task = await tx.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
      with: { assignees: true },
    });
    if (!task) return;
    const recipients = task.assignees
      .map((a) => a.userId)
      .filter((uid) => uid !== actorId);
    if (recipients.length === 0) return;

    await tx.insert(notifications).values(
      recipients.map((userId) => ({
        orgId,
        userId,
        type,
        taskId,
        listId: task.listId,
        taskTitle: task.title,
        actorName,
      })),
    );
  });
}

/** Notifica assignees específicos (ex.: recém-atribuídos ao criar a tarefa). */
export async function notifyAssigned(
  orgId: string,
  taskId: string,
  listId: string,
  taskTitle: string,
  actorId: string,
  actorName: string,
  assigneeIds: string[],
): Promise<void> {
  const recipients = assigneeIds.filter((id) => id !== actorId);
  if (recipients.length === 0) return;
  await withOrg(orgId, async (tx) => {
    await tx.insert(notifications).values(
      recipients.map((userId) => ({
        orgId,
        userId,
        type: "assigned",
        taskId,
        listId,
        taskTitle,
        actorName,
      })),
    );
  });
}

/**
 * Notifica usuários @mencionados num comentário (exceto o autor).
 * Retorna os destinatários efetivos e o título da tarefa (para email).
 */
export async function notifyMentions(
  orgId: string,
  taskId: string,
  actorId: string,
  actorName: string,
  mentionedIds: string[],
): Promise<{ recipientIds: string[]; taskTitle: string }> {
  const recipients = [...new Set(mentionedIds)].filter((id) => id !== actorId);
  if (recipients.length === 0) return { recipientIds: [], taskTitle: "" };
  return withOrg(orgId, async (tx) => {
    const task = await tx.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
    if (!task) return { recipientIds: [], taskTitle: "" };
    await tx.insert(notifications).values(
      recipients.map((userId) => ({
        orgId,
        userId,
        type: "mention",
        taskId,
        listId: task.listId,
        taskTitle: task.title,
        actorName,
      })),
    );
    return { recipientIds: recipients, taskTitle: task.title };
  });
}

export async function getNotifications(
  orgId: string,
  userId: string,
): Promise<{ items: NotificationDTO[]; unread: number }> {
  return withOrg(orgId, async (tx) => {
    const rows = await tx.query.notifications.findMany({
      where: eq(notifications.userId, userId),
      orderBy: [desc(notifications.createdAt)],
      limit: 50,
    });
    const items: NotificationDTO[] = rows.map((r) => ({
      id: r.id,
      type: r.type,
      taskId: r.taskId,
      listId: r.listId,
      taskTitle: r.taskTitle,
      actorName: r.actorName,
      createdAt: r.createdAt,
      read: r.readAt !== null,
    }));
    return { items, unread: items.filter((i) => !i.read).length };
  });
}

export async function markNotificationsRead(orgId: string, userId: string): Promise<void> {
  await withOrg(orgId, async (tx) => {
    await tx
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  });
}
