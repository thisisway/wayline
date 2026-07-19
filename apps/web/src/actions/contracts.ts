"use server";

import {
  createContract,
  createContractFromProposal,
  deleteContract,
  getContract,
  listContracts,
  updateContract,
  type ContractDTO,
  type ContractListItem,
} from "@wayline/db";
import { revalidatePath } from "next/cache";
import { assertMember, assertRole, getSessionUserId } from "@/lib/authz";

export async function listContractsAction(orgId: string): Promise<ContractListItem[]> {
  if (!(await assertMember(orgId))) return [];
  return listContracts(orgId);
}

export async function getContractAction(orgId: string, id: string): Promise<ContractDTO | null> {
  if (!(await assertMember(orgId))) return null;
  return getContract(orgId, id);
}

export async function createContractAction(orgId: string): Promise<string | null> {
  if (!(await assertRole(orgId, "admin"))) return null;
  const id = await createContract(orgId, await getSessionUserId());
  revalidatePath("/app");
  return id;
}

/** Gera um contrato a partir de uma proposta aceita. */
export async function contractFromProposalAction(
  orgId: string,
  proposalId: string,
): Promise<string | null> {
  if (!(await assertRole(orgId, "admin"))) return null;
  const id = await createContractFromProposal(orgId, proposalId, await getSessionUserId());
  revalidatePath("/app");
  return id;
}

export async function updateContractAction(
  orgId: string,
  id: string,
  patch: { title?: string; content?: string; valueCents?: number; clientId?: string | null; status?: string },
): Promise<boolean> {
  if (!(await assertRole(orgId, "admin"))) return false;
  await updateContract(orgId, id, patch);
  revalidatePath("/app");
  return true;
}

export async function deleteContractAction(orgId: string, id: string): Promise<void> {
  if (!(await assertRole(orgId, "admin"))) return;
  await deleteContract(orgId, id);
  revalidatePath("/app");
}
