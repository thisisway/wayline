"use server";

import {
  createInvoice,
  createInvoiceFromContract,
  deleteInvoice,
  getInvoice,
  listInvoices,
  updateInvoice,
  type InvoiceDTO,
  type InvoiceListItem,
  type InvoicePatch,
} from "@wayline/db";
import { revalidatePath } from "next/cache";
import { assertMember, assertRole, getSessionUserId } from "@/lib/authz";

export async function listInvoicesAction(orgId: string): Promise<InvoiceListItem[]> {
  if (!(await assertMember(orgId))) return [];
  return listInvoices(orgId);
}

export async function getInvoiceAction(orgId: string, id: string): Promise<InvoiceDTO | null> {
  if (!(await assertMember(orgId))) return null;
  return getInvoice(orgId, id);
}

export async function createInvoiceAction(orgId: string): Promise<string | null> {
  if (!(await assertRole(orgId, "admin"))) return null;
  const uid = await getSessionUserId();
  const id = await createInvoice(orgId, uid);
  revalidatePath("/app");
  return id;
}

export async function invoiceFromContractAction(
  orgId: string,
  contractId: string,
): Promise<string | null> {
  if (!(await assertRole(orgId, "admin"))) return null;
  const uid = await getSessionUserId();
  const id = await createInvoiceFromContract(orgId, contractId, uid);
  revalidatePath("/app");
  return id;
}

export interface InvoicePatchInput {
  title?: string;
  description?: string;
  amountCents?: number;
  dueDateIso?: string | null;
  clientId?: string | null;
  status?: string;
}

export async function updateInvoiceAction(
  orgId: string,
  id: string,
  patch: InvoicePatchInput,
): Promise<boolean> {
  if (!(await assertRole(orgId, "admin"))) return false;
  const clean: InvoicePatch = {
    title: patch.title,
    description: patch.description,
    amountCents: patch.amountCents,
    clientId: patch.clientId,
    status: ["draft", "sent", "paid", "canceled"].includes(patch.status ?? "")
      ? patch.status
      : undefined,
  };
  if (patch.dueDateIso !== undefined) {
    clean.dueDate = patch.dueDateIso ? new Date(patch.dueDateIso) : null;
  }
  await updateInvoice(orgId, id, clean);
  revalidatePath("/app");
  return true;
}

export async function deleteInvoiceAction(orgId: string, id: string): Promise<void> {
  if (!(await assertRole(orgId, "admin"))) return;
  await deleteInvoice(orgId, id);
  revalidatePath("/app");
}
