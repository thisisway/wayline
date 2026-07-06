import { getBoardForOrg, getShareByToken } from "@wayline/db";
import { mapBoard } from "@/lib/board";
import { PublicBoard } from "@/components/public/public-board";

export const dynamic = "force-dynamic";

function Invalid() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas p-4 text-center">
      <div>
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-brand font-display text-h2 font-extrabold text-white">
          W
        </div>
        <h1 className="font-display text-h3 font-bold text-foreground">Link indisponível</h1>
        <p className="mt-1 text-ui text-muted">
          Este link de compartilhamento é inválido ou foi revogado.
        </p>
      </div>
    </div>
  );
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const share = await getShareByToken(token);
  if (!share) return <Invalid />;

  const data = await getBoardForOrg(share.orgId, null, share.listId);
  if (!data) return <Invalid />;

  return <PublicBoard token={token} listName={data.listName} columns={mapBoard(data)} />;
}
