/**
 * Níveis de acesso por MÓDULO (Comercial / Financeiro / Produção).
 *
 * Camada fina sobre o papel org-level (owner/admin/member/guest): o papel dá o
 * default, e o admin pode gravar exceções por membro (ex.: um "member" do time
 * comercial ganha acesso a Comercial mas não ao Financeiro). Sem RBAC completo.
 *
 * Puro (sem dependência de DB): seguro de importar no cliente e no servidor.
 */

export const MODULE_KEYS = ["comercial", "financeiro", "producao"] as const;
export type ModuleKey = (typeof MODULE_KEYS)[number];

/** none < view < edit < manage. */
export type AccessLevel = "none" | "view" | "edit" | "manage";
export type ModuleAccessMap = Record<ModuleKey, AccessLevel>;

const RANK: Record<AccessLevel, number> = { none: 0, view: 1, edit: 2, manage: 3 };

export const MODULE_LABELS: Record<ModuleKey, string> = {
  comercial: "Comercial",
  financeiro: "Financeiro",
  producao: "Produção",
};

/** Default de acesso derivado do papel na org. */
export function defaultModuleAccess(role: string): ModuleAccessMap {
  if (role === "owner" || role === "admin") {
    return { comercial: "manage", financeiro: "manage", producao: "manage" };
  }
  if (role === "member") {
    return { comercial: "none", financeiro: "none", producao: "edit" };
  }
  // guest (portal do cliente) e qualquer papel desconhecido: mínimo.
  return { comercial: "none", financeiro: "none", producao: "view" };
}

/** Combina o default do papel com as exceções gravadas por membro. */
export function effectiveModuleAccess(
  role: string,
  override?: Partial<ModuleAccessMap> | null,
): ModuleAccessMap {
  const base = defaultModuleAccess(role);
  if (!override) return base;
  return {
    comercial: override.comercial ?? base.comercial,
    financeiro: override.financeiro ?? base.financeiro,
    producao: override.producao ?? base.producao,
  };
}

/** O mapa concede AO MENOS o nível `need` no módulo `key`? */
export function hasModuleAccess(map: ModuleAccessMap, key: ModuleKey, need: AccessLevel): boolean {
  return RANK[map[key]] >= RANK[need];
}
