import { eq, sql } from "drizzle-orm";
import { getDb } from "../client";
import { passwordResets } from "../schema";

export interface PasswordResetRow {
  email: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
}

/** Grava (substituindo) o código de recuperação pendente de um email. */
export async function upsertPasswordReset(v: {
  email: string;
  codeHash: string;
  expiresAt: Date;
}): Promise<void> {
  const db = getDb();
  await db.delete(passwordResets).where(eq(passwordResets.email, v.email));
  await db.insert(passwordResets).values({ ...v, attempts: 0 });
}

export async function getPasswordReset(email: string): Promise<PasswordResetRow | null> {
  const db = getDb();
  const row = await db.query.passwordResets.findFirst({
    where: eq(passwordResets.email, email),
  });
  if (!row) return null;
  return {
    email: row.email,
    codeHash: row.codeHash,
    attempts: row.attempts,
    expiresAt: row.expiresAt,
  };
}

export async function bumpPasswordResetAttempts(email: string): Promise<void> {
  const db = getDb();
  await db
    .update(passwordResets)
    .set({ attempts: sql`${passwordResets.attempts} + 1` })
    .where(eq(passwordResets.email, email));
}

export async function deletePasswordReset(email: string): Promise<void> {
  const db = getDb();
  await db.delete(passwordResets).where(eq(passwordResets.email, email));
}
