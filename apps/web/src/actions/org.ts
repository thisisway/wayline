"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  addMemberByEmail,
  createList,
  createOrg,
  createSpace,
  getWorkspaceMembers,
  removeMember,
  type AddMemberStatus,
  type WorkspaceMember,
} from "@wayline/db";
import { auth } from "@/auth";
import { ACTIVE_LIST_COOKIE, ACTIVE_ORG_COOKIE } from "@/lib/constants";
import { assertMember } from "@/lib/authz";

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  secure: process.env.NODE_ENV === "production",
} as const;

async function setActiveOrgCookie(orgId: string): Promise<void> {
  (await cookies()).set(ACTIVE_ORG_COOKIE, orgId, cookieOpts);
}

async function setActiveListCookie(listId: string): Promise<void> {
  (await cookies()).set(ACTIVE_LIST_COOKIE, listId, cookieOpts);
}

/** Troca a org ativa — valida que o usuário é membro antes de gravar o cookie. */
export async function switchOrg(orgId: string): Promise<void> {
  if (!(await assertMember(orgId))) return;
  await setActiveOrgCookie(orgId);
  revalidatePath("/app");
}

/**
 * Troca a lista ativa (board da sidebar). Não valida aqui: o `page` só
 * carrega a lista se ela pertencer à org ativa (RLS + checagem da nav);
 * uma lista de outra org simplesmente cai no board padrão.
 */
export async function switchList(listId: string): Promise<void> {
  await setActiveListCookie(listId);
  revalidatePath("/app");
}

/** Cria um space na org ativa. */
export async function createSpaceAction(orgId: string, name: string): Promise<void> {
  if (!name.trim() || !(await assertMember(orgId))) return;
  await createSpace(orgId, name);
  revalidatePath("/app");
}

/** Cria uma lista num space e a torna a lista ativa. */
export async function createListAction(
  orgId: string,
  spaceId: string,
  name: string,
): Promise<void> {
  if (!name.trim() || !(await assertMember(orgId))) return;
  const listId = await createList(orgId, spaceId, name);
  await setActiveListCookie(listId);
  revalidatePath("/app");
}

// --- Membros ---------------------------------------------------------------
export async function listMembersAction(orgId: string): Promise<WorkspaceMember[]> {
  if (!(await assertMember(orgId))) return [];
  return getWorkspaceMembers(orgId);
}

export async function addMemberAction(orgId: string, email: string): Promise<AddMemberStatus> {
  if (!email.trim() || !(await assertMember(orgId))) return "not_found";
  const status = await addMemberByEmail(orgId, email);
  revalidatePath("/app");
  return status;
}

export async function removeMemberAction(orgId: string, userId: string): Promise<void> {
  if (!(await assertMember(orgId))) return;
  const members = await getWorkspaceMembers(orgId);
  const target = members.find((m) => m.userId === userId);
  if (!target || target.role === "owner") return; // não remove owners
  await removeMember(orgId, userId);
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
