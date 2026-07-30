import type { MetadataRoute } from "next";
import { getPlatformSettings } from "@wayline/db";

// White-label: nome/ícone podem mudar por plataforma.
export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let name = "Wayline";
  try {
    const p = await getPlatformSettings();
    if (p.name?.trim()) name = p.name.trim();
  } catch {
    /* mantém o padrão */
  }

  // PNGs 192/512 são obrigatórios para o Chrome/Edge oferecerem "Instalar".
  // (Ícone white-label vira favicon; para o app instalável usamos os PNGs.)
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
      { src: "/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
