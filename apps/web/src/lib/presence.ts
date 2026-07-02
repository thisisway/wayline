/**
 * Registro de presença em memória: quem está vendo cada lista/board.
 * Single-instance (mesma limitação do live.ts). Viewers expiram por TTL —
 * o client manda heartbeat periódico enquanto está na página.
 */
export interface Viewer {
  userId: string;
  name: string;
  avatarUrl: string | null;
}

interface StoredViewer extends Viewer {
  expiresAt: number;
}

const TTL_MS = 30_000;
const rooms = new Map<string, Map<string, StoredViewer>>();

export function heartbeat(listId: string, viewer: Viewer): void {
  let room = rooms.get(listId);
  if (!room) {
    room = new Map();
    rooms.set(listId, room);
  }
  room.set(viewer.userId, { ...viewer, expiresAt: Date.now() + TTL_MS });
}

export function leave(listId: string, userId: string): void {
  rooms.get(listId)?.delete(userId);
}

/** Viewers ativos (remove expirados de passagem). */
export function viewers(listId: string): Viewer[] {
  const room = rooms.get(listId);
  if (!room) return [];
  const now = Date.now();
  const out: Viewer[] = [];
  for (const [id, v] of room) {
    if (v.expiresAt < now) room.delete(id);
    else out.push({ userId: v.userId, name: v.name, avatarUrl: v.avatarUrl });
  }
  return out;
}
