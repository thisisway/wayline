import { redirect } from "next/navigation";
import { getPlatformSettings } from "@wayline/db";
import { auth } from "@/auth";
import { Landing } from "@/components/landing/landing";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  if (session?.orgId) redirect("/app");

  const platform = await getPlatformSettings();
  return (
    <Landing
      brandName={platform.name ?? "Wayline"}
      logoLight={platform.logoUrl}
      logoDark={platform.logoUrlDark}
    />
  );
}
