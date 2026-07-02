import { sql } from "drizzle-orm";
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

/** Transação escopada por org (o `tx` passado a `withOrg`). */
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

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

/**
 * Executa `fn` dentro de uma transação com `app.current_org` setado — a base
 * do isolamento por RLS. `set_config(..., true)` é local à transação, então
 * funciona com o pool de conexões (não vaza entre requests).
 */
export async function withOrg<T>(orgId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_org', ${orgId}, true)`);
    return fn(tx);
  });
}

/**
 * Como `withOrg`, mas seta `app.current_user` — usado no login, quando ainda
 * não há org no contexto, para o usuário ler as próprias memberships (a policy
 * de memberships permite `user_id = app.current_user`).
 */
export async function withUser<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_user', ${userId}, true)`);
    return fn(tx);
  });
}

/** Fecha a conexão (útil em scripts/testes). */
export async function closeDb(): Promise<void> {
  if (cached) {
    await cached.sql.end();
    cached = undefined;
  }
}
