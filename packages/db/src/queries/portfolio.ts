import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "../client";
import { portfolioItems } from "../schema";

export interface PortfolioItemDTO {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
}

function toDTO(p: typeof portfolioItems.$inferSelect): PortfolioItemDTO {
  return { id: p.id, title: p.title, imageUrl: p.imageUrl, linkUrl: p.linkUrl };
}

/** portfolio_items é no-RLS: filtramos por org_id (app-enforced). */
export async function listPortfolio(orgId: string): Promise<PortfolioItemDTO[]> {
  const db = getDb();
  const rows = await db.query.portfolioItems.findMany({
    where: and(eq(portfolioItems.orgId, orgId), isNull(portfolioItems.deletedAt)),
    orderBy: [asc(portfolioItems.position), asc(portfolioItems.createdAt)],
  });
  return rows.map(toDTO);
}

/** Cases específicos (por id), preservando a ordem pedida — para o link público. */
export async function getPortfolioByIds(
  orgId: string,
  ids: string[],
): Promise<PortfolioItemDTO[]> {
  if (!ids.length) return [];
  const db = getDb();
  const rows = await db.query.portfolioItems.findMany({
    where: and(
      eq(portfolioItems.orgId, orgId),
      isNull(portfolioItems.deletedAt),
      inArray(portfolioItems.id, ids),
    ),
  });
  const byId = new Map(rows.map((r) => [r.id, toDTO(r)]));
  return ids.map((id) => byId.get(id)).filter((x): x is PortfolioItemDTO => Boolean(x));
}

export interface PortfolioInput {
  title: string;
  imageUrl: string;
  linkUrl: string | null;
}

export async function createPortfolioItem(
  orgId: string,
  input: PortfolioInput,
): Promise<PortfolioItemDTO> {
  const db = getDb();
  const [row] = await db
    .insert(portfolioItems)
    .values({
      orgId,
      title: input.title.trim(),
      imageUrl: input.imageUrl,
      linkUrl: input.linkUrl || null,
    })
    .returning();
  return toDTO(row!);
}

export async function updatePortfolioItem(
  orgId: string,
  id: string,
  input: PortfolioInput,
): Promise<void> {
  const db = getDb();
  await db
    .update(portfolioItems)
    .set({
      title: input.title.trim(),
      imageUrl: input.imageUrl,
      linkUrl: input.linkUrl || null,
      updatedAt: new Date(),
    })
    .where(and(eq(portfolioItems.id, id), eq(portfolioItems.orgId, orgId)));
}

export async function deletePortfolioItem(orgId: string, id: string): Promise<void> {
  const db = getDb();
  await db
    .update(portfolioItems)
    .set({ deletedAt: new Date() })
    .where(and(eq(portfolioItems.id, id), eq(portfolioItems.orgId, orgId)));
}
