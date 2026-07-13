"use server";

import {
  createPage,
  createTask,
  deletePage,
  getPage,
  listPages,
  movePage,
  renamePage,
  savePageContent,
  type PageDoc,
  type PageNode,
} from "@wayline/db";
import { revalidatePath } from "next/cache";
import { assertMember, getSessionUserId } from "@/lib/authz";

export async function listPagesAction(orgId: string): Promise<PageNode[]> {
  const uid = await getSessionUserId();
  if (!uid || !(await assertMember(orgId))) return [];
  return listPages(orgId, uid);
}

export async function getPageAction(orgId: string, pageId: string): Promise<PageDoc | null> {
  const uid = await getSessionUserId();
  if (!uid || !(await assertMember(orgId))) return null;
  return getPage(orgId, uid, pageId);
}

export async function createPageAction(
  orgId: string,
  opts: { parentId?: string | null; personal?: boolean; title?: string },
): Promise<PageNode | null> {
  const uid = await getSessionUserId();
  if (!uid || !(await assertMember(orgId))) return null;
  const page = await createPage(orgId, uid, opts);
  revalidatePath("/app");
  return page;
}

export async function renamePageAction(
  orgId: string,
  pageId: string,
  title: string,
  icon?: string | null,
): Promise<void> {
  const uid = await getSessionUserId();
  if (!uid || !(await assertMember(orgId))) return;
  await renamePage(orgId, uid, pageId, title, icon);
  revalidatePath("/app");
}

export async function savePageContentAction(
  orgId: string,
  pageId: string,
  content: string,
): Promise<string | null> {
  const uid = await getSessionUserId();
  if (!uid || !(await assertMember(orgId))) return null;
  const at = await savePageContent(orgId, uid, pageId, content);
  return at ? at.toISOString() : null;
}

export async function movePageAction(
  orgId: string,
  pageId: string,
  parentId: string | null,
): Promise<void> {
  const uid = await getSessionUserId();
  if (!uid || !(await assertMember(orgId))) return;
  await movePage(orgId, uid, pageId, parentId);
  revalidatePath("/app");
}

export async function deletePageAction(orgId: string, pageId: string): Promise<void> {
  const uid = await getSessionUserId();
  if (!uid || !(await assertMember(orgId))) return;
  await deletePage(orgId, uid, pageId);
  revalidatePath("/app");
}

/** Notepad: transforma uma página numa tarefa na coluna informada. */
export async function convertPageToTaskAction(
  orgId: string,
  pageId: string,
  statusId: string,
): Promise<boolean> {
  const uid = await getSessionUserId();
  if (!uid || !statusId || !(await assertMember(orgId))) return false;
  const page = await getPage(orgId, uid, pageId);
  if (!page) return false;
  const description = page.content
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  await createTask(orgId, {
    statusId,
    title: page.title.trim() || "Sem título",
    description: description || null,
    priority: "normal",
    clientId: null,
    startDate: null,
    dueDate: null,
    estimateMinutes: null,
    recurrence: null,
    assigneeIds: [],
    tags: [],
  });
  revalidatePath("/app");
  return true;
}
