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
import { assertModule } from "@/lib/authz";

export async function listPortfolioAction(orgId: string): Promise<PortfolioItemDTO[]> {
  if (!(await assertModule(orgId, "comercial", "view"))) return [];
  return listPortfolio(orgId);
}

export async function createPortfolioAction(
  orgId: string,
  input: PortfolioInput,
): Promise<PortfolioItemDTO | null> {
  if (!(await assertModule(orgId, "comercial", "edit"))) return null;
  const item = await createPortfolioItem(orgId, input);
  revalidatePath("/app");
  return item;
}

export async function updatePortfolioAction(
  orgId: string,
  id: string,
  input: PortfolioInput,
): Promise<void> {
  if (!(await assertModule(orgId, "comercial", "manage"))) return;
  await updatePortfolioItem(orgId, id, input);
  revalidatePath("/app");
}

export async function deletePortfolioAction(orgId: string, id: string): Promise<void> {
  if (!(await assertModule(orgId, "comercial", "manage"))) return;
  await deletePortfolioItem(orgId, id);
  revalidatePath("/app");
}
