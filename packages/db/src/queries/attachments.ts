import { and, asc, eq } from "drizzle-orm";
import { withOrg } from "../client";
import { attachments } from "../schema";

export interface AttachmentDTO {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
  createdAt: Date;
}

export interface CreateAttachmentInput {
  taskId: string;
  uploaderId: string | null;
  fileName: string;
  storageKey: string;
  contentType: string;
  size: number;
}

function toDTO(row: {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
  createdAt: Date;
}): AttachmentDTO {
  return {
    id: row.id,
    fileName: row.fileName,
    contentType: row.contentType,
    size: row.size,
    createdAt: row.createdAt,
  };
}

export async function createAttachment(
  orgId: string,
  input: CreateAttachmentInput,
): Promise<AttachmentDTO> {
  return withOrg(orgId, async (tx) => {
    const [created] = await tx
      .insert(attachments)
      .values({
        orgId,
        taskId: input.taskId,
        uploaderId: input.uploaderId,
        fileName: input.fileName,
        storageKey: input.storageKey,
        contentType: input.contentType,
        size: input.size,
      })
      .returning();
    if (!created) throw new Error("falha ao registrar anexo");
    return toDTO(created);
  });
}

export async function getTaskAttachments(orgId: string, taskId: string): Promise<AttachmentDTO[]> {
  return withOrg(orgId, async (tx) => {
    const rows = await tx.query.attachments.findMany({
      where: eq(attachments.taskId, taskId),
      orderBy: [asc(attachments.createdAt)],
    });
    return rows.map(toDTO);
  });
}

/** Chave de storage + nome (para presign GET / delete no bucket). */
export async function getAttachmentKey(
  orgId: string,
  id: string,
): Promise<{ storageKey: string; fileName: string } | null> {
  return withOrg(orgId, async (tx) => {
    const row = await tx.query.attachments.findFirst({ where: eq(attachments.id, id) });
    return row ? { storageKey: row.storageKey, fileName: row.fileName } : null;
  });
}

export async function deleteAttachmentRow(orgId: string, id: string): Promise<void> {
  await withOrg(orgId, async (tx) => {
    await tx.delete(attachments).where(and(eq(attachments.orgId, orgId), eq(attachments.id, id)));
  });
}
