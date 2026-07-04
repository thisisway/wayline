import { and, asc, eq, inArray } from "drizzle-orm";
import { withOrg } from "../client";
import { customFieldDefs, customFieldValues, tasks } from "../schema";

export type CustomFieldType = "text" | "number" | "select" | "date" | "checkbox";

export interface CustomFieldDef {
  id: string;
  name: string;
  type: CustomFieldType;
  options: string[];
  position: number;
}

/** Campo + valor atual para uma tarefa. */
export interface CustomFieldWithValue extends CustomFieldDef {
  value: string | null;
}

export interface CreateFieldInput {
  name: string;
  type: CustomFieldType;
  options?: string[];
}

export async function getListFields(orgId: string, listId: string): Promise<CustomFieldDef[]> {
  return withOrg(orgId, async (tx) => {
    const rows = await tx.query.customFieldDefs.findMany({
      where: eq(customFieldDefs.listId, listId),
      orderBy: [asc(customFieldDefs.position), asc(customFieldDefs.createdAt)],
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type as CustomFieldType,
      options: r.options ?? [],
      position: r.position,
    }));
  });
}

export async function createField(
  orgId: string,
  listId: string,
  input: CreateFieldInput,
): Promise<CustomFieldDef> {
  return withOrg(orgId, async (tx) => {
    const count = await tx.$count(customFieldDefs, eq(customFieldDefs.listId, listId));
    const [row] = await tx
      .insert(customFieldDefs)
      .values({
        orgId,
        listId,
        name: input.name.trim(),
        type: input.type,
        options: input.options ?? [],
        position: count,
      })
      .returning();
    if (!row) throw new Error("falha ao criar campo");
    return {
      id: row.id,
      name: row.name,
      type: row.type as CustomFieldType,
      options: row.options ?? [],
      position: row.position,
    };
  });
}

export async function updateField(
  orgId: string,
  fieldId: string,
  patch: { name?: string; options?: string[] },
): Promise<void> {
  await withOrg(orgId, async (tx) => {
    const set: Partial<typeof customFieldDefs.$inferInsert> = {};
    if (patch.name !== undefined) set.name = patch.name.trim();
    if (patch.options !== undefined) set.options = patch.options;
    if (Object.keys(set).length === 0) return;
    await tx.update(customFieldDefs).set(set).where(eq(customFieldDefs.id, fieldId));
  });
}

export async function deleteField(orgId: string, fieldId: string): Promise<void> {
  await withOrg(orgId, async (tx) => {
    await tx.delete(customFieldDefs).where(eq(customFieldDefs.id, fieldId));
  });
}

/** Campos da lista da tarefa + valores atuais. */
export async function getTaskFields(
  orgId: string,
  taskId: string,
): Promise<CustomFieldWithValue[]> {
  return withOrg(orgId, async (tx) => {
    const task = await tx.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
    if (!task) return [];
    const defs = await tx.query.customFieldDefs.findMany({
      where: eq(customFieldDefs.listId, task.listId),
      orderBy: [asc(customFieldDefs.position), asc(customFieldDefs.createdAt)],
    });
    if (defs.length === 0) return [];
    const values = await tx
      .select({ fieldId: customFieldValues.fieldId, value: customFieldValues.value })
      .from(customFieldValues)
      .where(
        and(
          eq(customFieldValues.taskId, taskId),
          inArray(
            customFieldValues.fieldId,
            defs.map((d) => d.id),
          ),
        ),
      );
    const byField = new Map(values.map((v) => [v.fieldId, v.value]));
    return defs.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type as CustomFieldType,
      options: d.options ?? [],
      position: d.position,
      value: byField.get(d.id) ?? null,
    }));
  });
}

/** Define (upsert) o valor de um campo numa tarefa. Valor vazio remove. */
export async function setFieldValue(
  orgId: string,
  taskId: string,
  fieldId: string,
  value: string | null,
): Promise<void> {
  await withOrg(orgId, async (tx) => {
    if (value === null || value === "") {
      await tx
        .delete(customFieldValues)
        .where(
          and(eq(customFieldValues.taskId, taskId), eq(customFieldValues.fieldId, fieldId)),
        );
      return;
    }
    await tx
      .insert(customFieldValues)
      .values({ orgId, taskId, fieldId, value })
      .onConflictDoUpdate({
        target: [customFieldValues.taskId, customFieldValues.fieldId],
        set: { value },
      });
  });
}
