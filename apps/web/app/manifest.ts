import type { MetadataRoute } from "next";
import { getPlatformSettings } from "@wayline/db";

// White-label: nome/ícone podem mudar por plataforma.
export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let name = "Wayline";
  let icon = "/pwa-icon.svg";
  let type: string | undefined = "image/svg+xml";

  try {
    const p = await getPlatformSettings();
    if (p.name?.trim()) name = p.name.trim();
    // Ícone custom (data URL) tem prioridade; detecta o mime pelo prefixo.
    if (p.iconUrl) {
      icon = p.iconUrl;
      const m = /^data:(image\/[a-z+]+)/i.exec(p.iconUrl);
      type = m?.[1] ?? undefined;
    }
  } catch {
    /* mantém o padrão */
  }

  return {
    name,
    short_name: name,
    description: "Sistema operacional de trabalho para agências.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#0B1023",
    theme_color: "#0B1023",
    lang: "pt-BR",
    icons: [
      { src: icon, sizes: "any", ...(type ? { type } : {}), purpose: "any" },
      { src: icon, sizes: "any", ...(type ? { type } : {}), purpose: "maskable" },
    ],
  };
}
