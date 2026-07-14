"use server";

import {
  createField,
  deleteField,
  getListFields,
  getTaskFields,
  setFieldValue,
  updateField,
  type CreateFieldInput,
  type CustomFieldDef,
  type CustomFieldWithValue,
} from "@wayline/db";
import { revalidatePath } from "next/cache";
import { assertMember, assertRole } from "@/lib/authz";
import { planAllows } from "@/lib/plan-guard";

export async function listFieldsAction(
  orgId: string,
  listId: string,
): Promise<CustomFieldDef[]> {
  if (!(await assertMember(orgId))) return [];
  return getListFields(orgId, listId);
}

export async function createFieldAction(
  orgId: string,
  listId: string,
  input: CreateFieldInput,
): Promise<CustomFieldDef | null> {
  if (!input.name.trim() || !(await assertRole(orgId, "admin"))) return null;
  if (!(await planAllows(orgId, "customFields"))) return null;
  const field = await createField(orgId, listId, input);
  revalidatePath("/app");
  return field;
}

export async function updateFieldAction(
  orgId: string,
  fieldId: string,
  patch: { name?: string; options?: string[] },
): Promise<void> {
  if (!(await assertRole(orgId, "admin"))) return;
  await updateField(orgId, fieldId, patch);
  revalidatePath("/app");
}

export async function deleteFieldAction(orgId: string, fieldId: string): Promise<void> {
  if (!(await assertRole(orgId, "admin"))) return;
  await deleteField(orgId, fieldId);
  revalidatePath("/app");
}

export async function taskFieldsAction(
  orgId: string,
  taskId: string,
): Promise<CustomFieldWithValue[]> {
  if (!(await assertMember(orgId))) return [];
  return getTaskFields(orgId, taskId);
}

export async function setFieldValueAction(
  orgId: string,
  taskId: string,
  fieldId: string,
  value: string | null,
): Promise<void> {
  if (!(await assertMember(orgId))) return;
  await setFieldValue(orgId, taskId, fieldId, value);
  revalidatePath("/app");
}
