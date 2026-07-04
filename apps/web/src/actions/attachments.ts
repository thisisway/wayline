"use server";

import { randomUUID } from "node:crypto";
import {
  createAttachment,
  deleteAttachmentRow,
  getAttachmentKey,
  getTaskAttachments,
  type AttachmentDTO,
} from "@wayline/db";
import { revalidatePath } from "next/cache";
import { assertMember, getSessionUserId } from "@/lib/authz";
import { deleteObject, presignGet, presignPut, storageEnabled } from "@/lib/storage";

const MAX_SIZE = 25 * 1024 * 1024; // 25MB

export type UploadTarget = { uploadUrl: string; key: string } | { error: string };

function sanitize(name: string): string {
  return name.replace(/[^\w.-]+/g, "_").slice(0, 120) || "arquivo";
}

export async function attachmentsEnabledAction(): Promise<boolean> {
  return storageEnabled();
}

export async function createUploadUrlAction(
  orgId: string,
  taskId: string,
  fileName: string,
  contentType: string,
  size: number,
): Promise<UploadTarget> {
  if (!(await assertMember(orgId))) return { error: "Sem permissão." };
  if (!storageEnabled()) return { error: "Storage não configurado." };
  if (size > MAX_SIZE) return { error: "Arquivo acima de 25MB." };

  const key = `orgs/${orgId}/tasks/${taskId}/${randomUUID()}-${sanitize(fileName)}`;
  const uploadUrl = await presignPut(key, contentType || "application/octet-stream");
  return { uploadUrl, key };
}

export async function confirmUploadAction(
  orgId: string,
  taskId: string,
  key: string,
  fileName: string,
  contentType: string,
  size: number,
): Promise<AttachmentDTO | null> {
  if (!(await assertMember(orgId))) return null;
  const uploaderId = await getSessionUserId();
  const dto = await createAttachment(orgId, {
    taskId,
    uploaderId,
    fileName,
    storageKey: key,
    contentType: contentType || "application/octet-stream",
    size,
  });
  revalidatePath("/app");
  return dto;
}

export async function listAttachmentsAction(
  orgId: string,
  taskId: string,
): Promise<AttachmentDTO[]> {
  if (!(await assertMember(orgId))) return [];
  return getTaskAttachments(orgId, taskId);
}

export async function downloadUrlAction(orgId: string, id: string): Promise<string | null> {
  if (!(await assertMember(orgId)) || !storageEnabled()) return null;
  const meta = await getAttachmentKey(orgId, id);
  if (!meta) return null;
  return presignGet(meta.storageKey, meta.fileName);
}

export async function deleteAttachmentAction(orgId: string, id: string): Promise<void> {
  if (!(await assertMember(orgId))) return;
  const meta = await getAttachmentKey(orgId, id);
  await deleteAttachmentRow(orgId, id);
  if (meta && storageEnabled()) {
    try {
      await deleteObject(meta.storageKey);
    } catch {
      /* órfão no bucket — o registro já saiu */
    }
  }
  revalidatePath("/app");
}
