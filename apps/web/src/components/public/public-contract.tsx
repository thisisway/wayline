"use client";

import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import type { PublicContract } from "@wayline/db";
import { Button, Input } from "@wayline/ui";
import { BrandLogo } from "@/components/shell/brand-logo";
import { signContractAction } from "@/actions/public-contract";

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const no = (n: number) => `CTR-${String(n).padStart(5, "0")}`;

export function PublicContractView({
  contract,
  brandName,
  logoLight,
  logoDark,
}: {
  contract: PublicContract;
  brandName: string;
  logoLight: string | null;
  logoDark: string | null;
}) {
  const [status, setStatus] = React.useState(contract.status);
  const [byName, setByName] = React.useState(contract.signedByName ?? "");
  const [byDoc, setByDoc] = React.useState(contract.signedByDoc ?? "");
  const [name, setName] = React.useState("");
  const [doc, setDoc] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const signed = status === "signed";
  const canceled = status === "canceled";

  async function sign() {
    if (!name.trim()) {
      setErr("Informe seu nome.");
      return;
    }
    setBusy(true);
    setErr(null);
    const ok = await signContractAction(contract.token, name, doc).catch(() => false);
    setBusy(false);
    if (ok) {
      setStatus("signed");
      setByName(name.trim());
      setByDoc(doc.trim());
    } else {
      setErr("Não foi possível assinar. Recarregue a página.");
    }
  }

  return (
    <div className="min-h-dvh bg-canvas py-8 text-foreground">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <BrandLogo light={logoLight} dark={logoDark} fallback={brandName} className="h-8 w-auto" />
          <span className="text-dense text-subtle">{no(contract.number)}</span>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="border-b border-border p-6">
            <h1 className="font-display text-h1 font-bold">{contract.title}</h1>
            <div className="mt-1 flex flex-wrap gap-x-4 text-ui text-muted">
              {contract.clientName && <span>Contratante: {contract.clientName}</span>}
              {contract.valueCents > 0 && (
                <span>
                  Valor: <strong className="text-foreground">{brl(contract.valueCents)}</strong>
                </span>
              )}
            </div>
          </div>

          <div className="p-6">
            <pre className="whitespace-pre-wrap font-sans text-ui leading-relaxed text-foreground">
              {contract.content}
            </pre>
          </div>

          <div className="border-t border-border bg-canvas p-6">
            {signed ? (
              <div className="flex items-center gap-2 text-ui font-medium text-success">
                <CheckCircle2 className="size-5" />
                Assinado por {byName}
                {byDoc && ` (${byDoc})`}
              </div>
            ) : canceled ? (
              <p className="text-ui text-muted">Este contrato foi cancelado.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-dense text-muted">
                  Ao assinar, seu nome, documento e a data ficam registrados como assinatura
                  eletrônica.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
                  <Input value={doc} onChange={(e) => setDoc(e.target.value)} placeholder="CPF / CNPJ" />
                </div>
                <Button onClick={sign} disabled={busy} className="w-full">
                  <CheckCircle2 className="size-4" /> Assinar contrato
                </Button>
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
