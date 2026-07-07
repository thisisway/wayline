"use server";

import { getBoardForOrg, getListDoc, upsertListDoc, type DocDTO } from "@wayline/db";
import { revalidatePath } from "next/cache";
import { assertMember } from "@/lib/authz";
import { aiEnabled, generateBrief } from "@/lib/ai";

export async function getDocAction(orgId: string, listId: string): Promise<DocDTO | null> {
  if (!(await assertMember(orgId))) return null;
  return getListDoc(orgId, listId);
}

export async function saveDocAction(
  orgId: string,
  listId: string,
  title: string,
  content: string,
): Promise<DocDTO | null> {
  if (!(await assertMember(orgId))) return null;
  const doc = await upsertListDoc(orgId, listId, title, content);
  revalidatePath("/app");
  return doc;
}

/** Gera um brief via IA a partir das tarefas da lista (não salva; devolve o texto). */
export async function generateBriefAction(
  orgId: string,
  listId: string,
): Promise<string | null> {
  if (!aiEnabled() || !(await assertMember(orgId))) return null;
  const board = await getBoardForOrg(orgId, null, listId);
  if (!board) return null;
  const titles = board.columns.flatMap((c) => c.tasks.map((t) => t.title)).slice(0, 40);
  return generateBrief(board.listName, titles);
}
