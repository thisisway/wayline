"use server";

import { getOrCreateCalendarToken, regenerateCalendarToken } from "@wayline/db";
import { getSessionUserId } from "@/lib/authz";

/** Token do feed ICS do usuário logado (cria na 1ª chamada). */
export async function getCalendarTokenAction(): Promise<string | null> {
  const uid = await getSessionUserId();
  if (!uid) return null;
  return getOrCreateCalendarToken(uid);
}

/** Gera um novo token (invalida o link antigo). */
export async function regenerateCalendarTokenAction(): Promise<string | null> {
  const uid = await getSessionUserId();
  if (!uid) return null;
  return regenerateCalendarToken(uid);
}
