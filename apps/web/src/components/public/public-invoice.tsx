import { CheckCircle2, Clock } from "lucide-react";
import type { PublicInvoice } from "@wayline/db";

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Rascunho", cls: "bg-elevated text-muted" },
  sent: { label: "Em aberto", cls: "bg-brand/15 text-brand" },
  paid: { label: "Paga", cls: "bg-success/15 text-success" },
  canceled: { label: "Cancelada", cls: "bg-danger/15 text-danger" },
};

function fmtDate(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : "—";
}

export function PublicInvoiceView({ invoice, brandName }: { invoice: PublicInvoice; brandName: string }) {
  const st = STATUS[invoice.status] ?? STATUS.sent!;
  const overdue =
    invoice.status === "sent" && invoice.dueDate && new Date(invoice.dueDate).getTime() < Date.now();

  return (
    <div className="min-h-dvh bg-canvas px-4 py-10 text-foreground">
      <div className="mx-auto w-full max-w-xl">
        <p className="mb-4 text-center text-dense font-semibold uppercase tracking-wide text-subtle">{brandName}</p>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="h-2 bg-brand" />
          <div className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-h2 font-bold">{invoice.title}</h1>
                <p className="mt-0.5 text-dense text-subtle">
                  Fatura FAT-{String(invoice.number).padStart(5, "0")}
                  {invoice.clientName ? ` · ${invoice.clientName}` : ""}
                </p>
              </div>
              <span className={`shrink-0 rounded-pill px-3 py-1 text-dense font-semibold ${st.cls}`}>{st.label}</span>
            </div>

            {invoice.description && (
              <p className="mt-4 whitespace-pre-wrap text-ui text-muted">{invoice.description}</p>
            )}

            <div className="mt-6 rounded-xl border border-border bg-canvas p-4">
              <div className="flex items-center justify-between">
                <span className="text-ui text-muted">Valor</span>
                <span className="font-display text-h2 font-bold text-brand">{brl(invoice.amountCents)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-dense">
                <span className="text-muted">Vencimento</span>
                <span className={overdue ? "font-semibold text-danger" : "text-foreground"}>
                  {fmtDate(invoice.dueDate)}
                </span>
              </div>
            </div>

            {invoice.status === "paid" ? (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 p-3 text-dense text-success">
                <CheckCircle2 className="size-4" /> Pagamento confirmado
                {invoice.paidAt && ` em ${fmtDate(invoice.paidAt)}`}.
              </div>
            ) : overdue ? (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 p-3 text-dense text-danger">
                <Clock className="size-4" /> Fatura vencida. Entre em contato para regularizar.
              </div>
            ) : null}
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-subtle">Emitida por {brandName}</p>
      </div>
    </div>
  );
}
