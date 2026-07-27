"use server";

import { getFormByToken, submitFormResponse, type PublicForm } from "@wayline/db";
import { rateLimit, MIN } from "@/lib/rate-limit";

export async function getPublicFormAction(token: string): Promise<PublicForm | null> {
  if (!token) return null;
  return getFormByToken(token);
}

/** Envia uma resposta pelo link público (sem login; token é o segredo). */
export async function submitFormResponseAction(
  token: string,
  answers: Record<string, string>,
): Promise<boolean> {
  if (!token || typeof answers !== "object" || answers === null) return false;
  // Anti-spam: 8 envios por IP a cada minuto.
  if (!(await rateLimit("form-submit", 8, MIN))) return false;
  return submitFormResponse(token, answers);
}
