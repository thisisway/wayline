import { redirect } from "next/navigation";
import { getPlatformSettings } from "@wayline/db";
import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await auth();
  if (session?.orgId) redirect("/app");
  const platform = await getPlatformSettings();
  return <LoginForm logoLight={platform.logoUrl} logoDark={platform.logoUrlDark} />;
}
