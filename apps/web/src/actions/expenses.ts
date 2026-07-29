"use server";

import {
  createExpense,
  deleteExpense,
  listExpenses,
  updateExpense,
  type ExpenseDTO,
  type ExpenseInput,
} from "@wayline/db";
import { revalidatePath } from "next/cache";
import { assertMember, assertRole, getSessionUserId } from "@/lib/authz";

export async function listExpensesAction(orgId: string): Promise<ExpenseDTO[]> {
  if (!(await assertMember(orgId))) return [];
  return listExpenses(orgId);
}

export interface ExpenseInputRaw {
  description: string;
  category: string;
  amountCents: number;
  dueDateIso: string | null;
  paid: boolean;
  recurrence: string;
  clientId: string | null;
}

function toInput(raw: ExpenseInputRaw): ExpenseInput {
  return {
    description: raw.description,
    category: raw.category,
    amountCents: raw.amountCents,
    dueDate: raw.dueDateIso ? new Date(raw.dueDateIso) : null,
    paid: Boolean(raw.paid),
    recurrence: raw.recurrence === "monthly" ? "monthly" : "none",
    clientId: raw.clientId || null,
  };
}

export async function createExpenseAction(orgId: string, raw: ExpenseInputRaw): Promise<string | null> {
  if (!(await assertRole(orgId, "admin"))) return null;
  const uid = await getSessionUserId();
  const id = await createExpense(orgId, uid, toInput(raw));
  revalidatePath("/app");
  return id;
}

export async function updateExpenseAction(orgId: string, id: string, raw: ExpenseInputRaw): Promise<boolean> {
  if (!(await assertRole(orgId, "admin"))) return false;
  await updateExpense(orgId, id, toInput(raw));
  revalidatePath("/app");
  return true;
}

export async function deleteExpenseAction(orgId: string, id: string): Promise<void> {
  if (!(await assertRole(orgId, "admin"))) return;
  await deleteExpense(orgId, id);
  revalidatePath("/app");
}
