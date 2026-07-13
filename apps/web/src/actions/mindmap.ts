"use server";

import { getListMindMap, type ListMindMap } from "@wayline/db";
import { assertMember } from "@/lib/authz";

export async function listMindMapAction(
  orgId: string,
  listId: string,
): Promise<ListMindMap | null> {
  if (!(await assertMember(orgId))) return null;
  return getListMindMap(orgId, listId);
}
