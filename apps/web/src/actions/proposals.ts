"use server";

import {
  createProposal,
  createQuickLead,
  deleteProposal,
  getProposal,
  getProposalActivity,
  listClientOptions,
  listProposals,
  setProposalStage,
  updateProposal,
  type ActivityDTO,
  type ProposalDTO,
  type ProposalListItem,
  type ProposalPatch,
  type ProposalStage,
} from "@wayline/db";
import { revalidatePath } from "next/cache";
import { assertModule, getSessionUser, getSessionUserId } from "@/lib/authz";
import { pokeComercial } from "@/actions/live";
import { aiEnabled, draftProposal } from "@/lib/ai";
import { rateLimit, MIN } from "@/lib/rate-limit";

export async function listProposalsAction(orgId: string): Promise<ProposalListItem[]> {
  if (!(await assertModule(orgId, "comercial", "view"))) return [];
  return listProposals(orgId);
}

export async function getProposalAction(
  orgId: string,
  id: string,
): Promise<ProposalDTO | null> {
  if (!(await assertModule(orgId, "comercial", "view"))) return null;
  return getProposal(orgId, id);
}

export async function clientOptionsAction(
  orgId: string,
): Promise<Array<{ id: string; name: string }>> {
  if (!(await assertModule(orgId, "comercial", "view"))) return [];
  return listClientOptions(orgId);
}

export async function createProposalAction(orgId: string): Promise<string | null> {
  if (!(await assertModule(orgId, "comercial", "edit"))) return null;
  const uid = await getSessionUserId();
  const id = await createProposal(orgId, uid);
  await pokeComercial(orgId);
  revalidatePath("/app");
  return id;
}

export interface ProposalPatchInput {
  title?: string;
  intro?: string;
  objective?: string;
  terms?: string;
  bonus?: string;
  schedule?: Array<{ label: string; duration: string }>;
  discountPct?: number;
  paymentMethod?: string;
  paymentTerms?: string;
  recurrence?: string;
  nextSteps?: string;
  internalNotes?: string;
  portfolioIds?: string[];
  clientId?: string | null;
  status?: string;
  validUntilIso?: string | null;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  ownerId?: string | null;
  estimatedValueCents?: number;
  expectedCloseAtIso?: string | null;
  items?: Array<{
    description: string;
    details: string;
    amountCents: number;
    quantity: number;
    unit: string;
    term: string;
  }>;
}

export async function updateProposalAction(
  orgId: string,
  id: string,
  patch: ProposalPatchInput,
): Promise<boolean> {
  if (!(await assertModule(orgId, "comercial", "edit"))) return false;
  const dbPatch: ProposalPatch = {
    title: patch.title,
    intro: patch.intro,
    objective: patch.objective,
    terms: patch.terms,
    bonus: patch.bonus,
    schedule: patch.schedule,
    discountPct: patch.discountPct,
    paymentMethod: patch.paymentMethod,
    paymentTerms: patch.paymentTerms,
    recurrence: patch.recurrence,
    nextSteps: patch.nextSteps,
    internalNotes: patch.internalNotes,
    portfolioIds: patch.portfolioIds,
    clientId: patch.clientId,
    status: patch.status,
    items: patch.items,
    contactName: patch.contactName,
    contactEmail: patch.contactEmail,
    contactPhone: patch.contactPhone,
    ownerId: patch.ownerId,
    estimatedValueCents: patch.estimatedValueCents,
  };
  if (patch.validUntilIso !== undefined) {
    dbPatch.validUntil = patch.validUntilIso ? new Date(patch.validUntilIso) : null;
  }
  if (patch.expectedCloseAtIso !== undefined) {
    dbPatch.expectedCloseAt = patch.expectedCloseAtIso ? new Date(patch.expectedCloseAtIso) : null;
  }
  await updateProposal(orgId, id, dbPatch);
  await pokeComercial(orgId);
  revalidatePath("/app");
  return true;
}

export async function moveProposalStageAction(
  orgId: string,
  id: string,
  stage: ProposalStage,
  lostReason?: string,
): Promise<boolean> {
  if (!(await assertModule(orgId, "comercial", "edit"))) return false;
  const user = await getSessionUser();
  const ok = await setProposalStage(orgId, id, stage, {
    lostReason,
    actorId: user?.id ?? null,
    actorName: user?.name,
  });
  if (ok) {
    await pokeComercial(orgId);
    revalidatePath("/app");
  }
  return ok;
}

export interface CreateQuickLeadInput {
  title: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  estimatedValueCents: number;
  ownerId: string | null;
  expectedCloseAtIso: string | null;
}

/** Cadastro rápido de lead (botão "Novo lead" no comercial). */
export async function createQuickLeadAction(
  orgId: string,
  input: CreateQuickLeadInput,
): Promise<string | null> {
  if (!(await assertModule(orgId, "comercial", "edit"))) return null;
  const uid = await getSessionUserId();
  const id = await createQuickLead(orgId, {
    title: input.title,
    contactName: input.contactName,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
    estimatedValueCents: input.estimatedValueCents,
    ownerId: input.ownerId,
    expectedCloseAt: input.expectedCloseAtIso ? new Date(input.expectedCloseAtIso) : null,
    createdBy: uid,
  });
  await pokeComercial(orgId);
  revalidatePath("/app");
  return id;
}

export async function listProposalActivityAction(
  orgId: string,
  id: string,
): Promise<ActivityDTO[]> {
  if (!(await assertModule(orgId, "comercial", "view"))) return [];
  return getProposalActivity(orgId, id);
}

export async function deleteProposalAction(orgId: string, id: string): Promise<void> {
  if (!(await assertModule(orgId, "comercial", "manage"))) return;
  await deleteProposal(orgId, id);
  await pokeComercial(orgId);
  revalidatePath("/app");
}

/** Rascunho por IA: retorna intro + itens sugeridos (não salva). */
export async function draftProposalAction(
  orgId: string,
  briefing: string,
): Promise<{ intro: string; items: Array<{ description: string; amountCents: number }> } | null> {
  if (!aiEnabled() || !briefing.trim() || !(await assertModule(orgId, "comercial", "edit"))) return null;
  // Protege contra abuso de créditos de IA: 20 gerações por IP a cada 10 min.
  if (!(await rateLimit("ai-draft", 20, 10 * MIN))) return null;
  return draftProposal(briefing.trim());
}

export async function aiEnabledAction(): Promise<boolean> {
  return aiEnabled();
}
