import type { Config } from "drizzle-kit";

/**
 * Config do Drizzle Kit — preparada, mas NÃO usada nesta fase (sem Postgres).
 * Quando a conexão entrar, defina DATABASE_URL e rode `drizzle-kit generate`.
 */
export default {
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/wayline",
  },
  // RLS por org_id será adicionada nas migrações (policies) numa etapa futura.
} satisfies Config;
