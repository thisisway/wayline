"use client";

import * as React from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import type { PublicProposal } from "@wayline/db";
import { Button, Input } from "@wayline/ui";
import { BrandLogo } from "@/components/shell/brand-logo";
import { decideProposalAction } from "@/actions/public-proposal";

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function PublicProposalView({
  proposal,
  brandName,
  logoLight,
  logoDark,
}: {
  proposal: PublicProposal;
  brandName: string;
  logoLight: string | null;
  logoDark: string | null;
}) {
  const [status, setStatus] = React.useState(proposal.status);
  const [decidedByName, setDecidedByName] = React.useState(proposal.decidedByName ?? "");
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const total = proposal.items.reduce((s, i) => s + i.amountCents, 0);
  const decided = status === "accepted" || status === "rejected";
  const expired =
    proposal.validUntil != null && new Date(proposal.validUntil).getTime() < Date.now();

  async function decide(decision: "accepted" | "rejected") {
    if (!name.trim()) {
      setErr("Informe seu nome para responder.");
      return;
    }
    setBusy(true);
    setErr(null);
    const ok = await decideProposalAction(proposal.token, decision, name).catch(() => false);
    setBusy(false);
    if (ok) {
      setStatus(decision);
      setDecidedByName(name.trim());
    } else {
      setErr("Não foi possível registrar sua resposta. Recarregue a página.");
    }
  }

  return (
    <div className="min-h-dvh bg-canvas py-8 text-foreground">
      <div className="mx-auto max-w-2xl px-4">
        {/* Cabeçalho da marca */}
        <div className="mb-6 flex items-center justify-between">
          <BrandLogo light={logoLight} dark={logoDark} fallback={brandName} className="h-8 w-auto" />
          {proposal.validUntil && (
            <span className="text-dense text-subtle">
              Válida até {new Date(proposal.validUntil).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="border-b border-border p-6">
            <h1 className="font-display text-h1 font-bold">{proposal.title}</h1>
            {proposal.clientName && (
              <p className="mt-1 text-ui text-muted">Para: {proposal.clientName}</p>
            )}
          </div>

          {proposal.intro && (
            <div className="border-b border-border p-6">
              <p className="whitespace-pre-wrap text-ui leading-relaxed text-foreground">
                {proposal.intro}
              </p>
            </div>
          )}

          {/* Itens */}
          <div className="p-6">
            <table className="w-full text-ui">
              <tbody>
                {proposal.items.map((it) => (
                  <tr key={it.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-4 text-foreground">{it.description}</td>
                    <td className="py-2.5 text-right tabular-nums font-medium text-foreground">
                      {brl(it.amountCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="font-display text-h3 font-bold">Total</span>
              <span className="font-display text-h2 font-extrabold tabular-nums text-brand">
                {brl(total)}
              </span>
            </div>
          </div>

          {/* Aceite */}
          <div className="border-t border-border bg-canvas p-6">
            {decided ? (
              <div
                className={`flex items-center gap-2 text-ui font-medium ${
                  status === "accepted" ? "text-success" : "text-danger"
                }`}
              >
                {status === "accepted" ? (
                  <CheckCircle2 className="size-5" />
                ) : (
                  <XCircle className="size-5" />
                )}
                {status === "accepted" ? "Proposta aceita" : "Proposta recusada"}
                {decidedByName && <span className="text-muted">· por {decidedByName}</span>}
              </div>
            ) : expired ? (
              <p className="text-ui text-muted">Esta proposta expirou. Fale com o responsável.</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-dense font-medium text-muted">Seu nome</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome de quem aprova"
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => decide("accepted")} disabled={busy} className="flex-1">
                    <CheckCircle2 className="size-4" /> Aceitar proposta
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => decide("rejected")}
                    disabled={busy}
                  >
                    <XCircle className="size-4" /> Recusar
                  </Button>
                </div>
                {err && <p className="text-dense text-danger">{err}</p>}
              </div>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-subtle">Enviado via {brandName}</p>
      </div>
    </div>
  );
}
