"use client";

import { ChevronRight, Wallet } from "lucide-react";

/** Página do módulo Financeiro (separado do Comercial). */
export function FinancePage({ onOpenInvoices }: { onOpenInvoices: () => void }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-success/10 text-success">
            <Wallet className="size-6" />
          </span>
          <div>
            <h1 className="font-display text-h2 font-bold">Financeiro</h1>
            <p className="text-ui text-muted">Faturas, recebíveis e cobrança dos seus clientes.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenInvoices}
          className="group flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-all hover:border-brand-40 hover:shadow-sm"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
            <Wallet className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-ui font-semibold text-foreground">Faturas</p>
            <p className="truncate text-dense text-muted">
              Emita faturas, acompanhe a receber/vencidas e marque como pagas.
            </p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
        </button>
      </div>
    </div>
  );
}
