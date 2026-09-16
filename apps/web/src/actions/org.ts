"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  addMemberByEmail,
  createInvitation,
  createFolder,
  createList,
  createListFromTemplate,
  createOrg,
  renameOrg,
  softDeleteOrg,
  setSpaceAppearance,
  setListIcon,
  setOrgIcon,
  renameSpace,
  deleteSpace,
  renameList,
  deleteList,
  createSpace,
  deleteFolder,
  deleteOrgTemplate,
  duplicateListStructure,
  moveListToFolder,
  renameFolder,
  getOrgTemplateSeed,
  listOrgTemplates,
  saveListAsTemplate,
  type OrgTemplateItem,
  getOrgBilling,
  getUserOrgs,
  getWorkspaceMembers,
  markNotificationsRead,
  removeMember,
  setMemberRole,
  setMemberModuleAccess,
  type AccessLevel,
  type ModuleKey,
  type WorkspaceMember,
} from "@wayline/db";
import { auth } from "@/auth";
import { ACTIVE_LIST_COOKIE, ACTIVE_ORG_COOKIE } from "@/lib/constants";
import { assertMember, assertRole, getSessionUser, getSessionUserId } from "@/lib/authz";
import { emailEnabled, sendInviteEmail, sendMemberAddedEmail } from "@/lib/email";
import { effectivePlan } from "@/lib/plans";
import { PROJECT_TEMPLATES } from "@/lib/project-templates";

/** Já atingiu o limite de membros do plano efetivo (considera trial)? */
async function atMemberLimit(orgId: string): Promise<boolean> {
  const { plan, trialEndsAt } = await getOrgBilling(orgId);
  const eff = effectivePlan(plan, trialEndsAt);
  if (eff.limits.members === Infinity) return false;
  const members = await getWorkspaceMembers(orgId);
  return members.length >= eff.limits.members;
}

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
  if (!name.trim() || !(await assertRole(orgId, "admin"))) return;
  await createSpace(orgId, name);
  revalidatePath("/app");
}

/** Renomeia um space. */
export async function renameSpaceAction(orgId: string, spaceId: string, name: string): Promise<void> {
  if (!name.trim() || !(await assertRole(orgId, "admin"))) return;
  await renameSpace(orgId, spaceId, name);
  revalidatePath("/app");
}

/** Exclui (soft) um space e suas listas. */
export async function deleteSpaceAction(orgId: string, spaceId: string): Promise<void> {
  if (!(await assertRole(orgId, "admin"))) return;
  await deleteSpace(orgId, spaceId);
  revalidatePath("/app");
}

/** Renomeia uma lista. */
export async function renameListAction(orgId: string, listId: string, name: string): Promise<void> {
  if (!name.trim() || !(await assertRole(orgId, "admin"))) return;
  await renameList(orgId, listId, name);
  revalidatePath("/app");
}

/** Exclui (soft) uma lista. */
export async function deleteListAction(orgId: string, listId: string): Promise<void> {
  if (!(await assertRole(orgId, "admin"))) return;
  await deleteList(orgId, listId);
  revalidatePath("/app");
}

/** Personaliza o ícone/cor de um space. */
export async function setSpaceAppearanceAction(
  orgId: string,
  spaceId: string,
  patch: { icon?: string | null; color?: string },
): Promise<void> {
  if (!(await assertRole(orgId, "admin"))) return;
  await setSpaceAppearance(orgId, spaceId, patch);
  revalidatePath("/app");
}

/** Personaliza o emoji/ícone de uma lista. */
export async function setListIconAction(
  orgId: string,
  listId: string,
  icon: string | null,
): Promise<void> {
  if (!(await assertRole(orgId, "admin"))) return;
  await setListIcon(orgId, listId, icon);
  revalidatePath("/app");
}

/** Personaliza o emoji/ícone do workspace. */
export async function setWorkspaceIconAction(orgId: string, icon: string | null): Promise<void> {
  if (!(await assertRole(orgId, "admin"))) return;
  await setOrgIcon(orgId, icon);
  revalidatePath("/app");
}

