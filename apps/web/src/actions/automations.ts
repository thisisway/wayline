"use server";

import {
  createAutomation,
  deleteAutomation,
  listAutomations,
  type AutomationActionType,
  type AutomationDTO,
} from "@wayline/db";
import { revalidatePath } from "next/cache";
import { assertMember } from "@/lib/authz";

export async function listAutomationsAction(
  orgId: string,
  listId: string,
): Promise<AutomationDTO[]> {
  if (!(await assertMember(orgId))) return [];
  return listAutomations(orgId, listId);
}

export async function createAutomationAction(
  orgId: string,
  listId: string,
  triggerStatusId: string,
  actionType: AutomationActionType,
  actionValue: string,
): Promise<boolean> {
  if (!triggerStatusId || !actionValue || !(await assertMember(orgId))) return false;
  await createAutomation(orgId, listId, triggerStatusId, actionType, actionValue);
  revalidatePath("/app");
  return true;
}

export async function deleteAutomationAction(orgId: string, id: string): Promise<void> {
  if (!(await assertMember(orgId))) return;
  await deleteAutomation(orgId, id);
  revalidatePath("/app");
}
