import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Client Drizzle (postgres.js) — conexão preguiçosa.
 *
 * Só conecta quando `getDb()` é chamado pela primeira vez, para que importar
 * `@wayline/db` (ex.: tipos) não exija `DATABASE_URL` — importante em build
 * estático e em ambientes sem banco (Fase 0).
 *
 * O isolamento por `org_id` (RLS) entra via `SET app.current_org` por request
 * numa etapa futura; aqui fica só a conexão base.
 */
export type Database = PostgresJsDatabase<typeof schema>;

let cached: { db: Database; sql: ReturnType<typeof postgres> } | undefined;

export function getDb(): Database {
  if (cached) return cached.db;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL não definida. Configure a env (ver .env.example) antes de acessar o banco.",
    );
  }

  const sql = postgres(url, { prepare: false });
  const db = drizzle(sql, { schema });
  cached = { db, sql };
  return db;
}

/** Fecha a conexão (útil em scripts/testes). */
export async function closeDb(): Promise<void> {
  if (cached) {
    await cached.sql.end();
    cached = undefined;
  }
}
