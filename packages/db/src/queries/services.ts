import { and, asc, eq, isNull } from "drizzle-orm";
import { withOrg } from "../client";
import { services } from "../schema";

export interface ServiceDTO {
  id: string;
  name: string;
  description: string;
  amountCents: number;
  unit: string;
  term: string;
}

function toDTO(s: typeof services.$inferSelect): ServiceDTO {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    amountCents: s.amountCents,
    unit: s.unit,
    term: s.term,
  };
}

export async function listServices(orgId: string): Promise<ServiceDTO[]> {
  try {
    return await withOrg(orgId, async (tx) => {
      const rows = await tx.query.services.findMany({
        where: isNull(services.deletedAt),
        orderBy: [asc(services.position), asc(services.name)],
      });
      return rows.map(toDTO);
    });
  } catch {
    return [];
  }
}

export interface ServiceInput {
  name: string;
  description: string;
  amountCents: number;
  unit: string;
  term: string;
}

export async function createService(orgId: string, input: ServiceInput): Promise<ServiceDTO> {
  return withOrg(orgId, async (tx) => {
    const [row] = await tx
      .insert(services)
      .values({
        orgId,
        name: input.name.trim() || "Serviço",
        description: input.description,
        amountCents: Math.max(0, Math.round(input.amountCents)),
        unit: input.unit || "Unidade",
        term: input.term,
      })
      .returning();
    return toDTO(row!);
  });
}

export async function updateService(
  orgId: string,
  id: string,
  input: ServiceInput,
): Promise<void> {
  await withOrg(orgId, async (tx) => {
    await tx
      .update(services)
      .set({
        name: input.name.trim() || "Serviço",
        description: input.description,
        amountCents: Math.max(0, Math.round(input.amountCents)),
        unit: input.unit || "Unidade",
        term: input.term,
        updatedAt: new Date(),
      })
      .where(and(eq(services.id, id), eq(services.orgId, orgId)));
  });
}

export async function deleteService(orgId: string, id: string): Promise<void> {
  await withOrg(orgId, async (tx) => {
    await tx
      .update(services)
      .set({ deletedAt: new Date() })
      .where(and(eq(services.id, id), eq(services.orgId, orgId)));
  });
}
