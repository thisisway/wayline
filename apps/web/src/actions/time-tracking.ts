"use server";

import {
  addManualEntry,
  deleteTimeEntry,
  getRunningTimer,
  getTaskTimeEntries,
  startTimer,
  stopTimer,
  type RunningTimer,
  type TimeEntryDTO,
} from "@wayline/db";
import { revalidatePath } from "next/cache";
import { assertMember, getSessionUserId } from "@/lib/authz";

export async function listTimeEntriesAction(
  orgId: string,
  taskId: string,
): Promise<TimeEntryDTO[]> {
  if (!(await assertMember(orgId))) return [];
  return getTaskTimeEntries(orgId, taskId);
}

export async function runningTimerAction(orgId: string): Promise<RunningTimer | null> {
  if (!(await assertMember(orgId))) return null;
  const userId = await getSessionUserId();
  if (!userId) return null;
  return getRunningTimer(orgId, userId);
}

export async function startTimerAction(
  orgId: string,
  taskId: string,
): Promise<TimeEntryDTO | null> {
  if (!(await assertMember(orgId))) return null;
  const userId = await getSessionUserId();
  if (!userId) return null;
  const entry = await startTimer(orgId, taskId, userId);
  revalidatePath("/app");
  return entry;
}

export async function stopTimerAction(
  orgId: string,
  entryId: string,
): Promise<TimeEntryDTO | null> {
  if (!(await assertMember(orgId))) return null;
  const entry = await stopTimer(orgId, entryId);
  revalidatePath("/app");
  return entry;
}

export async function addManualEntryAction(
  orgId: string,
  taskId: string,
  seconds: number,
  note: string | null,
): Promise<TimeEntryDTO | null> {
  if (!(await assertMember(orgId))) return null;
  const userId = await getSessionUserId();
  if (!userId || seconds <= 0) return null;
  const entry = await addManualEntry(orgId, taskId, userId, seconds, note?.trim() || null);
  revalidatePath("/app");
  return entry;
}

export async function deleteTimeEntryAction(orgId: string, entryId: string): Promise<void> {
  if (!(await assertMember(orgId))) return;
  await deleteTimeEntry(orgId, entryId);
  revalidatePath("/app");
}
