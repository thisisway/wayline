import type { BoardData } from "@wayline/db";

export interface BoardFilters {
  priorities: string[];
  assigneeIds: string[];
  clientIds: string[];
  tags: string[];
  /** nome do campo customizado → valores selecionados. */
  customFields: Record<string, string[]>;
}

export const EMPTY_FILTERS: BoardFilters = {
  priorities: [],
  assigneeIds: [],
  clientIds: [],
  tags: [],
  customFields: {},
};

function customCount(f: BoardFilters): number {
  return Object.values(f.customFields).reduce((n, vals) => n + vals.length, 0);
}

export function activeFilterCount(f: BoardFilters): number {
  return (
    f.priorities.length +
    f.assigneeIds.length +
    f.clientIds.length +
    f.tags.length +
    customCount(f)
  );
}

export interface CustomFieldOption {
  name: string;
  type: string;
  values: string[];
}

/** Campos customizados presentes nas tarefas + valores distintos (para o filtro). */
export function collectCustomFieldOptions(data: BoardData): CustomFieldOption[] {
  const byName = new Map<string, { type: string; values: Set<string> }>();
  for (const col of data.columns) {
    for (const t of col.tasks) {
      for (const cf of t.customFields ?? []) {
        if (!cf.value) continue;
        const entry = byName.get(cf.name) ?? { type: cf.type, values: new Set<string>() };
        entry.values.add(cf.value);
        byName.set(cf.name, entry);
      }
    }
  }
  return [...byName.entries()].map(([name, { type, values }]) => ({
    name,
    type,
    values: [...values].sort(),
  }));
}

/** Tags distintas presentes nas tarefas (para as opções do filtro). */
export function collectTags(data: BoardData): Array<{ label: string; color: string }> {
  const map = new Map<string, string>();
  for (const col of data.columns) {
    for (const t of col.tasks) {
      for (const tag of t.tags) if (!map.has(tag.label)) map.set(tag.label, tag.color);
    }
  }
  return [...map.entries()].map(([label, color]) => ({ label, color }));
}

/** Aplica os filtros às tarefas de cada coluna (mantém as colunas). */
export function applyFilters(data: BoardData, f: BoardFilters): BoardData {
  if (activeFilterCount(f) === 0) return data;
  return {
    ...data,
    columns: data.columns.map((col) => ({
      ...col,
      tasks: col.tasks.filter((t) => {
        if (f.priorities.length && !f.priorities.includes(t.priority)) return false;
        if (f.clientIds.length && !(t.client && f.clientIds.includes(t.client.id))) return false;
        if (f.assigneeIds.length && !t.assignees.some((a) => f.assigneeIds.includes(a.id)))
          return false;
        if (f.tags.length && !t.tags.some((tag) => f.tags.includes(tag.label))) return false;
        for (const [name, vals] of Object.entries(f.customFields)) {
          if (vals.length === 0) continue;
          const cf = (t.customFields ?? []).find((x) => x.name === name);
          if (!cf || !vals.includes(cf.value)) return false;
        }
        return true;
      }),
    })),
  };
}
