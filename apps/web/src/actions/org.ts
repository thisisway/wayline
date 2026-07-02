"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createOrg, getUserOrgs } from "@wayline/db";
import { auth } from "@/auth";
import { ACTIVE_ORG_COOKIE } from "@/lib/constants";

async function setActiveOrgCookie(orgId: string): Promise<void> {
  const store = await cookies();
  store.set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

/** Troca a org ativa — valida que o usuário é membro antes de gravar o cookie. */
export async function switchOrg(orgId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  const orgs = await getUserOrgs(session.user.id);
  if (!orgs.some((o) => o.id === orgId)) return; // não é membro → ignora

  await setActiveOrgCookie(orgId);
  revalidatePath("/app");
}

/** Cria um novo workspace (org) e o torna ativo. */
export async function createWorkspace(name: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  const trimmed = name.trim();
  if (!trimmed) return;

  const orgId = await createOrg(session.user.id, trimmed);
  await setActiveOrgCookie(orgId);
  revalidatePath("/app");
}
