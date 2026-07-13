"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import {
  getUserPasswordHash,
  getUserProfile,
  setUserPasswordHash,
  updateUserProfile,
  type UserProfile,
} from "@wayline/db";
import { getSessionUserId } from "@/lib/authz";

export async function getProfileAction(): Promise<UserProfile | null> {
  const uid = await getSessionUserId();
  if (!uid) return null;
  return getUserProfile(uid);
}

export async function updateProfileAction(patch: {
  name?: string;
  avatarUrl?: string | null;
}): Promise<boolean> {
  const uid = await getSessionUserId();
  if (!uid) return false;
  if (patch.name != null && !patch.name.trim()) return false; // nome não pode ficar vazio
  const ok = await updateUserProfile(uid, patch);
  if (ok) revalidatePath("/app");
  return ok;
}

export type ChangePasswordResult =
  | "ok"
  | "wrong"
  | "weak"
  | "nosession"
  | "nopassword";

/** Troca a senha: confere a atual e grava a nova (mín. 8 caracteres). */
export async function changePasswordAction(
  current: string,
  next: string,
): Promise<ChangePasswordResult> {
  const uid = await getSessionUserId();
  if (!uid) return "nosession";
  if (next.length < 8) return "weak";
  const hash = await getUserPasswordHash(uid);
  if (!hash) return "nopassword";
  const ok = await bcrypt.compare(current, hash);
  if (!ok) return "wrong";
  await setUserPasswordHash(uid, await bcrypt.hash(next, 10));
  return "ok";
}
