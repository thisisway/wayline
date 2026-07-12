import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { THEME_COOKIE } from "@/lib/constants";
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

export const metadata: Metadata = {
  title: "Wayline — Work OS para agências",
  description:
    "Sistema operacional de trabalho nativo para agências de marketing digital.",
};

export const viewport: Viewport = {
  themeColor: "#0B1023",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // dark-first: sem cookie → dark. Lê no server p/ não piscar no primeiro paint.
  const light = (await cookies()).get(THEME_COOKIE)?.value === "light";
  return (
    <html
      lang="pt-BR"
      className={`${light ? "" : "dark"} ${inter.variable} ${jakarta.variable}`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