/** Cria uma lista num space (opcionalmente dentro de uma pasta) e a torna ativa. */
export async function createListAction(
  orgId: string,
  spaceId: string,
  name: string,
  folderId: string | null = null,
): Promise<void> {
  if (!name.trim() || !(await assertRole(orgId, "admin"))) return;
  const listId = await createList(orgId, spaceId, name, folderId);
  await setActiveListCookie(listId);
  revalidatePath("/app");
}

/** Cria uma pasta num space. */
export async function createFolderAction(
  orgId: string,
  spaceId: string,
  name: string,
): Promise<void> {
  if (!name.trim() || !(await assertRole(orgId, "admin"))) return;
  await createFolder(orgId, spaceId, name);
  revalidatePath("/app");
}

export async function renameFolderAction(
  orgId: string,
  folderId: string,
  name: string,
): Promise<void> {
  if (!name.trim() || !(await assertRole(orgId, "admin"))) return;
  await renameFolder(orgId, folderId, name);
  revalidatePath("/app");
}

export async function deleteFolderAction(orgId: string, folderId: string): Promise<void> {
  if (!(await assertRole(orgId, "admin"))) return;
  await deleteFolder(orgId, folderId);
  revalidatePath("/app");
}

/** Move uma lista para uma pasta (folderId) ou a solta no space (null). */
export async function moveListToFolderAction(
  orgId: string,
  listId: string,
  folderId: string | null,
  spaceId?: string,
): Promise<void> {
  if (!(await assertRole(orgId, "admin"))) return;
  await moveListToFolder(orgId, listId, folderId, spaceId);
  revalidatePath("/app");
}

/** Cria um projeto a partir de um template (space existente ou novo) e o ativa. */
export async function createProjectFromTemplateAction(
  orgId: string,
  templateId: string,
  spaceId: string | null,
  newSpaceName: string | null,
): Promise<boolean> {
  if (!(await assertRole(orgId, "admin"))) return false;
  // Built-in (id conhecido) ou template salvo da org (uuid).
  const builtin = PROJECT_TEMPLATES.find((t) => t.id === templateId);
  const seed = builtin
    ? { listName: builtin.listName, columns: builtin.columns, tasks: builtin.tasks }
    : await getOrgTemplateSeed(orgId, templateId);
  if (!seed) return false;
  let sid = spaceId;
  if (!sid && newSpaceName?.trim()) sid = await createSpace(orgId, newSpaceName.trim());
  if (!sid) return false;
  const listId = await createListFromTemplate(orgId, sid, seed);
  await setActiveListCookie(listId);
  revalidatePath("/app");
  return true;
}

/** Salva a estrutura de uma lista como template reutilizável da org. */
export async function saveBoardAsTemplateAction(
  orgId: string,
  listId: string,
  name: string,
  description = "",
): Promise<boolean> {
  if (!name.trim() || !(await assertRole(orgId, "admin"))) return false;
  const uid = await getSessionUserId();
  const id = await saveListAsTemplate(orgId, listId, name, description, uid);
  return id !== null;
}

export async function listOrgTemplatesAction(orgId: string): Promise<OrgTemplateItem[]> {
  if (!(await assertMember(orgId))) return [];
  return listOrgTemplates(orgId);
}

export async function deleteOrgTemplateAction(orgId: string, id: string): Promise<void> {
  if (!(await assertRole(orgId, "admin"))) return;
  await deleteOrgTemplate(orgId, id);
}

/** Duplica a estrutura de uma lista (sem tarefas) e ativa a cópia. */
export async function duplicateListAction(orgId: string, listId: string): Promise<void> {
  if (!(await assertRole(orgId, "admin"))) return;
  const newId = await duplicateListStructure(orgId, listId);
  await setActiveListCookie(newId);
  revalidatePath("/app");
}

// --- Membros ---------------------------------------------------------------
export async function listMembersAction(orgId: string): Promise<WorkspaceMember[]> {
  if (!(await assertMember(orgId))) return [];
  return getWorkspaceMembers(orgId);
}

/**
 * Resultado unificado do campo "Adicionar":
 *  - added   → já tinha conta, entrou na hora (e recebeu um email de aviso)
 *  - already → já era membro
 *  - invited → não tinha conta: enviamos um convite por email
 *  - not_found → não tinha conta e o email está desativado (peça p/ criar conta)
 *  - error   → email habilitado mas o envio falhou
 */
