"use server";

import { getListMindMap, type ListMindMap } from "@wayline/db";
import { assertMember } from "@/lib/authz";
import { planAllows } from "@/lib/plan-guard";

export async function listMindMapAction(
  orgId: string,
  listId: string,
): Promise<ListMindMap | null> {
  if (!(await assertMember(orgId))) return null;
  if (!(await planAllows(orgId, "mindmap"))) return null;
  return getListMindMap(orgId, listId);
}
