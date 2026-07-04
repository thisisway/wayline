"use server";

import {
  addDependency,
  getTaskDependencies,
  getTaskOptions,
  removeDependency,
  type AddDependencyResult,
  type TaskDependencies,
  type TaskOption,
} from "@wayline/db";
import { revalidatePath } from "next/cache";
import { assertMember } from "@/lib/authz";

export async function listDependenciesAction(
  orgId: string,
  taskId: string,
): Promise<TaskDependencies> {
  if (!(await assertMember(orgId))) return { blockedBy: [], blocks: [] };
  return getTaskDependencies(orgId, taskId);
}

export async function taskOptionsAction(orgId: string, taskId: string): Promise<TaskOption[]> {
  if (!(await assertMember(orgId))) return [];
  return getTaskOptions(orgId, taskId);
}

/** Adiciona "blockerId bloqueia esta tarefa" (esta fica bloqueada por blockerId). */
export async function addBlockedByAction(
  orgId: string,
  taskId: string,
  blockerId: string,
): Promise<AddDependencyResult> {
  if (!(await assertMember(orgId))) return { ok: false, error: "Sem permissão." };
  const res = await addDependency(orgId, blockerId, taskId);
  if (res.ok) revalidatePath("/app");
  return res;
}

/** Adiciona "esta tarefa bloqueia blockedId". */
export async function addBlocksAction(
  orgId: string,
  taskId: string,
  blockedId: string,
): Promise<AddDependencyResult> {
  if (!(await assertMember(orgId))) return { ok: false, error: "Sem permissão." };
  const res = await addDependency(orgId, taskId, blockedId);
  if (res.ok) revalidatePath("/app");
  return res;
}

export async function removeDependencyAction(orgId: string, depId: string): Promise<void> {
  if (!(await assertMember(orgId))) return;
  await removeDependency(orgId, depId);
  revalidatePath("/app");
}
