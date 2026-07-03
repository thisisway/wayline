"use server";

import { searchTasks, type SearchResult } from "@wayline/db";
import { assertMember } from "@/lib/authz";

export async function searchTasksAction(orgId: string, query: string): Promise<SearchResult[]> {
  if (!(await assertMember(orgId))) return [];
  return searchTasks(orgId, query);
}