export type AddMemberResult = "added" | "already" | "invited" | "not_found" | "error" | "limit";

export async function addMemberAction(orgId: string, email: string): Promise<AddMemberResult> {
  const value = email.trim();
  if (!value || !(await assertRole(orgId, "admin"))) return "not_found";
  if (await atMemberLimit(orgId)) return "limit";

  const inviter = await getSessionUser();
  const orgName =
    (inviter ? await getUserOrgs(inviter.id) : []).find((o) => o.id === orgId)?.name ?? "workspace";
  const inviterName = inviter?.name ?? "Alguém";

  const status = await addMemberByEmail(orgId, value);

  // Já tem conta e entrou: avisa por email (best-effort, nunca quebra a ação).
  if (status === "added") {
    if (emailEnabled()) await sendMemberAddedEmail(value, orgName, inviterName).catch(() => {});
    revalidatePath("/app");
    return "added";
  }

  if (status === "already") return "already";

  // status === "not_found": não tem conta ainda → manda um convite por email.
  if (!emailEnabled()) return "not_found";
  const invite = await createInvitation(orgId, inviter?.id ?? null);
  const ok = await sendInviteEmail(value, orgName, invite.token, inviterName);
  revalidatePath("/app");
  return ok ? "invited" : "error";
}

export async function removeMemberAction(orgId: string, userId: string): Promise<void> {
  if (!(await assertRole(orgId, "admin"))) return;
  const members = await getWorkspaceMembers(orgId);
  const target = members.find((m) => m.userId === userId);
  if (!target || target.role === "owner") return; // não remove owners
  await removeMember(orgId, userId);
  revalidatePath("/app");
}

/** Altera o papel de um membro (admin+; não altera owners). */
export async function setMemberRoleAction(
  orgId: string,
  userId: string,
  role: "admin" | "member" | "guest",
): Promise<void> {
  if (!(await assertRole(orgId, "admin"))) return;
  await setMemberRole(orgId, userId, role);
  revalidatePath("/app");
}

/** Define o acesso de um membro a um módulo (admin+; não altera owners). */
export async function setMemberModuleAccessAction(
  orgId: string,
  userId: string,
  moduleKey: ModuleKey,
  level: AccessLevel,
): Promise<void> {
  if (!(await assertRole(orgId, "admin"))) return;
  await setMemberModuleAccess(orgId, userId, moduleKey, level);
  revalidatePath("/app");
}

/** Marca todas as notificações do usuário na org como lidas. */
export async function markInboxReadAction(orgId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id || !(await assertMember(orgId))) return;
  await markNotificationsRead(orgId, session.user.id);
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

/** Renomeia o workspace (owner/admin). */
export async function renameWorkspaceAction(orgId: string, name: string): Promise<boolean> {
  if (!name.trim() || !(await assertRole(orgId, "admin"))) return false;
  await renameOrg(orgId, name);
  revalidatePath("/app");
  return true;
}

export type DeleteWorkspaceResult =
  | { ok: true }
  | { ok: false; error: "nosession" | "forbidden" | "last" | "notfound" | "name" };

/** Exclui o workspace (soft) — só owner, confirmando o nome, e nunca o último. */
export async function deleteWorkspaceAction(
  orgId: string,
  confirmName: string,
): Promise<DeleteWorkspaceResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "nosession" };
  if (!(await assertRole(orgId, "owner"))) return { ok: false, error: "forbidden" };
  const orgs = await getUserOrgs(session.user.id);
  if (orgs.length <= 1) return { ok: false, error: "last" };
  const target = orgs.find((o) => o.id === orgId);
  if (!target) return { ok: false, error: "notfound" };
  if (confirmName.trim() !== target.name) return { ok: false, error: "name" };

  await softDeleteOrg(orgId);
  const other = orgs.find((o) => o.id !== orgId);
  if (other) await setActiveOrgCookie(other.id); // troca a org ativa
  revalidatePath("/app");
  return { ok: true };
}
