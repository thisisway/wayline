"use server";

import {
  archiveClient,
  createClient,
  listClients,
  updateClient,
  type ClientDTO,
  type CreateClientInput,
} from "@wayline/db";
import { revalidatePath } from "next/cache";
import { assertMember } from "@/lib/authz";

export async function listClientsAction(orgId: string): Promise<ClientDTO[]> {
  if (!(await assertMember(orgId))) return [];
  return listClients(orgId);
}

export async function createClientAction(
  orgId: string,
  input: CreateClientInput,
): Promise<ClientDTO | null> {
  if (!input.name.trim() || !(await assertMember(orgId))) return null;
  const client = await createClient(orgId, input);
  revalidatePath("/app");
  return client;
}

export async function updateClientAction(
  orgId: string,
  id: string,
  patch: { name?: string; color?: string; contactEmail?: string | null; hourBudget?: number | null },
): Promise<void> {
  if (!(await assertMember(orgId))) return;
  await updateClient(orgId, id, patch);
  revalidatePath("/app");
}

export async function archiveClientAction(orgId: string, id: string): Promise<void> {
  if (!(await assertMember(orgId))) return;
  await archiveClient(orgId, id);
  revalidatePath("/app");
}
