"use server";

import { decideProposal, getProposalByToken, type PublicProposal } from "@wayline/db";

export async function getPublicProposalAction(token: string): Promise<PublicProposal | null> {
  if (!token) return null;
  return getProposalByToken(token);
}

/** Cliente aceita/recusa a proposta pelo link (sem login; token é o segredo). */
export async function decideProposalAction(
  token: string,
  decision: "accepted" | "rejected",
  name: string,
  doc: string,
): Promise<boolean> {
  const who = name.trim();
  if (!token || !who || (decision !== "accepted" && decision !== "rejected")) return false;
  return decideProposal(token, decision, who, doc.trim());
}
