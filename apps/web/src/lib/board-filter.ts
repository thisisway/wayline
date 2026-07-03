import type { BoardData } from "@wayline/db";

export interface BoardFilters {
  priorities: string[];
  assigneeIds: string[];
  clientIds: string[];
  tags: string[];
}

export const EMPTY_FILTERS: BoardFilters = {
  priorities: [],
  assigneeIds: [],
  clientIds: [],
  tags: [],
};

export function activeFilterCount(f: BoardFilters): number {
  return f.priorities.length + f.assigneeIds.length + f.clientIds.length + f.tags.length;
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
        return true;
      }),
    })),
  };
}
