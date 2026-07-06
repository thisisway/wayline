"use server";

import {
  addPublicComment,
  getPublicComments,
  notifyApproval,
  notifyTaskAssignees,
  resolveShareTask,
  setTaskApproval,
  type PublicCommentDTO,
} from "@wayline/db";
import { pokeList } from "@/actions/live";

const MAX_BODY = 2000;

export async function listPublicCommentsAction(
  token: string,
  taskId: string,
): Promise<PublicCommentDTO[]> {
  const share = await resolveShareTask(token, taskId);
  if (!share) return [];
  return getPublicComments(share.orgId, taskId);
}

export async function addPublicCommentAction(
  token: string,
  taskId: string,
  name: string,
  body: string,
): Promise<PublicCommentDTO | null> {
  const text = body.trim().slice(0, MAX_BODY);
  const who = name.trim().slice(0, 60);
  if (!text || !who) return null;
  const share = await resolveShareTask(token, taskId);
  if (!share) return null;

  const created = await addPublicComment(share.orgId, taskId, who, text);
  // Avisa o time (inbox) e atualiza boards abertos ao vivo.
  await notifyTaskAssignees(share.orgId, taskId, "", `${who} (cliente)`, "comment").catch(
    () => {},
  );
  await pokeList(share.listId).catch(() => {});
  return created;
}

export async function setPublicApprovalAction(
  token: string,
  taskId: string,
  status: "approved" | "changes",
  name: string,
): Promise<boolean> {
  const who = name.trim().slice(0, 60);
  if (!who) return false;
  const share = await resolveShareTask(token, taskId);
  if (!share) return false;

  await setTaskApproval(share.orgId, taskId, status, who);
  await notifyApproval(share.orgId, taskId, `${who} (cliente)`, status === "approved").catch(
    () => {},
  );
  await pokeList(share.listId).catch(() => {});
  return true;
}
