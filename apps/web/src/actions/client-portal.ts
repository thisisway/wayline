"use server";

import {
  addAnnotation,
  addPublicComment,
  getAttachmentForTask,
  getClientPortal,
  getOrCreateClientPortal,
  getPublicComments,
  getTaskAttachments,
  listAnnotations,
  notifyApproval,
  notifyTaskAssignees,
  resolvePortalToken,
  revokeClientPortal,
  setTaskApproval,
  taskBelongsToClient,
  type AnnotationDTO,
  type ClientPortal,
  type PublicCommentDTO,
} from "@wayline/db";
import { assertMember } from "@/lib/authz";
import { rateLimit, MIN } from "@/lib/rate-limit";
import { presignGetInline, storageEnabled } from "@/lib/storage";

/** Agência: gera/reusa o link do portal de um cliente. Retorna o token. */
export async function clientPortalLinkAction(
  orgId: string,
  clientId: string,
): Promise<string | null> {
  if (!(await assertMember(orgId))) return null;
  return getOrCreateClientPortal(orgId, clientId);
}

/** Agência: revoga o link do portal de um cliente. */
export async function revokeClientPortalAction(orgId: string, clientId: string): Promise<boolean> {
  if (!(await assertMember(orgId))) return false;
  await revokeClientPortal(orgId, clientId);
  return true;
}

/** Público: conteúdo do portal pelo token (sem sessão). */
export async function getClientPortalAction(token: string): Promise<ClientPortal | null> {
  if (!token) return null;
  return getClientPortal(token);
}

/** Público: cliente aprova / pede ajustes numa entrega. */
export async function portalApproveAction(
  token: string,
  taskId: string,
  status: "approved" | "changes",
  name: string,
): Promise<boolean> {
  const who = name.trim();
  if (!token || !taskId || !who || (status !== "approved" && status !== "changes")) return false;
  if (!(await rateLimit("portal-approve", 20, MIN))) return false;
  const ref = await resolvePortalToken(token);
  if (!ref) return false;
  if (!(await taskBelongsToClient(ref.orgId, taskId, ref.clientId))) return false;
  await setTaskApproval(ref.orgId, taskId, status, who);
  await notifyApproval(ref.orgId, taskId, `${who} (cliente)`, status === "approved").catch(() => {});
  return true;
}

/** Público: comentários de uma entrega. */
export async function portalCommentsAction(
  token: string,
  taskId: string,
): Promise<PublicCommentDTO[]> {
  const ref = await resolvePortalToken(token);
  if (!ref || !(await taskBelongsToClient(ref.orgId, taskId, ref.clientId))) return [];
  return getPublicComments(ref.orgId, taskId);
}

/** Público: cliente comenta numa entrega. */
export async function portalAddCommentAction(
  token: string,
  taskId: string,
  name: string,
  body: string,
): Promise<PublicCommentDTO | null> {
  const who = name.trim().slice(0, 60);
  const text = body.trim();
  if (!who || !text) return null;
  if (!(await rateLimit("portal-comment", 20, MIN))) return null;
  const ref = await resolvePortalToken(token);
  if (!ref || !(await taskBelongsToClient(ref.orgId, taskId, ref.clientId))) return null;
  const created = await addPublicComment(ref.orgId, taskId, who, text);
  await notifyTaskAssignees(ref.orgId, taskId, "", `${who} (cliente)`, "comment").catch(() => {});
  return created;
}

/* ----------------- Proofing (aprovação de criativos) ----------------- */

export interface ProofImage {
  id: string;
  fileName: string;
  url: string;
}

/** Imagens (criativos) de uma entrega, com URL inline para visualizar. */
export async function portalImagesAction(token: string, taskId: string): Promise<ProofImage[]> {
  if (!storageEnabled()) return [];
  const ref = await resolvePortalToken(token);
  if (!ref || !(await taskBelongsToClient(ref.orgId, taskId, ref.clientId))) return [];
  const atts = await getTaskAttachments(ref.orgId, taskId);
  const images = atts.filter((a) => a.contentType.startsWith("image/"));
  const out = await Promise.all(
    images.map(async (a) => {
      const meta = await getAttachmentForTask(ref.orgId, taskId, a.id);
      return meta ? { id: a.id, fileName: a.fileName, url: await presignGetInline(meta.storageKey) } : null;
    }),
  );
  return out.filter((x): x is ProofImage => x !== null);
}

/** Anotações (pins) de uma imagem. */
export async function portalAnnotationsAction(
  token: string,
  taskId: string,
  attachmentId: string,
): Promise<AnnotationDTO[]> {
  const ref = await resolvePortalToken(token);
  if (!ref || !(await taskBelongsToClient(ref.orgId, taskId, ref.clientId))) return [];
  if (!(await getAttachmentForTask(ref.orgId, taskId, attachmentId))) return [];
  return listAnnotations(ref.orgId, attachmentId);
}

/** Cliente adiciona um pin/anotação numa imagem. */
export async function portalAddAnnotationAction(input: {
  token: string;
  taskId: string;
  attachmentId: string;
  x: number;
  y: number;
  name: string;
  body: string;
}): Promise<AnnotationDTO | null> {
  const who = input.name.trim().slice(0, 60);
  const text = input.body.trim();
  if (!who || !text) return null;
  if (!(await rateLimit("portal-annotate", 30, MIN))) return null;
  const ref = await resolvePortalToken(input.token);
  if (!ref || !(await taskBelongsToClient(ref.orgId, input.taskId, ref.clientId))) return null;
  if (!(await getAttachmentForTask(ref.orgId, input.taskId, input.attachmentId))) return null;
  const created = await addAnnotation({
    orgId: ref.orgId,
    taskId: input.taskId,
    attachmentId: input.attachmentId,
    x: input.x,
    y: input.y,
    guestName: who,
    body: text,
  });
  await notifyTaskAssignees(ref.orgId, input.taskId, "", `${who} (cliente)`, "comment").catch(() => {});
  return created;
}
