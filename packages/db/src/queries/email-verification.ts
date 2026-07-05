import { eq, sql } from "drizzle-orm";
import { getDb } from "../client";
import { emailVerifications } from "../schema";

export interface VerificationRow {
  email: string;
  name: string;
  passwordHash: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
}

/** Grava (substituindo) a verificação pendente de um email. */
export async function upsertVerification(v: {
  email: string;
  name: string;
  passwordHash: string;
  codeHash: string;
  expiresAt: Date;
}): Promise<void> {
  const db = getDb();
  await db.delete(emailVerifications).where(eq(emailVerifications.email, v.email));
  await db.insert(emailVerifications).values({ ...v, attempts: 0 });
}

export async function getVerification(email: string): Promise<VerificationRow | null> {
  const db = getDb();
  const row = await db.query.emailVerifications.findFirst({
    where: eq(emailVerifications.email, email),
  });
  if (!row) return null;
  return {
    email: row.email,
    name: row.name,
    passwordHash: row.passwordHash,
    codeHash: row.codeHash,
    attempts: row.attempts,
    expiresAt: row.expiresAt,
  };
}

export async function bumpVerificationAttempts(email: string): Promise<void> {
  const db = getDb();
  await db
    .update(emailVerifications)
    .set({ attempts: sql`${emailVerifications.attempts} + 1` })
    .where(eq(emailVerifications.email, email));
}

export async function deleteVerification(email: string): Promise<void> {
  const db = getDb();
  await db.delete(emailVerifications).where(eq(emailVerifications.email, email));
}
