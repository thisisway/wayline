/**
 * Pub/sub em memória para SSE (updates de board + presença) por listId.
 *
 * Funciona por rodar numa ÚNICA instância Node (route handlers e server actions
 * compartilham o processo). Escalar horizontalmente = trocar por Redis pub/sub.
 * Eventos nomeados: `board` (algo mudou, refetch) e `presence` (lista de viewers).
 */
type Subscriber = (chunk: string) => void;

const channels = new Map<string, Set<Subscriber>>();

export function subscribe(listId: string, sub: Subscriber): () => void {
  let set = channels.get(listId);
  if (!set) {
    set = new Set();
    channels.set(listId, set);
  }
  set.add(sub);
  return () => {
    set!.delete(sub);
    if (set!.size === 0) channels.delete(listId);
  };
}

/** Envia um evento SSE nomeado para todos os inscritos na lista. */
export function send(listId: string, event: string, data: string): void {
  const set = channels.get(listId);
  if (!set || set.size === 0) return;
  const chunk = `event: ${event}\ndata: ${data}\n\n`;
  for (const sub of set) sub(chunk);
}
