/**
 * View-models da tela de referência (mock).
 *
 * São tipos de APRESENTAÇÃO — próximos do schema em @wayline/db, porém já
 * "achatados" para o board (com responsáveis embutidos, contadores etc.).
 * Quando o backend entrar, um mapper converte linhas do banco nestes tipos.
 */

export type Priority = "urgent" | "high" | "normal" | "low";

export interface Person {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface ClientRef {
  id: string;
  name: string;
  color: string;
}

export interface TaskCard {
  id: string;
  title: string;
  description?: string | null;
  client?: ClientRef;
  assignees: Person[];
  priority: Priority;
  dueLabel?: string;
  overdue?: boolean;
  tags: { label: string; color: string }[];
  attachments: number;
  comments: number;
  subtasks?: { done: number; total: number };
  blocked?: boolean;
  trackedSeconds?: number;
  estimateMinutes?: number | null;
  customFields?: Array<{ name: string; type: string; value: string }>;
}

export interface BoardColumn {
  id: string;
  name: string;
  kind: "open" | "active" | "review" | "done";
  color: string;
  cards: TaskCard[];
}

export interface SpaceNav {
  id: string;
  name: string;
  color: string;
  lists: { id: string; name: string; count?: number }[];
}

export interface HomeItem {
  id: string;
  label: string;
  icon: "inbox" | "reply" | "comment" | "check" | "more";
  count?: number;
}

export interface PresenceUser extends Person {
  color: string;
  x: number; // % relativo à área do board
  y: number;
  active: boolean;
}
