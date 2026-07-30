"use server";

import {
  createIntegration,
  deleteIntegration,
  listIntegrations,
  testIntegration,
  updateIntegration,
  type IntegrationDTO,
  type IntegrationInput,
} from "@wayline/db";
import { assertRole } from "@/lib/authz";

export async function listIntegrationsAction(orgId: string): Promise<IntegrationDTO[]> {
  if (!(await assertRole(orgId, "admin"))) return [];
  return listIntegrations(orgId);
}

export async function createIntegrationAction(
  orgId: string,
  input: IntegrationInput,
): Promise<boolean> {
  if (!(await assertRole(orgId, "admin"))) return false;
  const id = await createIntegration(orgId, input);
  return id !== null;
}

export async function updateIntegrationAction(
  orgId: string,
  id: string,
  patch: Partial<Pick<IntegrationDTO, "name" | "url" | "events" | "active">>,
): Promise<void> {
  if (!(await assertRole(orgId, "admin"))) return;
  await updateIntegration(orgId, id, patch);
}

export async function deleteIntegrationAction(orgId: string, id: string): Promise<void> {
  if (!(await assertRole(orgId, "admin"))) return;
  await deleteIntegration(orgId, id);
}

/** Dispara uma entrega de teste e devolve o status (ex.: '200', 'error: …'). */
export async function testIntegrationAction(orgId: string, id: string): Promise<string> {
  if (!(await assertRole(orgId, "admin"))) return "forbidden";
  return testIntegration(orgId, id);
}
