"use server";

import { getOrgReport, type OrgReport } from "@wayline/db";
import { assertMember } from "@/lib/authz";

export async function orgReportAction(
  orgId: string,
  sinceIso?: string | null,
): Promise<OrgReport | null> {
  if (!(await assertMember(orgId))) return null;
  const since = sinceIso ? new Date(sinceIso) : null;
  return getOrgReport(orgId, since);
}
