import {
  debugCallSubmitLead,
  debugCreateAccessEntry,
  debugDeleteTasksByPrefix,
  debugFindForms,
  debugFindFormResponses,
  debugFindStatuses,
  debugFindTasks,
  debugSimulateFormSubmit,
  debugTableColumns,
} from "@wayline/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Diagnóstico pontual (uso único, remover depois). Protegido por CRON_SECRET.
// GET  ?secret=&email=&q=&kind=tasks|forms  -> lista tarefas OU formulários (título contém `q`)
// POST {secret, email, prefix}              -> exclui (soft) tarefas cujo título começa com `prefix`

function authorized(secret: string | null): boolean {
  return !!process.env.CRON_SECRET && secret === process.env.CRON_SECRET;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!authorized(url.searchParams.get("secret"))) {
    return new Response("unauthorized", { status: 401 });
  }
  const email = url.searchParams.get("email") ?? "";
  const q = url.searchParams.get("q") ?? "";
  const kind = url.searchParams.get("kind") ?? "tasks";
  if (!email) return Response.json({ error: "email obrigatório" }, { status: 400 });
  if (kind === "forms") {
    const rows = await debugFindForms(email, q);
    return Response.json({ count: rows.length, rows });
  }
  if (kind === "responses") {
    const rows = await debugFindFormResponses(email, q);
    return Response.json({ count: rows.length, rows });
  }
  if (kind === "statuses") {
    const rows = await debugFindStatuses(email, q);
    return Response.json({ count: rows.length, rows });
  }
  if (kind === "columns") {
    const columns = await debugTableColumns(q);
    return Response.json({ columns });
  }
  const rows = await debugFindTasks(email, q);
  return Response.json({ count: rows.length, rows });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | {
        secret?: string;
        email?: string;
        prefix?: string;
        simulateFormId?: string;
        submitLeadFormId?: string;
        submitLeadData?: Record<string, string>;
        createAccessEntryTableId?: string;
      }
    | null;
  if (!authorized(body?.secret ?? null)) return new Response("unauthorized", { status: 401 });

  if (body?.simulateFormId) {
    const result = await debugSimulateFormSubmit(body.simulateFormId);
    return Response.json(result);
  }

  if (body?.submitLeadFormId) {
    const result = await debugCallSubmitLead(body.submitLeadFormId, body.submitLeadData ?? {});
    return Response.json(result);
  }

  if (body?.createAccessEntryTableId) {
    if (!body.email) return Response.json({ error: "email obrigatório" }, { status: 400 });
    const result = await debugCreateAccessEntry(body.email, body.createAccessEntryTableId);
    return Response.json(result);
  }

  if (!body?.email || !body?.prefix) {
    return Response.json({ error: "email e prefix são obrigatórios" }, { status: 400 });
  }
  const deleted = await debugDeleteTasksByPrefix(body.email, body.prefix);
  return Response.json({ deleted });
}
