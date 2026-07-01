import js from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * Config base de ESLint (flat) compartilhada.
 * Apps podem estender e adicionar plugins específicos (ex.: next).
 */
export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/.next/**", "**/.turbo/**", "**/node_modules/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
