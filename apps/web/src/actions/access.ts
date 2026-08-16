"use server";

import {
  createAccessEntry,
  deleteAccessEntry,
  listAccessEntries,
  updateAccessEntry,
  type AccessEntryDTO,
  type AccessEntryInput,
} from "@wayline/db";
import { assertMember, assertRole } from "@/lib/authz";

export async function listAccessEntriesAction(
  orgId: string,
  spaceId: string,
): Promise<AccessEntryDTO[]> {
  if (!(await assertMember(orgId))) return [];
  return listAccessEntries(orgId, spaceId);
}

export async function createAccessEntryAction(
  orgId: string,
  spaceId: string,
  input: AccessEntryInput,
): Promise<AccessEntryDTO | null> {
  if (!(await assertRole(orgId, "admin"))) return null;
  return createAccessEntry(orgId, spaceId, input);
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
