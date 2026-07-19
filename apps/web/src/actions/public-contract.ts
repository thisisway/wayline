"use server";

import { getContractByToken, signContract, type PublicContract } from "@wayline/db";

export async function getPublicContractAction(token: string): Promise<PublicContract | null> {
  if (!token) return null;
  return getContractByToken(token);
}

/** Cliente assina o contrato pelo link (sem login; token é o segredo). */
export async function signContractAction(
  token: string,
  name: string,
  doc: string,
): Promise<boolean> {
  const who = name.trim();
  if (!token || !who) return false;
  return signContract(token, who, doc.trim());
}
