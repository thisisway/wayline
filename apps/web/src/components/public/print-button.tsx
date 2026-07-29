"use client";

import { Printer } from "lucide-react";

/** Imprimir / Salvar como PDF (usa o diálogo de impressão do navegador). */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-dense font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground print:hidden"
    >
      <Printer className="size-4" /> Imprimir / PDF
    </button>
  );
}
