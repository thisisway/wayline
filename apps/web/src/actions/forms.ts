"use server";

import {
  createForm,
  deleteForm,
  getForm,
  listFormResponses,
  listForms,
  updateForm,
  type FormDTO,
  type FormFieldSchema,
  type FormListItem,
  type FormPatch,
  type FormResponseDTO,
  type FormSeed,
} from "@wayline/db";
import { revalidatePath } from "next/cache";
import { assertMember, assertRole, getSessionUserId } from "@/lib/authz";

export async function listFormsAction(orgId: string): Promise<FormListItem[]> {
  if (!(await assertMember(orgId))) return [];
  return listForms(orgId);
}

export async function getFormAction(orgId: string, id: string): Promise<FormDTO | null> {
  if (!(await assertMember(orgId))) return null;
  return getForm(orgId, id);
}

export async function createFormAction(orgId: string, seed?: FormSeed): Promise<string | null> {
  if (!(await assertRole(orgId, "admin"))) return null;
  const uid = await getSessionUserId();
  const id = await createForm(orgId, uid, seed);
  revalidatePath("/app");
  return id;
}

export interface FormPatchInput {
  title?: string;
  description?: string;
  fields?: FormFieldSchema[];
  status?: string;
  thankYou?: string;
}

export async function updateFormAction(
  orgId: string,
  id: string,
  patch: FormPatchInput,
): Promise<boolean> {
  if (!(await assertRole(orgId, "admin"))) return false;
  const clean: FormPatch = {
    title: patch.title,
    description: patch.description,
    fields: patch.fields,
    status: patch.status === "published" ? "published" : patch.status === "draft" ? "draft" : undefined,
    thankYou: patch.thankYou,
  };
  await updateForm(orgId, id, clean);
  revalidatePath("/app");
  return true;
}

export async function deleteFormAction(orgId: string, id: string): Promise<void> {
  if (!(await assertRole(orgId, "admin"))) return;
  await deleteForm(orgId, id);
  revalidatePath("/app");
}

export async function listFormResponsesAction(
  orgId: string,
  formId: string,
): Promise<FormResponseDTO[]> {
  if (!(await assertMember(orgId))) return [];
  return listFormResponses(orgId, formId);
}
