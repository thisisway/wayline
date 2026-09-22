"use server";

import {
  createApiToken,
  listApiTokens,
  revokeApiToken,
  type ApiScope,
  type ApiTokenDTO,
} from "@wayline/db";
import { getSessionUserId } from "@/lib/authz";

export async function listApiTokensAction(): Promise<ApiTokenDTO[]> {
  const uid = await getSessionUserId();
  if (!uid) return [];
  return listApiTokens(uid);
}

/** Cria um token e devolve o valor CRU uma única vez. */
export async function createApiTokenAction(
  name: string,
  scope: ApiScope,
): Promise<{ id: string; token: string } | null> {
  const uid = await getSessionUserId();
  if (!uid) return null;
  return createApiToken(uid, name, scope === "read" ? "read" : "write");
}

export async function revokeApiTokenAction(id: string): Promise<void> {
  const uid = await getSessionUserId();
  if (!uid) return;
  await revokeApiToken(uid, id);
}
