import { and, eq, isNull } from "drizzle-orm";
import { getDb, withOrg } from "../client";
import { lists, memberships, organizations, spaces, statuses } from "../schema";

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

  const [org] = await db
    .insert(organizations)
    .values({ name: name.trim(), slug, plan: "free" })
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
