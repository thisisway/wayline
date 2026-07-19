"use client";

import * as React from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import type { PublicProposal } from "@wayline/db";
import { Button, Input } from "@wayline/ui";
import { BrandLogo } from "@/components/shell/brand-logo";
import { decideProposalAction } from "@/actions/public-proposal";

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const propNo = (n: number) => `PROP-${String(n).padStart(5, "0")}`;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border p-6 last:border-0">
      <h2 className="mb-2 text-label uppercase text-subtle">{title}</h2>
      {children}
    </div>
  );
}

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
  const [byName, setByName] = React.useState(proposal.decidedByName ?? "");
  const [name, setName] = React.useState("");
  const [doc, setDoc] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const subtotal = proposal.items.reduce((s, i) => s + i.amountCents * i.quantity, 0);
  const total = Math.round(subtotal * (1 - proposal.discountPct / 100));
  const decided = status === "accepted" || status === "rejected";
  const expired =
    proposal.validUntil != null && new Date(proposal.validUntil).getTime() < Date.now();

  async function decide(decision: "accepted" | "rejected") {
    if (!name.trim()) {
      setErr("Informe seu nome.");
      return;
    }
    setBusy(true);
    setErr(null);
    const ok = await decideProposalAction(proposal.token, decision, name, doc).catch(() => false);
    setBusy(false);
    if (ok) {
      setStatus(decision);
      setByName(name.trim());
    } else {
      setErr("Não foi possível registrar. Recarregue a página.");
    }
  }

  return (
    <div className="min-h-dvh bg-canvas py-8 text-foreground">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <BrandLogo light={logoLight} dark={logoDark} fallback={brandName} className="h-8 w-auto" />
          <span className="text-dense text-subtle">
            {propNo(proposal.number)}
            {proposal.validUntil &&
              ` · válida até ${new Date(proposal.validUntil).toLocaleDateString("pt-BR")}`}
          </span>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="p-6">
            <h1 className="font-display text-h1 font-bold">{proposal.title}</h1>
            {proposal.clientName && (
              <p className="mt-1 text-ui text-muted">Para: {proposal.clientName}</p>
            )}
          </div>

          {proposal.intro && (
            <Section title="Apresentação">
              <p className="whitespace-pre-wrap text-ui leading-relaxed">{proposal.intro}</p>
            </Section>
          )}
          {proposal.objective && (
            <Section title="Objetivo">
              <p className="whitespace-pre-wrap text-ui leading-relaxed">{proposal.objective}</p>
            </Section>
          )}

          {proposal.portfolio.length > 0 && (
            <Section title="Portfólio">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {proposal.portfolio.map((c) => {
                  const card = (
                    <div className="overflow-hidden rounded-lg border border-border">
                      <img src={c.imageUrl} alt={c.title} className="aspect-video w-full object-cover" />
                      {c.title && (
                        <p className="truncate px-2 py-1.5 text-dense font-medium text-foreground">
                          {c.title}
                        </p>
                      )}
                    </div>
                  );
                  return c.linkUrl ? (
                    <a key={c.id} href={c.linkUrl} target="_blank" rel="noreferrer" className="block">
                      {card}
                    </a>
                  ) : (
                    <div key={c.id}>{card}</div>
                  );
                })}
              </div>
            </Section>
          )}

          {proposal.schedule.length > 0 && (
            <Section title="Cronograma de entrega">
              <ul className="space-y-1.5">
                {proposal.schedule.map((ph, i) => (
                  <li key={i} className="flex justify-between gap-4 text-ui">
                    <span>{ph.label}</span>
                    {ph.duration && <span className="shrink-0 text-muted">{ph.duration}</span>}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Investimento */}
          <Section title="Investimento">
            <div className="space-y-3">
              {proposal.items.map((it) => (
                <div key={it.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{it.description}</p>
                      <p className="text-dense text-subtle">
                        {it.quantity} × {it.unit} · {brl(it.amountCents)}
                        {it.term && ` · ${it.term}`}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {brl(it.amountCents * it.quantity)}
                    </span>
                  </div>
                  {it.details && (
                    <p className="mt-1 whitespace-pre-wrap text-dense text-muted">{it.details}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-1 border-t border-border pt-3">
              {proposal.discountPct > 0 && (
                <>
                  <div className="flex justify-between text-dense text-muted">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{brl(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-dense text-muted">
                    <span>Desconto ({proposal.discountPct}%)</span>
                    <span className="tabular-nums">-{brl(subtotal - total)}</span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between">
                <span className="font-display text-h3 font-bold">Total</span>
                <span className="font-display text-h2 font-extrabold tabular-nums text-brand">
                  {brl(total)}
                  {proposal.recurrence === "monthly" && (
                    <span className="text-ui font-medium text-muted">/mês</span>
                  )}
                </span>
              </div>
            </div>
            {(proposal.paymentMethod || proposal.paymentTerms) && (
              <p className="mt-3 text-dense text-muted">
                <strong className="text-foreground">Pagamento:</strong> {proposal.paymentMethod}
                {proposal.paymentTerms && ` — ${proposal.paymentTerms}`}
              </p>
            )}
          </Section>

          {proposal.bonus && (
            <Section title="Bônus incluídos">
              <p className="whitespace-pre-wrap text-ui leading-relaxed">{proposal.bonus}</p>
            </Section>
          )}
          {proposal.terms && (
            <Section title="Condições gerais">
              <p className="whitespace-pre-wrap text-dense text-muted">{proposal.terms}</p>
            </Section>
          )}
          {proposal.nextSteps && (
            <Section title="Próximos passos">
              <p className="whitespace-pre-wrap text-ui leading-relaxed">{proposal.nextSteps}</p>
            </Section>
          )}

          {/* Assinatura */}
          <div className="bg-canvas p-6">
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
                {byName && <span className="text-muted">· por {byName}</span>}
              </div>
            ) : expired ? (
              <p className="text-ui text-muted">Esta proposta expirou. Fale com o responsável.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-dense text-muted">
                  Ao aceitar, seu nome, documento e a data serão registrados como assinatura.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
                  <Input value={doc} onChange={(e) => setDoc(e.target.value)} placeholder="CPF / CNPJ" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => decide("accepted")} disabled={busy} className="flex-1">
                    <CheckCircle2 className="size-4" /> Aceitar proposta
                  </Button>
                  <Button variant="secondary" onClick={() => decide("rejected")} disabled={busy}>
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
