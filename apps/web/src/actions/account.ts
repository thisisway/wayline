"use server";

import {
  deleteUserAccount,
  exportUserData,
  type DeleteAccountResult,
  type UserDataExport,
} from "@wayline/db";
import { getSessionUser } from "@/lib/authz";

/** Exporta os dados pessoais do usuário logado (portabilidade LGPD). */
export async function exportMyDataAction(): Promise<UserDataExport | null> {
  const user = await getSessionUser();
  if (!user) return null;
  return exportUserData(user.id);
}

/**
 * Exclui a conta do usuário logado. Exige a confirmação do e-mail.
 * Retorna `blocked` com os workspaces que impedem a exclusão (dono + outros membros).
 */
export async function deleteAccountAction(confirmEmail: string): Promise<DeleteAccountResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false };
  if (confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
    return { ok: false };
  }
  return deleteUserAccount(user.id);
}
