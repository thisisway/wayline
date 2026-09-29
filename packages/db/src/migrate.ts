import postgres from "postgres";

/**
 * Aplica um blob SQL (statements separados por `--> statement-breakpoint`) numa
 * conexão privilegiada (DSN do dono das tabelas). Usado por um endpoint de
 * migração pontual. Cada statement roda isolado; erros são coletados, não
 * interrompem os demais (as migrações são idempotentes).
 */
export async function applyRawSql(
  dsn: string,
  blob: string,
): Promise<{ applied: number; errors: string[] }> {
  const sql = postgres(dsn, { max: 1 });
  const statements = blob
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    // pula pedaços que são só comentários/linha vazia
    .filter((s) => s && !/^(--[^\n]*\n?)+$/.test(s));

  const errors: string[] = [];
  let applied = 0;
  try {
    for (const st of statements) {
      try {
        await sql.unsafe(st);
        applied++;
      } catch (e) {
        errors.push(String(e).slice(0, 200));
      }
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
  return { applied, errors };
}
