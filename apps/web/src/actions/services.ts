"use server";

import {
  createService,
  deleteService,
  listServices,
  updateService,
  type ServiceDTO,
  type ServiceInput,
} from "@wayline/db";
import { revalidatePath } from "next/cache";
import { assertMember, assertRole } from "@/lib/authz";

export async function listServicesAction(orgId: string): Promise<ServiceDTO[]> {
  if (!(await assertMember(orgId))) return [];
  return listServices(orgId);
}

export async function createServiceAction(
  orgId: string,
  input: ServiceInput,
): Promise<ServiceDTO | null> {
  if (!(await assertRole(orgId, "admin"))) return null;
  const s = await createService(orgId, input);
  revalidatePath("/app");
  return s;
}

export async function updateServiceAction(
  orgId: string,
  id: string,
  input: ServiceInput,
): Promise<void> {
  if (!(await assertRole(orgId, "admin"))) return;
  await updateService(orgId, id, input);
  revalidatePath("/app");
}

export async function deleteServiceAction(orgId: string, id: string): Promise<void> {
  if (!(await assertRole(orgId, "admin"))) return;
  await deleteService(orgId, id);
  revalidatePath("/app");
}
