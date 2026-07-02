import { relations } from "drizzle-orm";
import { index, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { clientStatus, idColumn, membershipRole, softDelete, timestamps } from "./_shared";

/**
 * NÚCLEO multi-tenant.
 *
 * Toda tabela de conteúdo carrega `org_id`. Numa etapa futura, cada uma
 * ganhará uma RLS policy do tipo:
 *   USING (org_id = current_setting('app.current_org')::uuid)
 * garantindo isolamento no próprio banco (defesa em profundidade).
 */

export const organizations = pgTable("organizations", {
  id: idColumn(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: text("plan").notNull().default("free"),
  region: text("region").notNull().default("sa-east-1"),
  ...timestamps,
  ...softDelete,
});

export const users = pgTable("users", {
  id: idColumn(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  avatarUrl: text("avatar_url"),
  // Auth.js (Credentials): hash bcrypt. Nulo p/ usuários ainda sem senha.
  passwordHash: text("password_hash"),
  ...timestamps,
});

/** Vínculo user↔org com papel. Guests são o acesso do portal do cliente. */
export const memberships = pgTable(
  "memberships",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: membershipRole("role").notNull().default("member"),
    ...timestamps,
  },
  (t) => [
    unique("memberships_org_user_uq").on(t.orgId, t.userId),
    index("memberships_org_idx").on(t.orgId),
  ],
);

/**
 * CLIENTES — dimensão transversal (cidadão de primeira classe).
 * Presente no modelo mental desde o início: tarefas/listas podem referenciá-lo.
 */
export const clients = pgTable(
  "clients",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    contactEmail: text("contact_email"),
    status: clientStatus("status").notNull().default("active"),
    color: text("color").notNull().default("#1D66FF"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index("clients_org_idx").on(t.orgId)],
);

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  memberships: many(memberships),
  clients: many(clients),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  organization: one(organizations, {
    fields: [memberships.orgId],
    references: [organizations.id],
  }),
  user: one(users, { fields: [memberships.userId], references: [users.id] }),
}));

export const clientsRelations = relations(clients, ({ one }) => ({
  organization: one(organizations, {
    fields: [clients.orgId],
    references: [organizations.id],
  }),
}));
