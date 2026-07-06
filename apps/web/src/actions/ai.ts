"use server";

import { createSubtask, getTaskCard, type Subtask } from "@wayline/db";
import { revalidatePath } from "next/cache";
import { assertMember } from "@/lib/authz";
import { aiEnabled, suggestSubtasks, writeDescription } from "@/lib/ai";

export async function aiEnabledAction(): Promise<boolean> {
  return aiEnabled();
}

/** Gera/melhora a descrição a partir do título (funciona em criar e editar). */
export async function writeDescriptionAction(
  orgId: string,
  title: string,
  description: string,
): Promise<string | null> {
  if (!aiEnabled() || !title.trim() || !(await assertMember(orgId))) return null;
  return writeDescription(title.trim(), description);
}

/** Gera subtarefas com IA e as cria na tarefa. Retorna as subtarefas criadas. */
export async function suggestSubtasksAction(
  orgId: string,
  taskId: string,
): Promise<Subtask[]> {
  if (!aiEnabled() || !(await assertMember(orgId))) return [];
  const task = await getTaskCard(orgId, taskId);
  if (!task) return [];

  const titles = await suggestSubtasks(task.title, task.description);
  if (titles.length === 0) return [];

  const created: Subtask[] = [];
  for (const title of titles) {
    const sub = await createSubtask(orgId, taskId, title).catch(() => null);
    if (sub) created.push(sub);
  }
  revalidatePath("/app");
  return created;
}
