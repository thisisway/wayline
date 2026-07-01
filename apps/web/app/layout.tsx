import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // dark-first: o app de referência é a experiência premium escura.
    <html lang="pt-BR" className={`dark ${inter.variable} ${jakarta.variable}`}>
      <body>{children}</body>
    </html>
  );
}
