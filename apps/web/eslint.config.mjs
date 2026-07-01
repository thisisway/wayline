import shared from "@wayline/config/eslint";
import globals from "globals";

export default [
  { ignores: ["next-env.d.ts", ".next/**", "node_modules/**"] },
  ...shared,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, React: "readonly" },
    },
  },
];
