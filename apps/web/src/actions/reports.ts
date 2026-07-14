"use server";

import { getOrgDashboard, getOrgReport, type OrgDashboard, type OrgReport } from "@wayline/db";
import { assertMember, assertRole } from "@/lib/authz";
import { planAllows } from "@/lib/plan-guard";

export async function orgReportAction(
  orgId: string,
  sinceIso?: string | null,
): Promise<OrgReport | null> {
  if (!(await assertMember(orgId))) return null;
  const since = sinceIso ? new Date(sinceIso) : null;
  return getOrgReport(orgId, since);
}

/** Dashboard executivo (org inteira) — restrito a admin+. */
export async function orgDashboardAction(orgId: string): Promise<OrgDashboard | null> {
  if (!(await assertRole(orgId, "admin"))) return null;
  if (!(await planAllows(orgId, "dashboard"))) return null;
  return getOrgDashboard(orgId);
}
