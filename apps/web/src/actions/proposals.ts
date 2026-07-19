"use server";

import {
  createProposal,
  deleteProposal,
  getProposal,
  listClientOptions,
  listProposals,
  updateProposal,
  type ProposalDTO,
  type ProposalListItem,
  type ProposalPatch,
} from "@wayline/db";
import { revalidatePath } from "next/cache";
import { assertMember, assertRole, getSessionUserId } from "@/lib/authz";
import { aiEnabled, draftProposal } from "@/lib/ai";

export async function listProposalsAction(orgId: string): Promise<ProposalListItem[]> {
  if (!(await assertMember(orgId))) return [];
  return listProposals(orgId);
}

export async function getProposalAction(
  orgId: string,
  id: string,
): Promise<ProposalDTO | null> {
  if (!(await assertMember(orgId))) return null;
  return getProposal(orgId, id);
}

export async function clientOptionsAction(
  orgId: string,
): Promise<Array<{ id: string; name: string }>> {
  if (!(await assertMember(orgId))) return [];
  return listClientOptions(orgId);
}

export async function createProposalAction(orgId: string): Promise<string | null> {
  if (!(await assertRole(orgId, "admin"))) return null;
  const uid = await getSessionUserId();
  const id = await createProposal(orgId, uid);
  revalidatePath("/app");
  return id;
}

export async function updateProposalAction(
  orgId: string,
  id: string,
  patch: {
    title?: string;
    intro?: string;
    clientId?: string | null;
    status?: string;
    validUntilIso?: string | null;
    items?: Array<{ description: string; amountCents: number }>;
  },
): Promise<boolean> {
  if (!(await assertRole(orgId, "admin"))) return false;
  const dbPatch: ProposalPatch = {
    title: patch.title,
    intro: patch.intro,
    clientId: patch.clientId,
    status: patch.status,
    items: patch.items,
  };
  if (patch.validUntilIso !== undefined) {
    dbPatch.validUntil = patch.validUntilIso ? new Date(patch.validUntilIso) : null;
  }
  await updateProposal(orgId, id, dbPatch);
  revalidatePath("/app");
  return true;
}

export async function deleteProposalAction(orgId: string, id: string): Promise<void> {
  if (!(await assertRole(orgId, "admin"))) return;
  await deleteProposal(orgId, id);
  revalidatePath("/app");
}

/** Rascunho por IA: retorna intro + itens sugeridos (não salva). */
export async function draftProposalAction(
  orgId: string,
  briefing: string,
): Promise<{ intro: string; items: Array<{ description: string; amountCents: number }> } | null> {
  if (!aiEnabled() || !briefing.trim() || !(await assertRole(orgId, "admin"))) return null;
  return draftProposal(briefing.trim());
}

export async function aiEnabledAction(): Promise<boolean> {
  return aiEnabled();
}
