import { NextResponse, type NextRequest } from "next/server";
import { autoResolveStaleTickets } from "@wayline/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Cron: resolve automaticamente chamados de suporte parados (>42h após a
 * resposta do admin, sem retorno do usuário). Protegido por `?token=` igual a
 * CRON_SECRET. Agende no Easypanel (ex.: a cada 1h) chamando esta URL.
 *   GET /api/cron/support?token=SEU_SEGREDO
 */
async function run(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const token = req.nextUrl.searchParams.get("token");
  if (!expected || token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const resolved = await autoResolveStaleTickets();
  return NextResponse.json({ ok: true, resolved });
}

export const GET = run;
export const POST = run;
