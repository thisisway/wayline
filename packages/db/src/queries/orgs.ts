import { eq } from "drizzle-orm";
import { getDb, withOrg } from "../client";
import { lists, memberships, organizations, spaces, statuses } from "../schema";

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
    await tx.insert(statuses).values([
      { orgId: org.id, listId: list!.id, name: "A fazer", kind: "open", color: "#94A3B8", position: 0 },
      { orgId: org.id, listId: list!.id, name: "Fazendo", kind: "active", color: "#1D66FF", position: 1 },
      { orgId: org.id, listId: list!.id, name: "Feito", kind: "done", color: "#17C86A", position: 2 },
    ]);
  });

  return org.id;
}
