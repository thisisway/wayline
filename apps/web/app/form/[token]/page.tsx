import { getFormByToken, getPlatformSettings } from "@wayline/db";
import { PublicFormView } from "@/components/public/public-form";

export const dynamic = "force-dynamic";

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [form, platform] = await Promise.all([getFormByToken(token), getPlatformSettings()]);

  if (!form) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas p-6 text-center">
        <div>
          <h1 className="font-display text-h2 font-bold text-foreground">Formulário não encontrado</h1>
          <p className="mt-2 text-ui text-muted">O link pode ter expirado ou estar incorreto.</p>
        </div>
      </div>
    );
  }

  return (
    <PublicFormView
      form={form}
      token={token}
      brandName={platform.name ?? "Wayline"}
      logoLight={platform.logoUrl}
      logoDark={platform.logoUrlDark}
    />
  );
}
