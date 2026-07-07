"use server";

import {
  createAutomation,
  deleteAutomation,
  listAutomations,
  type AutomationActionType,
  type AutomationDTO,
  type AutomationTriggerType,
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
  triggerType: AutomationTriggerType,
  triggerStatusId: string | null,
  actionType: AutomationActionType,
  actionValue: string,
): Promise<boolean> {
  if (!actionValue || (triggerType === "status" && !triggerStatusId)) return false;
  if (!(await assertMember(orgId))) return false;
  await createAutomation(orgId, listId, triggerType, triggerStatusId, actionType, actionValue);
  revalidatePath("/app");
  return true;
}

export async function deleteAutomationAction(orgId: string, id: string): Promise<void> {
  if (!(await assertMember(orgId))) return;
  await deleteAutomation(orgId, id);
  revalidatePath("/app");
}
