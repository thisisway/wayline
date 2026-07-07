"use server";

import {
  addComment,
  applyAutomations,
  assignComment,
  bulkDeleteTasks,
  bulkSetPriority,
  bulkSetStatus,
  createSubtask,
  createTask,
  deleteComment,
  deleteSubtask,
  deleteTask,
  duplicateTask,
  getSubtasks,
  getTaskActivity,
  getTaskCard,
  logCreated,
  logTaskChanges,
  type ActivityDTO,
  getTaskComments,
  notifyMentions,
  notifyReply,
  notifyTaskAssignees,
  saveBoardOrder,
  saveBoardOrderLogged,
  setSubtaskDone,
  setTaskApproval,
  updateTask,
  type BoardOrderInput,
  type BoardTaskDTO,
  type CommentDTO,
  type Subtask,
} from "@wayline/db";
import { revalidatePath } from "next/cache";
import type { TaskFormInput } from "@/lib/board";
import { assertMember, getSessionUser } from "@/lib/authz";
import { emailNotify } from "@/lib/email";

function parseDue(due: string | null): Date | null {
  return due ? new Date(due) : null;
}

function normalize(input: TaskFormInput) {
  const est = parseFloat(input.estimateHours.replace(",", "."));
  return {
    ...input,
    startDate: parseDue(input.startDate),
    dueDate: parseDue(input.dueDate),
    estimateMinutes: Number.isFinite(est) && est > 0 ? Math.round(est * 60) : null,
    description: input.description.trim() || null,
  };
}

/** Persiste a nova ordem/coluna dos cards após um drag-and-drop. */
export async function saveBoard(orgId: string, order: BoardOrderInput[]): Promise<void> {
  if (!(await assertMember(orgId))) return;
  const user = await getSessionUser();
  if (user) {
    const changes = await saveBoardOrderLogged(orgId, order, user.id, user.name);
    for (const c of changes)
      await applyAutomations(orgId, c.taskId, { type: "status", statusId: c.to }).catch(() => {});
  } else {
    await saveBoardOrder(orgId, order);
  }
  revalidatePath("/app");
}

export async function createTaskAction(
  orgId: string,
  input: TaskFormInput,
): Promise<BoardTaskDTO | null> {
  if (!(await assertMember(orgId))) return null;
  const id = await createTask(orgId, normalize(input));
  const user = await getSessionUser();
  if (user) {
    const { recipientIds, taskTitle } = await notifyTaskAssignees(
      orgId,
      id,
      user.id,
      user.name,
      "assigned",
    );
    await emailNotify(recipientIds, {
      subject: `${user.name} atribuiu uma tarefa a você`,
      actorName: user.name,
      action: "atribuiu você a",
      taskTitle,
      taskId: id,
    });
    await logCreated(orgId, id, user.id, user.name);
  }
  revalidatePath("/app");
  return getTaskCard(orgId, id);
}

export async function updateTaskAction(
  orgId: string,
  id: string,
  input: TaskFormInput,
): Promise<BoardTaskDTO | null> {
  if (!(await assertMember(orgId))) return null;
  const before = await getTaskCard(orgId, id);
  await updateTask(orgId, { id, ...normalize(input) });
  let after = await getTaskCard(orgId, id);
  const user = await getSessionUser();
  if (user && before && after) {
    await logTaskChanges(orgId, id, user.id, user.name, before, after);
  }
  // Automações: se a coluna mudou, dispara e recarrega o card.
  if (after && before?.statusId !== after.statusId && after.statusId) {
    const changed = await applyAutomations(orgId, id, {
      type: "status",
      statusId: after.statusId,
    }).catch(() => false);
    if (changed) after = await getTaskCard(orgId, id);
  }
  revalidatePath("/app");
  return after;
}

/** Limpa a aprovação do cliente (após o time endereçar os ajustes). */
export async function clearApprovalAction(
  orgId: string,
  id: string,
): Promise<BoardTaskDTO | null> {
  if (!(await assertMember(orgId))) return null;
  await setTaskApproval(orgId, id, null, null);
  revalidatePath("/app");
  return getTaskCard(orgId, id);
}

/** Recarrega um card (para reconciliar flags derivadas, ex.: bloqueio). */
export async function refreshCardAction(
  orgId: string,
  id: string,
): Promise<BoardTaskDTO | null> {
  if (!(await assertMember(orgId))) return null;
  return getTaskCard(orgId, id);
}

export async function deleteTaskAction(orgId: string, id: string): Promise<void> {
  if (!(await assertMember(orgId))) return;
  await deleteTask(orgId, id);
  revalidatePath("/app");
}

