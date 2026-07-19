import { getContractByToken, getPlatformSettings } from "@wayline/db";
import { PublicContractView } from "@/components/public/public-contract";

export const dynamic = "force-dynamic";

export default async function PublicContractPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [contract, platform] = await Promise.all([
    getContractByToken(token),
    getPlatformSettings(),
  ]);

  if (!contract) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas p-6 text-center">
        <div>
          <h1 className="font-display text-h2 font-bold text-foreground">Contrato não encontrado</h1>
          <p className="mt-2 text-ui text-muted">O link pode ter expirado ou estar incorreto.</p>
        </div>
      </div>
    );
  }

  return (
    <PublicContractView
      contract={contract}
      brandName={platform.name ?? "Wayline"}
      logoLight={platform.logoUrl}
      logoDark={platform.logoUrlDark}
    />
  );
}
