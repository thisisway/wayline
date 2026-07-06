"use server";

import { getActiveShare, getOrCreateShare, revokeShares } from "@wayline/db";
import { assertMember, getSessionUserId } from "@/lib/authz";

export async function getShareAction(orgId: string, listId: string): Promise<string | null> {
  if (!(await assertMember(orgId))) return null;
  return getActiveShare(orgId, listId);
}

export async function createShareAction(orgId: string, listId: string): Promise<string | null> {
  if (!(await assertMember(orgId))) return null;
  const userId = await getSessionUserId();
  return getOrCreateShare(orgId, listId, userId);
}

export async function revokeShareAction(orgId: string, listId: string): Promise<void> {
  if (!(await assertMember(orgId))) return;
  await revokeShares(orgId, listId);
}
