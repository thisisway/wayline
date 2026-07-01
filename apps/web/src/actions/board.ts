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
export async function saveBoard(order: BoardOrderInput[]): Promise<void> {
  await saveBoardOrder(order);
  revalidatePath("/app");
}

export async function createTaskAction(input: TaskFormInput): Promise<BoardTaskDTO | null> {
  const id = await createTask({ ...input, dueDate: parseDue(input.dueDate) });
  revalidatePath("/app");
  return getTaskCard(id);
}

export async function updateTaskAction(
  id: string,
  input: TaskFormInput,
): Promise<BoardTaskDTO | null> {
  await updateTask({ id, ...input, dueDate: parseDue(input.dueDate) });
  revalidatePath("/app");
  return getTaskCard(id);
}

export async function deleteTaskAction(id: string): Promise<void> {
  await deleteTask(id);
  revalidatePath("/app");
}
