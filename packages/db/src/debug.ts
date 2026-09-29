import { and, asc, eq, ilike, inArray, isNull, sql } from "drizzle-orm";
import { getDb, withOrg } from "./client";
import { forms, formResponses, lists, spaces, statuses, tasks } from "./schema";
import { getUserByEmail, getUserOrgs } from "./queries/auth";
import { submitLead } from "./queries/forms";

export interface DebugTaskRow {
  orgName: string;
  spaceName: string | null;
  listName: string;
  taskId: string;
  title: string;
  description: string | null;
  createdAt: string;
}

/**
 * Diagnóstico pontual: acha tarefas (por prefixo de título) em todas as orgs
 * de um usuário, sem precisar do orgId de antemão. Usado por /api/admin/debug
 * (uso único, removido depois).
 */
export async function debugFindTasks(email: string, q: string): Promise<DebugTaskRow[]> {
  const user = await getUserByEmail(email);
  if (!user) return [];
  const orgs = await getUserOrgs(user.id);

  const out: DebugTaskRow[] = [];
  for (const org of orgs) {
    const rows = await withOrg(org.id, (tx) =>
      tx
        .select({
          taskId: tasks.id,
          title: tasks.title,
          description: tasks.description,
          createdAt: tasks.createdAt,
          listName: lists.name,
          spaceName: spaces.name,
        })
        .from(tasks)
        .innerJoin(lists, eq(lists.id, tasks.listId))
        .leftJoin(spaces, eq(spaces.id, lists.spaceId))
        .where(and(ilike(tasks.title, `%${q}%`), isNull(tasks.deletedAt))),
    ).catch(() => []);
    for (const r of rows) {
      out.push({
        orgName: org.name,
        spaceName: r.spaceName,
        listName: r.listName,
        taskId: r.taskId,
        title: r.title,
        description: r.description,
        createdAt: r.createdAt.toISOString(),
      });
    }
  }
  return out;
}

export interface DebugFormRow {
  id: string;
  orgName: string;
  title: string;
  status: string;
  target: string;
  targetListId: string | null;
  targetStatusId: string | null;
  spaceId: string | null;
  fieldCount: number;
  errorReadingSpaceId?: string;
}

/** Inspeciona os formulários de um usuário (config crua: target/targetListId/spaceId). */
export async function debugFindForms(email: string, q: string): Promise<DebugFormRow[]> {
  const user = await getUserByEmail(email);
  if (!user) return [];
  const orgs = await getUserOrgs(user.id);
  const orgIds = orgs.map((o) => o.id);
  if (orgIds.length === 0) return [];
  const orgName = new Map(orgs.map((o) => [o.id, o.name]));

  const db = getDb();
  let spaceIdOk = true;
  let spaceIdErr = "";
  type Row = {
    id: string;
    orgId: string;
    title: string;
    status: string;
    target: string;
    targetListId: string | null;
    targetStatusId: string | null;
    spaceId: string | null;
    fields: unknown[];
  };
  let rows: Row[];
  try {
    const found = await db.query.forms.findMany({
      where: and(inArray(forms.orgId, orgIds), ilike(forms.title, `%${q}%`), isNull(forms.deletedAt)),
    });
    rows = found.map((f) => ({
      id: f.id,
      orgId: f.orgId,
      title: f.title,
      status: f.status,
      target: f.target,
      targetListId: f.targetListId,
      targetStatusId: f.targetStatusId,
      spaceId: f.spaceId ?? null,
      fields: f.fields ?? [],
    }));
  } catch (e) {
    // Provável coluna space_id ainda não migrada — tenta de novo sem ela via SQL cru.
    spaceIdOk = false;
    spaceIdErr = String(e).slice(0, 300);
    const raw = await db.execute<{
      id: string;
      org_id: string;
      title: string;
      status: string;
      target: string;
      target_list_id: string | null;
      target_status_id: string | null;
    }>(sql`select id, org_id, title, status, target, target_list_id, target_status_id
       from forms where org_id = any(${orgIds}) and title ilike ${`%${q}%`} and deleted_at is null`);
    rows = raw.map((r) => ({
      id: r.id,
      orgId: r.org_id,
      title: r.title,
      status: r.status,
      target: r.target,
      targetListId: r.target_list_id,
      targetStatusId: r.target_status_id,
      spaceId: null,
      fields: [],
    }));
  }

  return rows.map((f) => ({
    id: f.id,
    orgName: orgName.get(f.orgId) ?? "?",
    title: f.title,
    status: f.status,
    target: f.target,
    targetListId: f.targetListId,
    targetStatusId: f.targetStatusId,
    spaceId: f.spaceId,
    fieldCount: f.fields.length,
    ...(spaceIdOk ? {} : { errorReadingSpaceId: spaceIdErr }),
  }));
}

