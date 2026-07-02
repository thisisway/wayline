/**
 * Pub/sub em memória para updates ao vivo do board (SSE).
 *
 * Funciona porque o app roda numa ÚNICA instância Node (route handlers e server
 * actions compartilham o mesmo processo/módulo). Para escalar horizontalmente,
 * trocar por Redis pub/sub. Sem dados sensíveis no canal — só um "ping" por
 * listId sinalizando "algo mudou, refetch".
 */
type Subscriber = (payload: string) => void;

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

export function publish(listId: string): void {
  const set = channels.get(listId);
  if (!set || set.size === 0) return;
  const payload = `data: ${Date.now()}\n\n`;
  for (const sub of set) sub(payload);
}
