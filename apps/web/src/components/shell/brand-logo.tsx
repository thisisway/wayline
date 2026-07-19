import { cn } from "@wayline/ui";

/**
 * Logo da plataforma com troca automática por tema (via classe `.dark`).
 * Se só um logo existir, ele vale para os dois temas. Sem nenhum, mostra o
 * `fallback` (a letra "W" por padrão). O container é fornecido por quem usa.
 */
export function BrandLogo({
  light,
  dark,
  fallback = "W",
  className,
}: {
  light?: string | null;
  dark?: string | null;
  fallback?: React.ReactNode;
  className?: string;
}) {
  if (!light && !dark) return <>{fallback}</>;
  const l = light || dark || undefined;
  const d = dark || light || undefined;
  return (
    <>
      <img src={l} alt="Logo" className={cn("object-contain dark:hidden", className)} />
      <img src={d} alt="Logo" className={cn("hidden object-contain dark:block", className)} />
    </>
  );
}

/** true se há pelo menos um logo custom (para decidir logo x badge "W"). */
export function hasBrandLogo(light?: string | null, dark?: string | null): boolean {
  return Boolean(light || dark);
}