/**
 * Reproduz a criação da tarefa a partir de um formulário, SEM engolir erros
 * (ao contrário de submitFormResponse), pra diagnosticar por que uma
 * submissão real não vira tarefa. Não insere formResponses (só simula).
 */
export async function debugSimulateFormSubmit(
  formId: string,
): Promise<{
  step: string;
  formOrgId?: string;
  targetListId?: string | null;
  fieldsRaw?: unknown;
  fieldsIsArray?: boolean;
  titleBuilt?: string;
  descriptionBuilt?: string;
  listFound?: boolean;
  listOrgId?: string | null;
  statusCount?: number;
  resolvedStatusId?: string | null;
  taskId?: string;
  error?: string;
  errorStack?: string;
}> {
  const db = getDb();
  const f = await db.query.forms.findFirst({ where: eq(forms.id, formId) });
  if (!f) return { step: "form_not_found" };
  if (!f.targetListId) return { step: "no_target_list", formOrgId: f.orgId };

  // Reproduz EXATAMENTE o processamento de campos de createTaskFromForm,
  // com respostas fictícias (uma por campo), pra pegar erro de dado malformado.
  let titleBuilt = "?";
  let descriptionBuilt = "?";
  try {
    const fields = f.fields ?? [];
    const fakeAnswers: Record<string, string> = {};
    for (const fld of fields) fakeAnswers[fld.id] = `[valor de teste — ${fld.label}]`;
    const firstVal = fields.map((fld) => fakeAnswers[fld.id]).find((v) => v && v.trim());
    titleBuilt = (firstVal || f.title || "Resposta de formulário").slice(0, 200);
    descriptionBuilt = fields.map((fld) => `${fld.label}: ${fakeAnswers[fld.id] ?? "—"}`).join("\n");
  } catch (e) {
    return {
      step: "exception_processing_fields",
      formOrgId: f.orgId,
      targetListId: f.targetListId,
      fieldsRaw: f.fields,
      fieldsIsArray: Array.isArray(f.fields),
      error: String(e).slice(0, 500),
      errorStack: e instanceof Error ? (e.stack ?? "").slice(0, 800) : undefined,
    };
  }

  try {
    return await withOrg(f.orgId, async (tx) => {
      const list = await tx.query.lists.findFirst({
        where: and(eq(lists.id, f.targetListId!), eq(lists.orgId, f.orgId), isNull(lists.deletedAt)),
      });
      if (!list) {
        const anyList = await db.query.lists.findFirst({ where: eq(lists.id, f.targetListId!) });
        return {
          step: "list_not_found_in_org",
          formOrgId: f.orgId,
          targetListId: f.targetListId,
          titleBuilt,
          descriptionBuilt,
          listFound: !!anyList,
          listOrgId: anyList?.orgId ?? null,
        };
      }
      const cols = await tx.query.statuses.findMany({
        where: eq(statuses.listId, f.targetListId!),
        orderBy: [asc(statuses.position)],
      });
      const statusId = cols[0]?.id ?? null;

      const position = await tx.$count(
        tasks,
        and(eq(tasks.listId, f.targetListId!), isNull(tasks.deletedAt)),
      );
      const [created] = await tx
        .insert(tasks)
        .values({
          orgId: f.orgId,
          listId: f.targetListId!,
          statusId,
          title: "[DEBUG SIMULATE] " + titleBuilt,
          description: descriptionBuilt,
          position,
        })
        .returning({ id: tasks.id });

      return {
        step: "ok",
        formOrgId: f.orgId,
        targetListId: f.targetListId,
        titleBuilt,
        descriptionBuilt,
        listFound: true,
        listOrgId: list.orgId,
        statusCount: cols.length,
        resolvedStatusId: statusId,
        taskId: created?.id,
      };
    });
  } catch (e) {
    return {
      step: "exception_creating_task",
      formOrgId: f.orgId,
      targetListId: f.targetListId,
      titleBuilt,
      descriptionBuilt,
      error: String(e).slice(0, 500),
      errorStack: e instanceof Error ? (e.stack ?? "").slice(0, 800) : undefined,
    };
  }
}

