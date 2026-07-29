import { and, desc, eq, inArray, isNull, like } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { getDb, withOrg } from "../client";
import { attachments, clientPortals, clients, contracts, organizations, proposals, tasks } from "../schema";

export interface PortalDeliverable {
  id: string;
  title: string;
  listName: string;
  statusName: string;
  statusColor: string;
  dueDate: Date | null;
  approvalStatus: string | null; // 'approved' | 'changes' | null
  imageCount: number; // criativos (imagens) anexados — habilita o proofing
}

export interface PortalDoc {
  id: string;
  number: number;
  title: string;
  status: string;
  token: string;
  valueCents: number;
}

export interface ClientPortal {
  clientName: string;
  color: string;
  orgName: string;
  deliverables: PortalDeliverable[];
  proposals: PortalDoc[];
  contracts: PortalDoc[];
}

function token(): string {
  return randomBytes(18).toString("base64url");
}

/** Gera (ou reusa) o link do portal de um cliente. Reativa se estava revogado. */
export async function getOrCreateClientPortal(orgId: string, clientId: string): Promise<string> {
  const db = getDb();
  const existing = await db.query.clientPortals.findFirst({
    where: eq(clientPortals.clientId, clientId),
  });
  if (existing) {
    if (existing.revoked) {
      await db.update(clientPortals).set({ revoked: false }).where(eq(clientPortals.id, existing.id));
    }
    return existing.token;
  }
  await db.insert(clientPortals).values({ orgId, clientId, token: token() }).onConflictDoNothing();
  const row = await db.query.clientPortals.findFirst({ where: eq(clientPortals.clientId, clientId) });
  return row!.token;
}

/** Revoga o link do portal de um cliente (deixa de resolver). */
export async function revokeClientPortal(orgId: string, clientId: string): Promise<void> {
  const db = getDb();
  await db
    .update(clientPortals)
    .set({ revoked: true })
    .where(and(eq(clientPortals.orgId, orgId), eq(clientPortals.clientId, clientId)));
}

export async function resolvePortalToken(
  tok: string,
): Promise<{ orgId: string; clientId: string } | null> {
  try {
    const db = getDb();
    const p = await db.query.clientPortals.findFirst({
      where: and(eq(clientPortals.token, tok), eq(clientPortals.revoked, false)),
    });
    return p ? { orgId: p.orgId, clientId: p.clientId } : null;
  } catch {
    return null;
  }
}

/** A tarefa pertence a este cliente? (guarda de segurança na aprovação pública) */
export async function taskBelongsToClient(
  orgId: string,
  taskId: string,
  clientId: string,
): Promise<boolean> {
  try {
    return await withOrg(orgId, async (tx) => {
      const t = await tx.query.tasks.findFirst({
        where: and(eq(tasks.id, taskId), eq(tasks.clientId, clientId), isNull(tasks.deletedAt)),
      });
      return Boolean(t);
    });
  } catch {
    return false;
  }
}

/** Portal completo pelo token (sem sessão). Resiliente: null em falha. */
export async function getClientPortal(tok: string): Promise<ClientPortal | null> {
  try {
    const ref = await resolvePortalToken(tok);
    if (!ref) return null;
    const { orgId, clientId } = ref;
    const db = getDb();

    const client = await withOrg(orgId, (tx) =>
      tx.query.clients.findFirst({ where: and(eq(clients.id, clientId), isNull(clients.deletedAt)) }),
    );
    if (!client) return null;

    const org = await db.query.organizations.findFirst({ where: eq(organizations.id, orgId) });

    const deliverables = await withOrg(orgId, async (tx) => {
      const rows = await tx.query.tasks.findMany({
        where: and(eq(tasks.clientId, clientId), isNull(tasks.deletedAt)),
        with: { status: true, list: true },
        orderBy: [desc(tasks.updatedAt)],
        limit: 200,
      });
      const ids = rows.map((r) => r.id);
      const imgs = ids.length
        ? await tx.query.attachments.findMany({
            where: and(inArray(attachments.taskId, ids), like(attachments.contentType, "image/%")),
          })
        : [];
      const imgCount = new Map<string, number>();
      for (const a of imgs) imgCount.set(a.taskId, (imgCount.get(a.taskId) ?? 0) + 1);
      return rows.map((t) => {
        const st = (t as typeof t & { status?: { name?: string; color?: string } }).status;
        const ls = (t as typeof t & { list?: { name?: string } }).list;
        return {
          id: t.id,
          title: t.title,
          listName: ls?.name ?? "",
          statusName: st?.name ?? "",
          statusColor: st?.color ?? "#94A3B8",
          dueDate: t.dueDate,
          approvalStatus: t.approvalStatus,
          imageCount: imgCount.get(t.id) ?? 0,
        };
      });
    });

    // proposals/contracts são no-RLS (token é o segredo) — filtra por org+cliente.
    const props = await db.query.proposals.findMany({
      where: and(
        eq(proposals.orgId, orgId),
        eq(proposals.clientId, clientId),
        isNull(proposals.deletedAt),
      ),
      orderBy: [desc(proposals.updatedAt)],
    });
    const ctrs = await db.query.contracts.findMany({
      where: and(
        eq(contracts.orgId, orgId),
        eq(contracts.clientId, clientId),
        isNull(contracts.deletedAt),
      ),
      orderBy: [desc(contracts.updatedAt)],
    });

    return {
      clientName: client.name,
      color: client.color,
      orgName: org?.name ?? "",
      deliverables,
      proposals: props.map((x) => ({
        id: x.id,
        number: x.number,
        title: x.title,
        status: x.status,
        token: x.token,
        valueCents: 0,
      })),
      contracts: ctrs.map((x) => ({
        id: x.id,
        number: x.number,
        title: x.title,
        status: x.status,
        token: x.token,
        valueCents: x.valueCents,
      })),
    };
  } catch {
    return null;
  }
}
