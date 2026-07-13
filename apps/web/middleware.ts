import { NextResponse, type NextRequest } from "next/server";

/**
 * Redirect canônico de domínio.
 *
 * Desligado por padrão: só age quando `CANONICAL_HOST` está definido (ex.:
 * `app.wayline.com.br`). Aí, qualquer requisição chegando por OUTRO domínio
 * público é redirecionada (308) para o canônico — mantendo uma única origem
 * (sessão/cookies/links de email consistentes).
 *
 * Guardas para não quebrar infra: ignora localhost, IPs e hosts internos sem
 * ponto (healthchecks do Easypanel), então nunca redireciona tráfego interno.
 */
const IP_RE = /^\d{1,3}(\.\d{1,3}){3}$/;

export function middleware(req: NextRequest) {
  const canonical = process.env.CANONICAL_HOST;
  if (!canonical) return NextResponse.next();

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const bare = host.split(":")[0] ?? "";

  if (
    !bare ||
    bare === canonical ||
    bare === "localhost" ||
    bare.startsWith("127.") ||
    IP_RE.test(bare) ||
    !bare.includes(".") // hosts internos (nome de serviço) não têm ponto
  ) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.protocol = "https:";
  url.hostname = canonical;
  url.port = "";
  return NextResponse.redirect(url, 308);
}

export const config = {
  // Roda em tudo, menos assets estáticos do Next.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
