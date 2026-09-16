import { getPlatformSettings } from "@wayline/db";

// Sempre lê o banco (logo pode mudar); nunca prerenderiza no build.
export const dynamic = "force-dynamic";

/**
 * Serve a logo (tema claro) configurada no sistema como IMAGEM pública.
 * Necessário porque a logo é guardada como data-URL, que clientes de email
 * bloqueiam — aqui ela vira uma URL http normal (ex.: /brand/logo).
 * `?variant=dark` serve a versão de tema escuro, se houver.
 */
export async function GET(req: Request) {
  const dark = new URL(req.url).searchParams.get("variant") === "dark";
  const s = await getPlatformSettings().catch(() => null);
  const url = (dark ? s?.logoUrlDark || s?.logoUrl : s?.logoUrl || s?.logoUrlDark) ?? null;
  if (!url) return new Response(null, { status: 404 });

  // Já é uma URL pública: redireciona.
  if (/^https?:\/\//i.test(url)) return Response.redirect(url, 302);

  // data:<type>[;base64],<dados>
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(url);
  if (!m) return new Response(null, { status: 404 });
  const contentType = m[1] || "image/png";
  const body = m[2]
    ? Buffer.from(m[3] ?? "", "base64")
    : Buffer.from(decodeURIComponent(m[3] ?? ""));

  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=300",
    },
  });
}
