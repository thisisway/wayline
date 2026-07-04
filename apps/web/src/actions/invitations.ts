"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  acceptInvitation,
  createInvitation,
  listInvitations,
  revokeInvitation,
  type AcceptResult,
  type InvitationDTO,
} from "@wayline/db";
import { assertMember, getSessionUserId } from "@/lib/authz";
import { ACTIVE_ORG_COOKIE } from "@/lib/constants";

export async function listInvitesAction(orgId: string): Promise<InvitationDTO[]> {
  if (!(await assertMember(orgId))) return [];
  return listInvitations(orgId);
}

export async function createInviteAction(orgId: string): Promise<InvitationDTO | null> {
  if (!(await assertMember(orgId))) return null;
  const userId = await getSessionUserId();
  const invite = await createInvitation(orgId, userId);
  revalidatePath("/app");
  return invite;
}

export async function revokeInviteAction(orgId: string, id: string): Promise<void> {
  if (!(await assertMember(orgId))) return;
  await revokeInvitation(orgId, id);
  revalidatePath("/app");
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
