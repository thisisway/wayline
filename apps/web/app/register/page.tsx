import { redirect } from "next/navigation";
import { getPlatformSettings } from "@wayline/db";
import { auth } from "@/auth";
import { RegisterForm } from "@/components/auth/register-form";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user?.id) redirect("/app");
  const platform = await getPlatformSettings();
  return (
    <RegisterForm
      logoLight={platform.logoUrl}
      logoDark={platform.logoUrlDark}
      brandName={platform.name ?? undefined}
    />
  );
}
