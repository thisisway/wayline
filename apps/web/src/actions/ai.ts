"use server";

import { createSubtask, getBoardForOrg, getTaskCard, type Subtask } from "@wayline/db";
import { revalidatePath } from "next/cache";
import { assertMember } from "@/lib/authz";
import { aiEnabled, suggestSubtasks, summarizeBoard, writeDescription } from "@/lib/ai";

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

/** Insights executivos do board (lista atual) via IA. */
export async function boardInsightsAction(orgId: string, listId: string): Promise<string[]> {
  if (!aiEnabled() || !(await assertMember(orgId))) return [];
  const board = await getBoardForOrg(orgId, null, listId);
  if (!board) return [];
  const now = Date.now();
  const lines: string[] = [];
  for (const col of board.columns) {
    for (const t of col.tasks) {
      const overdue = t.dueDate && !t.completed && new Date(t.dueDate).getTime() < now;
      const due = t.dueDate
        ? ` (prazo ${new Date(t.dueDate).toLocaleDateString("pt-BR")}${overdue ? ", ATRASADA" : ""})`
        : "";
      lines.push(`[${col.name}] ${t.title}${due}`);
    }
  }
  return summarizeBoard(lines);
}
