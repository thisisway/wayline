"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getUserOrgs } from "@wayline/db";
import { auth } from "@/auth";
import { ACTIVE_ORG_COOKIE } from "@/lib/constants";

/** Troca a org ativa — valida que o usuário é membro antes de gravar o cookie. */
export async function switchOrg(orgId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  const orgs = await getUserOrgs(session.user.id);
  if (!orgs.some((o) => o.id === orgId)) return; // não é membro → ignora

  const store = await cookies();
  store.set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/app");
}
