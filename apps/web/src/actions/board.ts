"use server";

import {
  addComment,
  createTask,
  deleteComment,
  deleteTask,
  getTaskCard,
  getTaskComments,
  saveBoardOrder,
  updateTask,
  type BoardOrderInput,
  type BoardTaskDTO,
  type CommentDTO,
} from "@wayline/db";
import { revalidatePath } from "next/cache";
import type { TaskFormInput } from "@/lib/board";
import { assertMember, getSessionUserId } from "@/lib/authz";

function parseDue(due: string | null): Date | null {
  return due ? new Date(due) : null;
}

/** Persiste a nova ordem/coluna dos cards após um drag-and-drop. */
export async function saveBoard(orgId: string, order: BoardOrderInput[]): Promise<void> {
  if (!(await assertMember(orgId))) return;
  await saveBoardOrder(orgId, order);
  revalidatePath("/app");
}

export async function createTaskAction(
  orgId: string,
  input: TaskFormInput,
): Promise<BoardTaskDTO | null> {
  if (!(await assertMember(orgId))) return null;
  const id = await createTask(orgId, { ...input, dueDate: parseDue(input.dueDate) });
  revalidatePath("/app");
  return getTaskCard(orgId, id);
}

export async function updateTaskAction(
  orgId: string,
  id: string,
  input: TaskFormInput,
): Promise<BoardTaskDTO | null> {
  if (!(await assertMember(orgId))) return null;
  await updateTask(orgId, { id, ...input, dueDate: parseDue(input.dueDate) });
  revalidatePath("/app");
  return getTaskCard(orgId, id);
}

export async function deleteTaskAction(orgId: string, id: string): Promise<void> {
  if (!(await assertMember(orgId))) return;
  await deleteTask(orgId, id);
  revalidatePath("/app");
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
): Promise<CommentDTO | null> {
  if (!(await assertMember(orgId))) return null;
  // Autor SEMPRE é o usuário da sessão (não confiar no cliente).
  const authorId = await getSessionUserId();
  if (!authorId) return null;
  const created = await addComment(orgId, { taskId, authorId, body });
  revalidatePath("/app");
  return created;
}

export async function deleteCommentAction(orgId: string, id: string): Promise<void> {
  if (!(await assertMember(orgId))) return;
  await deleteComment(orgId, id);
  revalidatePath("/app");
}
