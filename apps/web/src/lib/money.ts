/**
 * Conversão dinheiro ⇄ centavos (pt-BR). Fonte única — antes duplicada nos
 * modais de proposta/serviço/contrato, onde o descasamento causava o bug de
 * inflar valores 100x.
 */

/** "10,50" ou "1.234,56" → centavos (inteiro). Ponto = milhar, vírgula = decimal. */
export function toCents(v: string): number {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 100)) : 0;
}

/** centavos → texto pt-BR ("1050" → "10,50") que `toCents` sabe reler. */
export const toInput = (cents: number): string => (cents / 100).toFixed(2).replace(".", ",");
