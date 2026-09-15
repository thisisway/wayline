/**
 * "Recentes" — tarefas abertas recentemente, por navegador (localStorage).
 * Leve e sem backend; usado no Home. Falha silenciosa se o storage estiver
 * indisponível (janela privada, storage bloqueado).
 */
export interface RecentTask {
  id: string;
  title: string;
  listId: string;
  listName?: string;
  at: number;
}

const KEY = "wl_recent_tasks";
const MAX = 10;

export function getRecentTasks(): RecentTask[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as RecentTask[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function pushRecentTask(item: Omit<RecentTask, "at">): void {
  if (!item.id || !item.listId) return;
  try {
    const cur = getRecentTasks().filter((x) => x.id !== item.id);
    const next = [{ ...item, at: Date.now() }, ...cur].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage indisponível — ignora */
  }
}
