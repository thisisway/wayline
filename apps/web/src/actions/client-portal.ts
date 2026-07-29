"use server";

import {
  getClientPortal,
  getOrCreateClientPortal,
  notifyApproval,
  resolvePortalToken,
  setTaskApproval,
  taskBelongsToClient,
  type ClientPortal,
} from "@wayline/db";
import { assertMember } from "@/lib/authz";
import { rateLimit, MIN } from "@/lib/rate-limit";

/** Agência: gera/reusa o link do portal de um cliente. Retorna o token. */
export async function clientPortalLinkAction(
  orgId: string,
  clientId: string,
): Promise<string | null> {
  if (!(await assertMember(orgId))) return null;
  return getOrCreateClientPortal(orgId, clientId);
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
