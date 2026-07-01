/**
 * Ponto de entrada do pacote @wayline/db.
 *
 * Ainda SEM cliente de conexão nesta fase. Exporta o schema e tipos inferidos
 * para consumo tipado (ex.: dados mockados no app). Quando o Postgres entrar,
 * adicionamos aqui o `drizzle(pool, { schema })` e a injeção do `org_id` (RLS).
 */
export * as schema from "./schema";

import type {
  organizations,
  users,
  memberships,
  clients,
  spaces,
  folders,
  lists,
  statuses,
  tasks,
} from "./schema";

// Tipos de leitura (select) inferidos do schema.
export type Organization = typeof organizations.$inferSelect;
export type User = typeof users.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Space = typeof spaces.$inferSelect;
export type Folder = typeof folders.$inferSelect;
export type List = typeof lists.$inferSelect;
export type Status = typeof statuses.$inferSelect;
export type Task = typeof tasks.$inferSelect;
