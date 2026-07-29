import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "../client";
import { expenses } from "../schema";

export interface ExpenseDTO {
  id: string;
  description: string;
  category: string;
  amountCents: number;
  dueDate: Date | null;
  paid: boolean;
  paidAt: Date | null;
  recurrence: string;
  clientId: string | null;
  clientName: string | null;
}

/** `expenses` é no-RLS: filtramos por org_id. Resiliente. */
export async function listExpenses(orgId: string): Promise<ExpenseDTO[]> {
  try {
    const db = getDb();
    const rows = await db.query.expenses.findMany({
      where: and(eq(expenses.orgId, orgId), isNull(expenses.deletedAt)),
      orderBy: [desc(expenses.dueDate), desc(expenses.createdAt)],
      with: { client: true },
    });
    return rows.map((e) => ({
      id: e.id,
      description: e.description,
      category: e.category,
      amountCents: e.amountCents,
      dueDate: e.dueDate,
      paid: e.paid,
      paidAt: e.paidAt,
      recurrence: e.recurrence,
      clientId: e.clientId,
      clientName: (e as typeof e & { client?: { name?: string } }).client?.name ?? null,
    }));
  } catch {
    return [];
  }
}

export interface ExpenseInput {
  description: string;
  category: string;
  amountCents: number;
  dueDate: Date | null;
  paid: boolean;
  recurrence: string;
  clientId: string | null;
}

export async function createExpense(
  orgId: string,
  createdBy: string | null,
  input: ExpenseInput,
): Promise<string> {
  const db = getDb();
  const [row] = await db
    .insert(expenses)
    .values({
      orgId,
      createdBy,
      description: input.description.trim() || "Despesa",
      category: input.category.trim() || "Geral",
      amountCents: Math.max(0, Math.round(input.amountCents)),
      dueDate: input.dueDate,
      paid: input.paid,
      paidAt: input.paid ? new Date() : null,
      recurrence: input.recurrence === "monthly" ? "monthly" : "none",
      clientId: input.clientId,
    })
    .returning({ id: expenses.id });
  return row!.id;
}

export async function updateExpense(
  orgId: string,
  id: string,
  input: ExpenseInput,
): Promise<void> {
  const db = getDb();
  await db
    .update(expenses)
    .set({
      description: input.description.trim() || "Despesa",
      category: input.category.trim() || "Geral",
      amountCents: Math.max(0, Math.round(input.amountCents)),
      dueDate: input.dueDate,
      paid: input.paid,
      paidAt: input.paid ? new Date() : null,
      recurrence: input.recurrence === "monthly" ? "monthly" : "none",
      clientId: input.clientId,
      updatedAt: new Date(),
    })
    .where(and(eq(expenses.id, id), eq(expenses.orgId, orgId)));
}

export async function deleteExpense(orgId: string, id: string): Promise<void> {
  const db = getDb();
  await db
    .update(expenses)
    .set({ deletedAt: new Date() })
    .where(and(eq(expenses.id, id), eq(expenses.orgId, orgId)));
}
