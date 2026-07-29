import { getInvoiceByToken, getPlatformSettings } from "@wayline/db";
import { PublicInvoiceView } from "@/components/public/public-invoice";

export const dynamic = "force-dynamic";

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [invoice, platform] = await Promise.all([getInvoiceByToken(token), getPlatformSettings()]);

  if (!invoice) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas p-6 text-center">
        <div>
          <h1 className="font-display text-h2 font-bold text-foreground">Fatura não encontrada</h1>
          <p className="mt-2 text-ui text-muted">O link pode ter expirado ou estar incorreto.</p>
        </div>
      </div>
    );
  }

  return <PublicInvoiceView invoice={invoice} brandName={platform.name ?? "Wayline"} />;
}
