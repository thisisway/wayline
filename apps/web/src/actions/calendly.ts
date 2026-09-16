"use server";

import { getOrgCalendlyKey, setOrgCalendlyKey } from "@wayline/db";
import { revalidatePath } from "next/cache";
import { assertRole } from "@/lib/authz";

/** Se a integração do Calendly está ativa (chave configurada) — admin. */
export async function calendlyEnabledAction(orgId: string): Promise<boolean> {
  if (!(await assertRole(orgId, "admin"))) return false;
  return !!(await getOrgCalendlyKey(orgId));
}

/** Salva a signing key do Calendly (vazio = desativa). Admin. */
export async function setCalendlyKeyAction(orgId: string, key: string): Promise<boolean> {
  if (!(await assertRole(orgId, "admin"))) return false;
  const trimmed = key.trim();
  await setOrgCalendlyKey(orgId, trimmed || null);
  revalidatePath("/app");
  return true;
}
