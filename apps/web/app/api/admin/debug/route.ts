import { debugDeleteTasksByPrefix, debugFindTasks } from "@wayline/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Diagnóstico pontual (uso único, remover depois). Protegido por CRON_SECRET.
// GET  ?secret=&email=&q=       -> lista tarefas cujo título contém `q`
// POST {secret, email, prefix}  -> exclui (soft) tarefas cujo título começa com `prefix`

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
  if (!email) return Response.json({ error: "email obrigatório" }, { status: 400 });
  const rows = await debugFindTasks(email, q);
  return Response.json({ count: rows.length, rows });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { secret?: string; email?: string; prefix?: string }
    | null;
  if (!authorized(body?.secret ?? null)) return new Response("unauthorized", { status: 401 });
  if (!body?.email || !body?.prefix) {
    return Response.json({ error: "email e prefix são obrigatórios" }, { status: 400 });
  }
  const deleted = await debugDeleteTasksByPrefix(body.email, body.prefix);
  return Response.json({ deleted });
}