// --- Ações em massa (List view) --------------------------------------------
export async function bulkStatusAction(
  orgId: string,
  ids: string[],
  statusId: string,
): Promise<void> {
  if (!statusId || !(await assertMember(orgId))) return;
  await bulkSetStatus(orgId, ids, statusId);
  revalidatePath("/app");
}

export async function bulkPriorityAction(
  orgId: string,
  ids: string[],
  priority: "urgent" | "high" | "normal" | "low",
): Promise<void> {
  if (!(await assertMember(orgId))) return;
  await bulkSetPriority(orgId, ids, priority);
  revalidatePath("/app");
}

export async function bulkDeleteAction(orgId: string, ids: string[]): Promise<void> {
  if (!(await assertMember(orgId))) return;
  await bulkDeleteTasks(orgId, ids);
  revalidatePath("/app");
}

export async function duplicateTaskAction(
  orgId: string,
  id: string,
): Promise<BoardTaskDTO | null> {
  if (!(await assertMember(orgId))) return null;
  const newId = await duplicateTask(orgId, id);
  revalidatePath("/app");
  return getTaskCard(orgId, newId);
}

// --- Comentários -----------------------------------------------------------
export async function listCommentsAction(orgId: string, taskId: string): Promise<CommentDTO[]> {
  if (!(await assertMember(orgId))) return [];
  return getTaskComments(orgId, taskId);
}

export async function addCommentAction(
  orgId: string,
  taskId: string,
  body: string,
  parentId?: string | null,
  mentionIds?: string[],
): Promise<CommentDTO | null> {
  if (!(await assertMember(orgId))) return null;
  // Autor SEMPRE é o usuário da sessão (não confiar no cliente).
  const user = await getSessionUser();
  if (!user) return null;
  const created = await addComment(orgId, { taskId, authorId: user.id, body, parentId });
  const mentioned = new Set(mentionIds ?? []);

  if (parentId) {
    const { recipientIds, taskTitle } = await notifyReply(orgId, parentId, user.id, user.name);
    await emailNotify(
      recipientIds.filter((id) => !mentioned.has(id)),
      {
        subject: `${user.name} respondeu seu comentário`,
        actorName: user.name,
        action: "respondeu seu comentário em",
        taskTitle,
        taskId,
      },
    );
  } else {
    const { recipientIds, taskTitle } = await notifyTaskAssignees(
      orgId,
      taskId,
      user.id,
      user.name,
      "comment",
    );
    await emailNotify(
      recipientIds.filter((id) => !mentioned.has(id)),
      {
        subject: `${user.name} comentou em ${taskTitle}`,
        actorName: user.name,
        action: "comentou em",
        taskTitle,
        taskId,
      },
    );
  }

  if (mentionIds?.length) {
    const { recipientIds, taskTitle } = await notifyMentions(
      orgId,
      taskId,
      user.id,
      user.name,
      mentionIds,
    );
    await emailNotify(recipientIds, {
      subject: `${user.name} mencionou você no Wayline`,
      actorName: user.name,
      action: "mencionou você em",
      taskTitle,
      taskId,
    });
  }
  revalidatePath("/app");
  return created;
}

export async function listActivityAction(
  orgId: string,
  taskId: string,
): Promise<ActivityDTO[]> {
  if (!(await assertMember(orgId))) return [];
  return getTaskActivity(orgId, taskId);
}

export async function deleteCommentAction(orgId: string, id: string): Promise<void> {
  if (!(await assertMember(orgId))) return;
  await deleteComment(orgId, id);
  revalidatePath("/app");
}

export async function assignCommentAction(
  orgId: string,
  commentId: string,
  assigneeId: string | null,
): Promise<void> {
  if (!(await assertMember(orgId))) return;
  const user = await getSessionUser();
  if (!user) return;
  await assignComment(orgId, commentId, assigneeId, user.id, user.name);
  revalidatePath("/app");
}

// --- Subtarefas ------------------------------------------------------------
export async function listSubtasksAction(orgId: string, parentId: string): Promise<Subtask[]> {
  if (!(await assertMember(orgId))) return [];
  return getSubtasks(orgId, parentId);
}

export async function addSubtaskAction(
  orgId: string,
  parentId: string,
  title: string,
): Promise<Subtask | null> {
  if (!title.trim() || !(await assertMember(orgId))) return null;
  const created = await createSubtask(orgId, parentId, title);
  revalidatePath("/app");
  return created;
}

export async function toggleSubtaskAction(
  orgId: string,
  id: string,
  completed: boolean,
): Promise<void> {
  if (!(await assertMember(orgId))) return;
  await setSubtaskDone(orgId, id, completed);
  revalidatePath("/app");
}

export async function deleteSubtaskAction(orgId: string, id: string): Promise<void> {
  if (!(await assertMember(orgId))) return;
  await deleteSubtask(orgId, id);
  revalidatePath("/app");
}
