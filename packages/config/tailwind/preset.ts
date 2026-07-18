import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

/**
 * Way Cloud Design System — preset compartilhado.
 *
 * Cores de marca e semânticas são fixas (identidade Way Cloud).
 * Superfícies e textos usam CSS variables (`--wc-*`) para alternar
 * entre light e dark. Ver `globals.css`.
 */
const preset: Omit<Config, "content"> = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Way Blue (marca) — DEFAULT via CSS var p/ permitir marca custom por org.
        brand: {
          DEFAULT: "rgb(var(--wc-brand) / <alpha-value>)",
          10: "#E8F0FF",
          20: "#C2D5FF",
          40: "#7FABFF",
          80: "#1349C0",
        },
        // Dark Way
        dark: "#0B1023",
        // Semânticas
        success: "#17C86A",
        warning: "#FFB800",
        danger: "#FF3B30",

        // Superfícies / texto (theme-able via CSS vars)
        canvas: "rgb(var(--wc-canvas) / <alpha-value>)",
        surface: "rgb(var(--wc-surface) / <alpha-value>)",
        elevated: "rgb(var(--wc-elevated) / <alpha-value>)",
        border: "rgb(var(--wc-border) / <alpha-value>)",
        ring: "rgb(var(--wc-ring) / <alpha-value>)",
        foreground: "rgb(var(--wc-foreground) / <alpha-value>)",
        muted: "rgb(var(--wc-muted) / <alpha-value>)",
        subtle: "rgb(var(--wc-subtle) / <alpha-value>)",
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        pill: "999px",
      },
      boxShadow: {
        xs: "0 1px 3px rgba(11,16,35,.08)",
        sm: "0 2px 8px rgba(11,16,35,.10)",
        md: "0 4px 16px rgba(11,16,35,.12)",
        lg: "0 8px 32px rgba(11,16,35,.15)",
        xl: "0 16px 48px rgba(29,102,255,.20)", // blue glow
      },
      spacing: {
        // escala 8pt (complementa a escala padrão do Tailwind)
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "5": "20px",
        "6": "24px",
        "8": "32px",
        "10": "40px",
        "12": "48px",
      },
      fontFamily: {
        display: ["var(--font-display)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        sans: ["var(--font-ui)", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        display: ["48px", { lineHeight: "1.05", fontWeight: "800", letterSpacing: "-0.03em" }],
        h1: ["32px", { lineHeight: "1.15", fontWeight: "800", letterSpacing: "-0.02em" }],
        h2: ["24px", { lineHeight: "1.2", fontWeight: "700", letterSpacing: "-0.01em" }],
        h3: ["18px", { lineHeight: "1.3", fontWeight: "700" }],
        body: ["15px", { lineHeight: "1.6", fontWeight: "400" }],
        ui: ["14px", { lineHeight: "1.45", fontWeight: "400" }],
        dense: ["13px", { lineHeight: "1.4", fontWeight: "400" }],
        label: ["12px", { lineHeight: "1.3", fontWeight: "700", letterSpacing: "0.06em" }],
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
      },
    },
  },
  plugins: [animate],
};

export default preset;
