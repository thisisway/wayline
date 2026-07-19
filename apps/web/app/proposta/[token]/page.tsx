import { getProposalByToken, getPlatformSettings } from "@wayline/db";
import { PublicProposalView } from "@/components/public/public-proposal";

export const dynamic = "force-dynamic";

export default async function PublicProposalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [proposal, platform] = await Promise.all([
    getProposalByToken(token),
    getPlatformSettings(),
  ]);

  if (!proposal) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas p-6 text-center">
        <div>
          <h1 className="font-display text-h2 font-bold text-foreground">Proposta não encontrada</h1>
          <p className="mt-2 text-ui text-muted">O link pode ter expirado ou estar incorreto.</p>
        </div>
      </div>
    );
  }

  return (
    <PublicProposalView
      proposal={proposal}
      brandName={platform.name ?? "Wayline"}
      logoLight={platform.logoUrl}
      logoDark={platform.logoUrlDark}
    />
  );
}
