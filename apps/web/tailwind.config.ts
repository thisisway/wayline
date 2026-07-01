import type { Config } from "tailwindcss";
import preset from "@wayline/config/tailwind/preset";

export default {
  presets: [preset],
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    // escaneia os componentes da lib de UI para não perder classes
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
} satisfies Config;
