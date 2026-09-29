import { submitLead } from "@wayline/db";
import { pokeList } from "@/actions/live";
import { rateLimit, MIN } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Max-Age": "86400",
};

/** Preflight CORS — permite POST de qualquer landing page. */
export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

/**
 * Intake público de leads. Qualquer landing page/sistema faz POST aqui:
 *   POST /api/forms/<token>        (JSON ou form-urlencoded)
 * Cria a tarefa na 1ª coluna da lista-alvo do formulário (ex.: "A fazer").
 * Campos livres. Campos de controle: `_hp`/`_gotcha` (honeypot), `_redirect`.
 */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Anti-spam por IP (o token não é segredo forte; é um identificador público).
  if (!(await rateLimit("lead-intake", 60, 10 * MIN))) {
    return json({ error: "rate_limited" }, 429);
  }

  // Aceita JSON ou form-urlencoded/multipart (form HTML nativo).
  const ct = req.headers.get("content-type") ?? "";
  let data: Record<string, string> = {};
  let redirect: string | null = null;
  try {
    if (ct.includes("application/json")) {
      const body = await req.json();
      data = body && typeof body === "object" ? body : {};
    } else {
      const form = await req.formData();
      for (const [k, v] of form.entries()) data[k] = typeof v === "string" ? v : "";
    }
  } catch {
    return json({ error: "bad_payload" }, 400);
  }
  redirect = typeof data._redirect === "string" ? data._redirect : null;

  // Honeypot: bot preencheu um campo oculto → aceita silenciosamente e descarta.
  const trapped = Boolean((data._hp && data._hp.trim()) || (data._gotcha && data._gotcha.trim()));

  let created = false;
  let target = "none";
  if (!trapped) {
    const res = await submitLead(token, data).catch(() => null);
    if (!res || !res.ok) return json({ error: "form_not_found_or_unpublished" }, 404);
    created = res.created;
    target = res.target;
    if (res.listId) await pokeList(res.listId).catch(() => {});
  }

  // Form HTML nativo com _redirect → manda o visitante pra página de obrigado.
  if (redirect && /^https?:\/\//i.test(redirect)) {
    return new Response(null, { status: 303, headers: { Location: redirect, ...CORS } });
  }
  return json({ ok: true, target, created });
}
