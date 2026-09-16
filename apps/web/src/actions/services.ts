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
import { assertModule } from "@/lib/authz";

export async function listServicesAction(orgId: string): Promise<ServiceDTO[]> {
  if (!(await assertModule(orgId, "comercial", "view"))) return [];
  return listServices(orgId);
}

export async function createServiceAction(
  orgId: string,
  input: ServiceInput,
): Promise<ServiceDTO | null> {
  if (!(await assertModule(orgId, "comercial", "edit"))) return null;
  const s = await createService(orgId, input);
  revalidatePath("/app");
  return s;
}

export async function updateServiceAction(
  orgId: string,
  id: string,
  input: ServiceInput,
): Promise<void> {
  if (!(await assertModule(orgId, "comercial", "manage"))) return;
  await updateService(orgId, id, input);
  revalidatePath("/app");
}

export async function deleteServiceAction(orgId: string, id: string): Promise<void> {
  if (!(await assertModule(orgId, "comercial", "manage"))) return;
  await deleteService(orgId, id);
  revalidatePath("/app");
}
