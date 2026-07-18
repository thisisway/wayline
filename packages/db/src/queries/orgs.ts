import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb, withOrg } from "../client";
import {
  automations,
  customFieldDefs,
  documents,
  lists,
  memberships,
  organizations,
  spaces,
  statuses,
} from "../schema";

/** Colunas padrão de um board novo. */
function defaultStatuses(orgId: string, listId: string) {
  return [
    { orgId, listId, name: "A fazer", kind: "open" as const, color: "#94A3B8", position: 0 },
    { orgId, listId, name: "Fazendo", kind: "active" as const, color: "#1D66FF", position: 1 },
    { orgId, listId, name: "Feito", kind: "done" as const, color: "#17C86A", position: 2 },
  ];
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // remove acentos
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "workspace"
  );
}

/**
 * Cria uma org com o usuário como owner e um board padrão (space "Geral",
 * lista "Tarefas", 3 colunas). Retorna o org id. `organizations` não tem RLS;
 * as demais inserções rodam em `withOrg` (WITH CHECK por org_id).
 */
export async function createOrg(userId: string, name: string): Promise<string> {
  const db = getDb();

  const base = slugify(name);
  let slug = base;
  for (let i = 2; ; i++) {
    const exists = await db.query.organizations.findFirst({
      where: eq(organizations.slug, slug),
    });
    if (!exists) break;
    slug = `${base}-${i}`;
  }

  // Trial de 14 dias com recursos Business (expiração lazy).
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const [org] = await db
    .insert(organizations)
    .values({ name: name.trim(), slug, plan: "free", trialEndsAt })
    .returning();
  if (!org) throw new Error("falha ao criar workspace");

  await withOrg(org.id, async (tx) => {
    await tx.insert(memberships).values({ orgId: org.id, userId, role: "owner" });
    const [space] = await tx
      .insert(spaces)
      .values({ orgId: org.id, name: "Geral", color: "#1D66FF", icon: "G" })
      .returning();
    const [list] = await tx
      .insert(lists)
      .values({ orgId: org.id, spaceId: space!.id, name: "Tarefas" })
      .returning();
    await tx.insert(statuses).values(defaultStatuses(org.id, list!.id));
  });

  return org.id;
}

const SPACE_COLORS = ["#1D66FF", "#17C86A", "#FFB800", "#7C5CFF", "#0EA5E9", "#FF3B30"];

/** Cria um space na org. */
export async function createSpace(orgId: string, name: string): Promise<string> {
  return withOrg(orgId, async (tx) => {
    const color = SPACE_COLORS[Math.floor(Math.random() * SPACE_COLORS.length)]!;
    const [space] = await tx
      .insert(spaces)
      .values({
        orgId,
        name: name.trim(),
        color,
        icon: name.trim()[0]?.toUpperCase() ?? "S",
      })
      .returning();
    if (!space) throw new Error("falha ao criar space");
    return space.id;
  });
}

/** Cria uma lista dentro de um space da org, com colunas padrão. */
export async function createList(orgId: string, spaceId: string, name: string): Promise<string> {
  return withOrg(orgId, async (tx) => {
    // Garante que o space é da org corrente (RLS já filtra, mas checa 404).
    const space = await tx.query.spaces.findFirst({
      where: and(eq(spaces.id, spaceId), isNull(spaces.deletedAt)),
    });
    if (!space) throw new Error("space inválido");

    const [list] = await tx
      .insert(lists)
      .values({ orgId, spaceId, name: name.trim() })
      .returning();
    if (!list) throw new Error("falha ao criar lista");

    await tx.insert(statuses).values(defaultStatuses(orgId, list.id));
    return list.id;
  });
}

/**
 * Duplica a ESTRUTURA de uma lista (colunas + campos customizados + automações
 * + brief) numa nova lista do mesmo space — sem copiar as tarefas. Retorna o id.
 */
export async function duplicateListStructure(orgId: string, listId: string): Promise<string> {
  return withOrg(orgId, async (tx) => {
    const src = await tx.query.lists.findFirst({
      where: and(eq(lists.id, listId), isNull(lists.deletedAt)),
    });
    if (!src) throw new Error("lista inválida");

    const [newList] = await tx
      .insert(lists)
      .values({ orgId, spaceId: src.spaceId, name: `${src.name} (cópia)` })
      .returning();
    if (!newList) throw new Error("falha ao criar lista");

    // Colunas (statuses) — mapeia id antigo → novo para remapear automações.
    const srcStatuses = await tx.query.statuses.findMany({
      where: eq(statuses.listId, listId),
      orderBy: [asc(statuses.position)],
    });
    const statusMap = new Map<string, string>();
    for (const s of srcStatuses) {
      const [ns] = await tx
        .insert(statuses)
        .values({
          orgId,
          listId: newList.id,
          name: s.name,
          kind: s.kind,
          color: s.color,
          position: s.position,
        })
        .returning({ id: statuses.id });
      if (ns) statusMap.set(s.id, ns.id);
    }

    // Campos customizados.
    const srcFields = await tx.query.customFieldDefs.findMany({
      where: eq(customFieldDefs.listId, listId),
    });
    for (const f of srcFields) {
      await tx.insert(customFieldDefs).values({
        orgId,
        listId: newList.id,
        name: f.name,
        type: f.type,
        options: f.options,
        position: f.position,
      });
    }

    // Automações (remapeia referências de status).
    const srcAutos = await tx.query.automations.findMany({
      where: eq(automations.listId, listId),
    });
    for (const a of srcAutos) {
      const triggerStatusId =
        a.triggerType === "status" && a.triggerStatusId
          ? (statusMap.get(a.triggerStatusId) ?? null)
          : null;
      if (a.triggerType === "status" && !triggerStatusId) continue;
      const actionValue =
        a.actionType === "move" ? (statusMap.get(a.actionValue) ?? a.actionValue) : a.actionValue;
      await tx.insert(automations).values({
        orgId,
        listId: newList.id,
        triggerType: a.triggerType,
        triggerStatusId,
        actionType: a.actionType,
        actionValue,
      });
    }

    // Brief (documento).
    const doc = await tx.query.documents.findFirst({ where: eq(documents.listId, listId) });
    if (doc) {
      await tx
        .insert(documents)
        .values({ orgId, listId: newList.id, title: doc.title, content: doc.content });
    }

    return newList.id;
  });
}
