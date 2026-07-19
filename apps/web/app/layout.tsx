import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { getPlatformSettings } from "@wayline/db";
import { THEME_COOKIE } from "@/lib/constants";
import { hexToRgbTriple } from "@/lib/color";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

// Favicon padrão (marca Wayline) como data URL — usado quando não há custom.
const DEFAULT_FAVICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#1D66FF"/><polyline points="14,18 22,47 32,31 42,47 50,18" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  );

export async function generateMetadata(): Promise<Metadata> {
  let favicon = DEFAULT_FAVICON;
  let name = "Wayline";
  try {
    const p = await getPlatformSettings();
    if (p.faviconUrl) favicon = p.faviconUrl;
    if (p.name?.trim()) name = p.name.trim();
  } catch {
    /* mantém o padrão */
  }
  return {
    title: name,
    description: "Sistema operacional de trabalho para agências.",
    icons: { icon: [{ url: favicon }] },
  };
}

export const viewport: Viewport = {
  themeColor: "#0B1023",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // dark-first: sem cookie → dark. Lê no server p/ não piscar no primeiro paint.
  const light = (await cookies()).get(THEME_COOKIE)?.value === "light";

  // Marca global da plataforma (cor de destaque). Degrada p/ Way Blue se falhar.
  let brandTriple: string | null = null;
  try {
    brandTriple = hexToRgbTriple((await getPlatformSettings()).brandColor);
  } catch {
    brandTriple = null;
  }
  const brandStyle = brandTriple
    ? ({ "--wc-brand": brandTriple } as React.CSSProperties)
    : undefined;

  return (
    <html
      lang="pt-BR"
      className={`${light ? "" : "dark"} ${inter.variable} ${jakarta.variable}`}
    >
      <body style={brandStyle}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
