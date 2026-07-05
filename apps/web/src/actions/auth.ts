"use server";

import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import {
  bumpVerificationAttempts,
  createOrg,
  createUser,
  deleteVerification,
  getUserByEmail,
  getVerification,
  upsertVerification,
} from "@wayline/db";
import { emailEnabled, sendVerificationEmail, sendWelcomeEmail } from "@/lib/email";

/** `verified: true` = conta já criada (email desativado no ambiente → sem código). */
export type StartResult =
  | { ok: true; verified: boolean }
  | { ok: false; error: string };

export type VerifyResult = { ok: true } | { ok: false; error: string };

const MAX_ATTEMPTS = 5;
const TTL_MS = 15 * 60 * 1000;

/** Etapa 1: valida, guarda o cadastro pendente e envia o código por email. */
export async function startRegistrationAction(
  name: string,
  email: string,
  password: string,
): Promise<StartResult> {
  const n = name.trim();
  const e = email.trim().toLowerCase();
  if (!n || !e) return { ok: false, error: "Preencha nome e email." };
  if (password.length < 6) return { ok: false, error: "A senha precisa ter ao menos 6 caracteres." };

  const existing = await getUserByEmail(e);
  if (existing) return { ok: false, error: "Esse email já está cadastrado." };

  const passwordHash = await bcrypt.hash(password, 10);

  // Sem email configurado: cria a conta direto (fallback p/ dev/local).
  if (!emailEnabled()) {
    const userId = await createUser(n, e, passwordHash);
    if (!userId) return { ok: false, error: "Esse email já está cadastrado." };
    await createOrg(userId, "Meu Workspace");
    return { ok: true, verified: true };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const codeHash = await bcrypt.hash(code, 10);
  await upsertVerification({
    email: e,
    name: n,
    passwordHash,
    codeHash,
    expiresAt: new Date(Date.now() + TTL_MS),
  });
  const sent = await sendVerificationEmail(e, code);
  if (!sent) return { ok: false, error: "Não foi possível enviar o email. Tente novamente." };
  return { ok: true, verified: false };
}

/** Etapa 2: confere o código e finalmente cria a conta. */
export async function verifyRegistrationAction(
  email: string,
  code: string,
): Promise<VerifyResult> {
  const e = email.trim().toLowerCase();
  const v = await getVerification(e);
  if (!v) return { ok: false, error: "Nenhum código pendente. Recomece o cadastro." };
  if (v.expiresAt.getTime() < Date.now()) {
    await deleteVerification(e);
    return { ok: false, error: "Código expirado. Recomece o cadastro." };
  }
  if (v.attempts >= MAX_ATTEMPTS) {
    await deleteVerification(e);
    return { ok: false, error: "Muitas tentativas. Recomece o cadastro." };
  }

  const match = await bcrypt.compare(code.trim(), v.codeHash);
  if (!match) {
    await bumpVerificationAttempts(e);
    return { ok: false, error: "Código inválido." };
  }

  const userId = await createUser(v.name, e, v.passwordHash);
  if (!userId) {
    await deleteVerification(e);
    return { ok: false, error: "Esse email já está cadastrado." };
  }
  await createOrg(userId, "Meu Workspace");
  await deleteVerification(e);
  await sendWelcomeEmail(e, v.name).catch(() => {});
  return { ok: true };
}

/** Reenvia o código (gera um novo) se houver cadastro pendente. */
export async function resendCodeAction(email: string): Promise<VerifyResult> {
  const e = email.trim().toLowerCase();
  const v = await getVerification(e);
  if (!v) return { ok: false, error: "Nenhum cadastro pendente. Recomece." };
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const codeHash = await bcrypt.hash(code, 10);
  await upsertVerification({
    email: e,
    name: v.name,
    passwordHash: v.passwordHash,
    codeHash,
    expiresAt: new Date(Date.now() + TTL_MS),
  });
  const sent = await sendVerificationEmail(e, code);
  return sent ? { ok: true } : { ok: false, error: "Falha ao reenviar." };
}
