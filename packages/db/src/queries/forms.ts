import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { getDb } from "../client";
import { forms, formResponses } from "../schema";
import type { FormFieldSchema } from "../schema/collaboration";

export type { FormFieldSchema };

export interface FormListItem {
  id: string;
  title: string;
  status: string;
  token: string;
  fieldCount: number;
  responseCount: number;
  updatedAt: Date;
}

export interface FormDTO {
  id: string;
  title: string;
  description: string;
  fields: FormFieldSchema[];
  status: string;
  token: string;
  thankYou: string;
}

/** Formulário público (link de resposta) — sem dados internos. */
export interface PublicForm {
  id: string;
  title: string;
  description: string;
  fields: FormFieldSchema[];
  thankYou: string;
  orgName: string;
  closed: boolean;
}

export interface FormResponseDTO {
  id: string;
  answers: Record<string, string>;
  createdAt: Date;
}

function token(): string {
  return randomBytes(18).toString("base64url");
}

function toDTO(f: typeof forms.$inferSelect): FormDTO {
  return {
    id: f.id,
    title: f.title,
    description: f.description,
    fields: f.fields ?? [],
    status: f.status,
    token: f.token,
    thankYou: f.thankYou,
  };
}

/** `forms` é no-RLS: filtramos por org_id em toda query. Resiliente. */
export async function listForms(orgId: string): Promise<FormListItem[]> {
  try {
    const db = getDb();
    const rows = await db.query.forms.findMany({
      where: and(eq(forms.orgId, orgId), isNull(forms.deletedAt)),
      orderBy: [desc(forms.updatedAt)],
    });
    const counts = await db
      .select({ formId: formResponses.formId, n: sql<number>`count(*)`.mapWith(Number) })
      .from(formResponses)
      .where(eq(formResponses.orgId, orgId))
      .groupBy(formResponses.formId);
    const byForm = new Map(counts.map((c) => [c.formId, c.n]));
    return rows.map((f) => ({
      id: f.id,
      title: f.title,
      status: f.status,
      token: f.token,
      fieldCount: (f.fields ?? []).length,
      responseCount: byForm.get(f.id) ?? 0,
      updatedAt: f.updatedAt,
    }));
  } catch {
    return [];
  }
}

export async function getForm(orgId: string, id: string): Promise<FormDTO | null> {
  try {
    const db = getDb();
    const f = await db.query.forms.findFirst({
      where: and(eq(forms.id, id), eq(forms.orgId, orgId), isNull(forms.deletedAt)),
    });
    return f ? toDTO(f) : null;
  } catch {
    return null;
  }
}

export interface FormSeed {
  title?: string;
  description?: string;
  fields?: FormFieldSchema[];
}

export async function createForm(
  orgId: string,
  createdBy: string | null,
  seed?: FormSeed,
): Promise<string> {
  const db = getDb();
  const [row] = await db
    .insert(forms)
    .values({
      orgId,
      createdBy,
      token: token(),
      title: seed?.title?.trim() || "Formulário",
      description: seed?.description ?? "",
      fields: seed?.fields ?? [],
    })
    .returning({ id: forms.id });
  return row!.id;
}

export interface FormPatch {
  title?: string;
  description?: string;
  fields?: FormFieldSchema[];
  status?: string;
  thankYou?: string;
}

export async function updateForm(orgId: string, id: string, patch: FormPatch): Promise<void> {
  const db = getDb();
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.title !== undefined) set.title = patch.title.trim() || "Formulário";
  if (patch.description !== undefined) set.description = patch.description;
  if (patch.fields !== undefined) set.fields = patch.fields;
  if (patch.status !== undefined) set.status = patch.status;
  if (patch.thankYou !== undefined) set.thankYou = patch.thankYou;
  await db.update(forms).set(set).where(and(eq(forms.id, id), eq(forms.orgId, orgId)));
}

export async function deleteForm(orgId: string, id: string): Promise<void> {
  const db = getDb();
  await db
    .update(forms)
    .set({ deletedAt: new Date() })
    .where(and(eq(forms.id, id), eq(forms.orgId, orgId)));
}

/** Leitura pública pelo token (sem sessão). Retorna closed=true se rascunho. */
export async function getFormByToken(tok: string): Promise<PublicForm | null> {
  try {
    const db = getDb();
    const f = await db.query.forms.findFirst({
      where: and(eq(forms.token, tok), isNull(forms.deletedAt)),
      with: { organization: true },
    });
    if (!f) return null;
    return {
      id: f.id,
      title: f.title,
      description: f.description,
      fields: f.fields ?? [],
      thankYou: f.thankYou,
      orgName: (f as typeof f & { organization?: { name?: string } }).organization?.name ?? "",
      closed: f.status !== "published",
    };
  } catch {
    return null;
  }
}

/** Registra uma resposta (público). Só aceita formulário publicado. */
export async function submitFormResponse(
  tok: string,
  answers: Record<string, string>,
): Promise<boolean> {
  const db = getDb();
  const f = await db.query.forms.findFirst({
    where: and(eq(forms.token, tok), isNull(forms.deletedAt)),
  });
  if (!f || f.status !== "published") return false;
  // Mantém só respostas de campos existentes, truncadas.
  const allow = new Set((f.fields ?? []).map((x) => x.id));
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(answers)) {
    if (allow.has(k)) clean[k] = String(v ?? "").slice(0, 5000);
  }
  await db.insert(formResponses).values({ orgId: f.orgId, formId: f.id, answers: clean });
  return true;
}

export async function listFormResponses(
  orgId: string,
  formId: string,
): Promise<FormResponseDTO[]> {
  try {
    const db = getDb();
    const rows = await db.query.formResponses.findMany({
      where: and(eq(formResponses.orgId, orgId), eq(formResponses.formId, formId)),
      orderBy: [desc(formResponses.createdAt)],
      limit: 500,
    });
    return rows.map((r) => ({ id: r.id, answers: r.answers ?? {}, createdAt: r.createdAt }));
  } catch {
    return [];
  }
}
