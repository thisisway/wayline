import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPlatformSettings } from "@wayline/db";
import { auth } from "@/auth";
import { Landing } from "@/components/landing/landing";

export const dynamic = "force-dynamic";

/**
 * Raiz host-aware:
 *  - Domínio de landing (ex.: wayline.com.br) → mostra a Landing (marketing).
 *  - Domínio do app (CANONICAL_HOST, ex.: app.wayline.com.br) → vai pro app
 *    (logado → /app; deslogado → /login).
 *  - Dev/desconhecido → logado vai pro /app; deslogado vê a Landing.
 */
export default async function HomePage() {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(":")[0]!.toLowerCase();
  const landingHosts = new Set(
    (process.env.LANDING_HOSTS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  const canonical = (process.env.CANONICAL_HOST ?? "").toLowerCase();
  const isLanding = landingHosts.has(host);
  const isApp = Boolean(canonical) && host === canonical;

  const session = await auth();

  // Domínio do app: nunca mostra marketing.
  if (isApp) {
    redirect(session?.orgId ? "/app" : "/login");
  }
  // Logado fora do domínio de landing → app.
  if (session?.orgId && !isLanding) redirect("/app");

  const platform = await getPlatformSettings();
  // No domínio de landing, os botões de entrar/cadastrar apontam pro app.
  const authBase = isLanding ? (process.env.APP_URL ?? "") : "";

  return (
    <Landing
      brandName={platform.name ?? "Wayline"}
      logoLight={platform.logoUrl}
      logoDark={platform.logoUrlDark}
      authBase={authBase}
    />
  );
}
