import { randomBytes } from "node:crypto";
import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { getDb, withOrg } from "../client";
import { invitations, memberships, organizations } from "../schema";

export interface InvitationDTO {
  id: string;
  token: string;
  role: string;
  createdAt: Date;
  expiresAt: Date | null;
}

const INVITE_TTL_DAYS = 7;

export async function createInvitation(
  orgId: string,
  createdBy: string | null,
  role = "member",
): Promise<InvitationDTO> {
  const db = getDb();
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000);
  const [row] = await db
    .insert(invitations)
    .values({ orgId, token, role, createdBy, expiresAt })
    .returning();
  if (!row) throw new Error("falha ao criar convite");
  return {
    id: row.id,
    token: row.token,
    role: row.role,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
  };
}

/** Convites ativos (não revogados e não expirados) de uma org. */
export async function listInvitations(orgId: string): Promise<InvitationDTO[]> {
  const db = getDb();
  const rows = await db.query.invitations.findMany({
    where: and(
      eq(invitations.orgId, orgId),
      eq(invitations.revoked, false),
      or(isNull(invitations.expiresAt), gt(invitations.expiresAt, new Date())),
    ),
    orderBy: [desc(invitations.createdAt)],
  });
  return rows.map((r) => ({
    id: r.id,
    token: r.token,
    role: r.role,
    createdAt: r.createdAt,
    expiresAt: r.expiresAt,
  }));
}

export async function revokeInvitation(orgId: string, id: string): Promise<void> {
  const db = getDb();
  await db
    .update(invitations)
    .set({ revoked: true })
    .where(and(eq(invitations.id, id), eq(invitations.orgId, orgId)));
}

export interface InvitationLookup {
  orgId: string;
  orgName: string;
  role: string;
  status: "valid" | "expired" | "revoked" | "invalid";
}

export async function getInvitationByToken(token: string): Promise<InvitationLookup | null> {
  const db = getDb();
  const row = await db.query.invitations.findFirst({
    where: eq(invitations.token, token),
  });
  if (!row) return { orgId: "", orgName: "", role: "", status: "invalid" };
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, row.orgId),
  });
  const status: InvitationLookup["status"] = row.revoked
    ? "revoked"
    : row.expiresAt && row.expiresAt.getTime() < Date.now()
      ? "expired"
      : "valid";
  return { orgId: row.orgId, orgName: org?.name ?? "workspace", role: row.role, status };
}

export type AcceptResult =
  | { status: "joined" | "already"; orgId: string }
  | { status: "expired" | "revoked" | "invalid" };

/** Aceita o convite: cria a membership do usuário na org (se ainda não for membro). */
export async function acceptInvitation(token: string, userId: string): Promise<AcceptResult> {
  const info = await getInvitationByToken(token);
  if (!info || info.status !== "valid") {
    return { status: (info?.status as "expired" | "revoked" | "invalid") ?? "invalid" };
  }
  const db = getDb();
  const existing = await db.query.memberships.findFirst({
    where: and(eq(memberships.orgId, info.orgId), eq(memberships.userId, userId)),
  });
  if (existing) return { status: "already", orgId: info.orgId };

  const role = (["member", "admin", "guest", "owner"].includes(info.role)
    ? info.role
    : "member") as "member" | "admin" | "guest" | "owner";
  await withOrg(info.orgId, async (tx) => {
    await tx.insert(memberships).values({ orgId: info.orgId, userId, role });
  });
  return { status: "joined", orgId: info.orgId };
}
