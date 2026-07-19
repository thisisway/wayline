/**
 * Módulos da plataforma. Cada módulo agrupa funcionalidades ativáveis pelo
 * superadmin em /admin. A UI só mostra o que o módulo habilita.
 */
export interface ModuleDef {
  id: string;
  name: string;
  description: string;
}

export const MODULES: ModuleDef[] = [
  {
    id: "sales",
    name: "Comercial / Vendas",
    description: "Propostas comerciais para clientes (criar, enviar por link e receber o aceite).",
  },
];

export function moduleEnabled(modules: string[] | null | undefined, id: string): boolean {
  return Array.isArray(modules) && modules.includes(id);
}
