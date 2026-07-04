"use server";

import { getOrgReport, type OrgReport } from "@wayline/db";
import { assertMember } from "@/lib/authz";

export async function orgReportAction(orgId: string): Promise<OrgReport | null> {
  if (!(await assertMember(orgId))) return null;
  return getOrgReport(orgId);
}
