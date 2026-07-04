import Link from "next/link";
import { getInvitationByToken } from "@wayline/db";
import { Button } from "@wayline/ui";
import { auth } from "@/auth";
import { AcceptInvite } from "@/components/invite/accept-invite";

export const dynamic = "force-dynamic";

const STATUS_MESSAGE: Record<string, string> = {
  expired: "Este convite expirou.",
  revoked: "Este convite foi revogado.",
  invalid: "Convite inválido.",
};

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex size-12 items-center justify-center rounded-xl bg-brand font-display text-h2 font-extrabold text-white shadow-xl">
          W
        </div>
        <h1 className="font-display text-h2 font-bold">{title}</h1>
        <div className="mt-4 rounded-xl border border-border bg-surface p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const info = await getInvitationByToken(token);
  const session = await auth();

  if (!info || info.status !== "valid") {
    return (
      <Shell title="Convite">
        <p className="text-ui text-muted">
          {STATUS_MESSAGE[info?.status ?? "invalid"] ?? "Convite inválido."}
        </p>
        <Link href="/login" className="mt-4 inline-block text-ui font-medium text-brand">
          Ir para o login
        </Link>
      </Shell>
    );
  }

  if (!session?.user?.id) {
    const next = `/invite/${token}`;
    return (
      <Shell title={`Entrar em ${info.orgName}`}>
        <p className="mb-4 text-ui text-muted">
          Você foi convidado para o workspace <strong>{info.orgName}</strong>. Entre ou crie uma
          conta para aceitar.
        </p>
        <div className="flex flex-col gap-2">
          <Link href={`/login?next=${encodeURIComponent(next)}`}>
            <Button className="w-full">Entrar</Button>
          </Link>
          <Link href={`/register?next=${encodeURIComponent(next)}`}>
            <Button variant="secondary" className="w-full">
              Criar conta
            </Button>
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title={`Entrar em ${info.orgName}`}>
      <AcceptInvite token={token} />
    </Shell>
  );
}