export interface DebugFormResponseRow {
  responseId: string;
  createdAt: string;
  answers: Record<string, string>;
  formId: string;
  formTitle: string;
  formTarget: string;
  formTargetListId: string | null;
  formStatus: string;
}

/**
 * Busca respostas de formulário (form_responses.answers) por texto, em todas
 * as orgs do email — pra descobrir em QUAL formulário uma resposta real caiu,
 * já que form_responses não tem RLS (mesmo padrão de forms).
 */
export async function debugFindFormResponses(email: string, q: string): Promise<DebugFormResponseRow[]> {
  const user = await getUserByEmail(email);
  if (!user) return [];
  const orgs = await getUserOrgs(user.id);
  const orgIds = orgs.map((o) => o.id);
  if (orgIds.length === 0) return [];

  const db = getDb();
  const rows = await db
    .select({
      responseId: formResponses.id,
      createdAt: formResponses.createdAt,
      answers: formResponses.answers,
      formId: forms.id,
      formTitle: forms.title,
      formTarget: forms.target,
      formTargetListId: forms.targetListId,
      formStatus: forms.status,
    })
    .from(formResponses)
    .innerJoin(forms, eq(forms.id, formResponses.formId))
    .where(
      and(
        inArray(formResponses.orgId, orgIds),
        sql`${formResponses.answers}::text ilike ${`%${q}%`}`,
      ),
    );

  return rows.map((r) => ({
    responseId: r.responseId,
    createdAt: r.createdAt.toISOString(),
    answers: r.answers,
    formId: r.formId,
    formTitle: r.formTitle,
    formTarget: r.formTarget,
    formTargetListId: r.formTargetListId,
    formStatus: r.formStatus,
  }));
}

/**
 * Chama o submitLead REAL (mesma função usada por /api/forms/[token]) direto,
 * sem passar pelas camadas de rota, pra ver o resultado/exceção exata sem
 * nada engolindo o erro.
 */
export async function debugCallSubmitLead(
  formId: string,
  data: Record<string, string>,
): Promise<{
  ok?: boolean;
  listId?: string | null;
  target?: string;
  created?: boolean;
  formToken?: string;
  error?: string;
  errorStack?: string;
}> {
  const db = getDb();
  const f = await db.query.forms.findFirst({ where: eq(forms.id, formId) });
  if (!f) return { error: "form_not_found" };
  try {
    const result = await submitLead(f.token, data);
    return { ...result, formToken: f.token };
  } catch (e) {
    return {
      formToken: f.token,
      error: String(e).slice(0, 500),
      errorStack: e instanceof Error ? (e.stack ?? "").slice(0, 800) : undefined,
    };
  }
}

/** Exclui (soft) tarefas cujo título comece com `prefix`, em todas as orgs do email. */
export async function debugDeleteTasksByPrefix(email: string, prefix: string): Promise<number> {
  const user = await getUserByEmail(email);
  if (!user) return 0;
  const orgs = await getUserOrgs(user.id);

  let count = 0;
  for (const org of orgs) {
    const rows = await withOrg(org.id, (tx) =>
      tx
        .update(tasks)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(ilike(tasks.title, `${prefix}%`), isNull(tasks.deletedAt)))
        .returning({ id: tasks.id }),
    ).catch(() => []);
    count += rows.length;
  }
  return count;
}
