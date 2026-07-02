"use server";

import {
  createTask,
  deleteTask,
  getTaskCard,
  saveBoardOrder,
  updateTask,
  type BoardOrderInput,
  type BoardTaskDTO,
} from "@wayline/db";
import { revalidatePath } from "next/cache";
import type { TaskFormInput } from "@/lib/board";

function parseDue(due: string | null): Date | null {
  return due ? new Date(due) : null;
}

/** Persiste a nova ordem/coluna dos cards após um drag-and-drop. */
export async function saveBoard(orgId: string, order: BoardOrderInput[]): Promise<void> {
  await saveBoardOrder(orgId, order);
  revalidatePath("/app");
}

export async function createTaskAction(
  orgId: string,
  input: TaskFormInput,
): Promise<BoardTaskDTO | null> {
  const id = await createTask(orgId, { ...input, dueDate: parseDue(input.dueDate) });
  revalidatePath("/app");
  return getTaskCard(orgId, id);
}

export async function updateTaskAction(
  orgId: string,
  id: string,
  input: TaskFormInput,
): Promise<BoardTaskDTO | null> {
  await updateTask(orgId, { id, ...input, dueDate: parseDue(input.dueDate) });
  revalidatePath("/app");
  return getTaskCard(orgId, id);
}

export async function deleteTaskAction(orgId: string, id: string): Promise<void> {
  await deleteTask(orgId, id);
  revalidatePath("/app");
}
