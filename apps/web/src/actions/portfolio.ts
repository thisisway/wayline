"use server";

import {
  createPortfolioItem,
  deletePortfolioItem,
  listPortfolio,
  updatePortfolioItem,
  type PortfolioInput,
  type PortfolioItemDTO,
} from "@wayline/db";
import { revalidatePath } from "next/cache";
import { assertMember, assertRole } from "@/lib/authz";

export async function listPortfolioAction(orgId: string): Promise<PortfolioItemDTO[]> {
  if (!(await assertMember(orgId))) return [];
  return listPortfolio(orgId);
}

export async function createPortfolioAction(
  orgId: string,
  input: PortfolioInput,
): Promise<PortfolioItemDTO | null> {
  if (!(await assertRole(orgId, "admin"))) return null;
  const item = await createPortfolioItem(orgId, input);
  revalidatePath("/app");
  return item;
}

export async function updatePortfolioAction(
  orgId: string,
  id: string,
  input: PortfolioInput,
): Promise<void> {
  if (!(await assertRole(orgId, "admin"))) return;
  await updatePortfolioItem(orgId, id, input);
  revalidatePath("/app");
}

export async function deletePortfolioAction(orgId: string, id: string): Promise<void> {
  if (!(await assertRole(orgId, "admin"))) return;
  await deletePortfolioItem(orgId, id);
  revalidatePath("/app");
}
