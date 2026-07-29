"use server";

import { getInvoiceByToken, type PublicInvoice } from "@wayline/db";

export async function getPublicInvoiceAction(token: string): Promise<PublicInvoice | null> {
  if (!token) return null;
  return getInvoiceByToken(token);
}
