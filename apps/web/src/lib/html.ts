/**
 * Converte HTML (do editor rico da descrição) em texto puro seguro para exibir
 * em superfícies públicas (portal do cliente), sem risco de XSS. Texto simples
 * legado passa direto.
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  if (!/<[a-z][\s\S]*>/i.test(html)) return html; // já é texto puro
  return html
    .replace(/<(?:br|\/p|\/h[1-6]|\/li|hr|\/blockquote)\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
