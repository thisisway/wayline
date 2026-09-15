"use server";

import {
  createAccessEntry,
  createAccessTable,
  deleteAccessEntry,
  deleteAccessTable,
  listAccessEntries,
  moveAccessTable,
  renameAccessTable,
  reorderAccessEntries,
  updateAccessEntry,
  type AccessEntryDTO,
  type AccessEntryInput,
} from "@wayline/db";
import { revalidatePath } from "next/cache";
import { assertMember, assertRole } from "@/lib/authz";

export async function listAccessEntriesAction(
  orgId: string,
  tableId: string,
): Promise<AccessEntryDTO[]> {
  if (!(await assertMember(orgId))) return [];
  return listAccessEntries(orgId, tableId);
}

export async function createAccessEntryAction(
  orgId: string,
  tableId: string,
  input: AccessEntryInput,
): Promise<AccessEntryDTO | null> {
  if (!(await assertRole(orgId, "admin"))) return null;
  return createAccessEntry(orgId, tableId, input);
}

// --- Cofres (access_tables) ------------------------------------------------

export async function createAccessTableAction(
  orgId: string,
  spaceId: string,
  folderId: string | null = null,
): Promise<string | null> {
  if (!(await assertRole(orgId, "admin"))) return null;
  const id = await createAccessTable(orgId, spaceId, folderId);
  revalidatePath("/app");
  return id;
}

export async function renameAccessTableAction(
  orgId: string,
  id: string,
  name: string,
): Promise<void> {
  if (!name.trim() || !(await assertRole(orgId, "admin"))) return;
  await renameAccessTable(orgId, id, name);
  revalidatePath("/app");
}

export async function deleteAccessTableAction(orgId: string, id: string): Promise<void> {
  if (!(await assertRole(orgId, "admin"))) return;
  await deleteAccessTable(orgId, id);
  revalidatePath("/app");
}

export async function moveAccessTableAction(
  orgId: string,
  id: string,
  spaceId: string,
  folderId: string | null,
): Promise<void> {
  if (!(await assertRole(orgId, "admin"))) return;
  await moveAccessTable(orgId, id, spaceId, folderId);
  revalidatePath("/app");
}

export async function updateAccessEntryAction(
  orgId: string,
  id: string,
  input: AccessEntryInput,
): Promise<void> {
  if (!(await assertRole(orgId, "admin"))) return;
  await updateAccessEntry(orgId, id, input);
}

export async function deleteAccessEntryAction(orgId: string, id: string): Promise<void> {
  if (!(await assertRole(orgId, "admin"))) return;
  await deleteAccessEntry(orgId, id);
}

export async function reorderAccessEntriesAction(orgId: string, ids: string[]): Promise<void> {
  if (!(await assertRole(orgId, "admin"))) return;
  await reorderAccessEntries(orgId, ids);
}
