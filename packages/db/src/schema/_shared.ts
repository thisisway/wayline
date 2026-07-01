import { sql } from "drizzle-orm";
import { pgEnum, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Colunas comuns a (quase) toda tabela de conteúdo.
 *
 * `id` é UUID. Timestamps são geridos pelo banco. `deleted_at` habilita soft
 * delete onde fizer sentido.
 */
export const idColumn = () => uuid("id").primaryKey().defaultRandom();

export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
};

export const softDelete = {
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

// Enums compartilhados
export const membershipRole = pgEnum("membership_role", [
  "owner",
  "admin",
  "member",
  "guest",
]);

export const clientStatus = pgEnum("client_status", ["active", "prospect", "paused", "archived"]);

export const statusKind = pgEnum("status_kind", ["open", "active", "done"]);

export const taskPriority = pgEnum("task_priority", ["urgent", "high", "normal", "low"]);
