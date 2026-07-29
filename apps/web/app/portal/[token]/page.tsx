import { getClientPortal, getPlatformSettings } from "@wayline/db";
import { ClientPortalView } from "@/components/public/client-portal";

export const dynamic = "force-dynamic";

export default async function ClientPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [portal, platform] = await Promise.all([getClientPortal(token), getPlatformSettings()]);

  if (!portal) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas p-6 text-center">
        <div>
          <h1 className="font-display text-h2 font-bold text-foreground">Portal indisponível</h1>
          <p className="mt-2 text-ui text-muted">O link pode ter expirado ou estar incorreto.</p>
        </div>
      </div>
    );
  }

  return (
    <ClientPortalView token={token} portal={portal} brandName={platform.name ?? "Wayline"} />
  );
}
