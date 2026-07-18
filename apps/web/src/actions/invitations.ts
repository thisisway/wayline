"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  acceptInvitation,
  createInvitation,
  getOrgBilling,
  getUserOrgs,
  getWorkspaceMembers,
  listInvitations,
  revokeInvitation,
  type AcceptResult,
  type InvitationDTO,
} from "@wayline/db";
import { assertMember, assertRole, getSessionUser, getSessionUserId } from "@/lib/authz";
import { ACTIVE_ORG_COOKIE } from "@/lib/constants";
import { emailEnabled, sendInviteEmail } from "@/lib/email";
import { effectivePlan } from "@/lib/plans";

/** Já atingiu o limite de membros do plano efetivo? (bloqueia novos convites) */
async function atMemberLimit(orgId: string): Promise<boolean> {
  const { plan, trialEndsAt } = await getOrgBilling(orgId);
  const eff = effectivePlan(plan, trialEndsAt);
  if (eff.limits.members === Infinity) return false;
  const members = await getWorkspaceMembers(orgId);
  return members.length >= eff.limits.members;
}

export async function listInvitesAction(orgId: string): Promise<InvitationDTO[]> {
  if (!(await assertMember(orgId))) return [];
  return listInvitations(orgId);
}

export async function createInviteAction(orgId: string): Promise<InvitationDTO | null> {
  if (!(await assertRole(orgId, "admin"))) return null;
  if (await atMemberLimit(orgId)) return null;
  const userId = await getSessionUserId();
  const invite = await createInvitation(orgId, userId);
  revalidatePath("/app");
  return invite;
}

export async function revokeInviteAction(orgId: string, id: string): Promise<void> {
  if (!(await assertRole(orgId, "admin"))) return;
  await revokeInvitation(orgId, id);
  revalidatePath("/app");
}

export type SendInviteStatus = "sent" | "forbidden" | "disabled" | "error" | "limit";

/** Cria um convite e envia o link por email para o endereço informado. */
export async function sendInviteByEmailAction(
  orgId: string,
  email: string,
): Promise<SendInviteStatus> {
  if (!(await assertRole(orgId, "admin"))) return "forbidden";
  if (await atMemberLimit(orgId)) return "limit";
  if (!email.trim()) return "error";
  if (!emailEnabled()) return "disabled";
  const user = await getSessionUser();
  if (!user) return "forbidden";
  const orgs = await getUserOrgs(user.id);
  const orgName = orgs.find((o) => o.id === orgId)?.name ?? "workspace";
  const invite = await createInvitation(orgId, user.id);
  const ok = await sendInviteEmail(email.trim(), orgName, invite.token, user.name);
  revalidatePath("/app");
  return ok ? "sent" : "error";
}

export type AcceptInviteResult = AcceptResult | { status: "needAuth" };

/** Aceita um convite: exige login; ao entrar, torna a org a ativa. */
export async function acceptInviteAction(token: string): Promise<AcceptInviteResult> {
  const userId = await getSessionUserId();
  if (!userId) return { status: "needAuth" };
  const result = await acceptInvitation(token, userId);
  if (result.status === "joined" || result.status === "already") {
    (await cookies()).set(ACTIVE_ORG_COOKIE, result.orgId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      secure: process.env.NODE_ENV === "production",
    });
    revalidatePath("/app");
  }
  return result;
}
