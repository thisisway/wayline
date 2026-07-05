"use server";

import bcrypt from "bcryptjs";
import { createOrg, createUser } from "@wayline/db";
import { sendWelcomeEmail } from "@/lib/email";

export type RegisterResult = { ok: true } | { ok: false; error: string };

/** Cria conta (signup) + um workspace inicial. Login é feito no client depois. */
export async function registerAction(
  name: string,
  email: string,
  password: string,
): Promise<RegisterResult> {
  const n = name.trim();
  const e = email.trim().toLowerCase();
  if (!n || !e) return { ok: false, error: "Preencha nome e email." };
  if (password.length < 6) return { ok: false, error: "A senha precisa ter ao menos 6 caracteres." };

  const hash = await bcrypt.hash(password, 10);
  const userId = await createUser(n, e, hash);
  if (!userId) return { ok: false, error: "Esse email já está cadastrado." };

  await createOrg(userId, "Meu Workspace");
  await sendWelcomeEmail(e, n).catch(() => {});
  return { ok: true };
}
