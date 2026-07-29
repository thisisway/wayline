import { NextResponse, type NextRequest } from "next/server";
import { generateRecurringInvoices } from "@wayline/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Cron: gera a próxima fatura (RASCUNHO) das recorrências mensais vencidas.
 * Protegido por `?token=` igual a CRON_SECRET. Agende no Easypanel (ex.: diário).
 *   GET /api/cron/invoices?token=SEU_SEGREDO
 */
async function run(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const token = req.nextUrl.searchParams.get("token");
  if (!expected || token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const created = await generateRecurringInvoices();
  return NextResponse.json({ ok: true, created });
}

export const GET = run;
export const POST = run;
