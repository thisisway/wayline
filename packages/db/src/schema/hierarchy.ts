import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { clients, organizations } from "./core";
import { idColumn, softDelete, statusKind, taskPriority, timestamps } from "./_shared";

/**
 * HIERARQUIA: Space → Folder → List → Task (+ subtarefas via parent_id).
 * Statuses são custom por escopo (list/space). Campos custom "quentes" são
 * colunas tipadas; o resto vive em `custom` (JSONB, futuros índices GIN).
 */

export const spaces = pgTable(
  "spaces",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    icon: text("icon"),
    color: text("color").notNull().default("#1D66FF"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index("spaces_org_idx").on(t.orgId)],
);

export const folders = pgTable(
  "folders",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index("folders_space_idx").on(t.spaceId)],
);

export const lists = pgTable(
  "lists",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    spaceId: uuid("space_id").references(() => spaces.id, { onDelete: "cascade" }),
    folderId: uuid("folder_id").references(() => folders.id, { onDelete: "cascade" }),
    // Cliente opcional na lista (ex.: lista dedicada a um cliente/campanha).
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index("lists_org_idx").on(t.orgId), index("lists_space_idx").on(t.spaceId)],
);

/** Status custom por escopo (list/space). */
export const statuses = pgTable(
  "statuses",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    listId: uuid("list_id").references(() => lists.id, { onDelete: "cascade" }),
    spaceId: uuid("space_id").references(() => spaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("#94A3B8"),
    kind: statusKind("kind").notNull().default("open"),
    position: integer("position").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("statuses_list_idx").on(t.listId)],
);

export const tasks = pgTable(
  "tasks",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    // Subtarefas
    parentId: uuid("parent_id"),
    // Cliente transversal
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    statusId: uuid("status_id").references(() => statuses.id, { onDelete: "set null" }),

    title: text("title").notNull(),
    description: text("description"),
    priority: taskPriority("priority").notNull().default("normal"),
    startDate: timestamp("start_date", { withTimezone: true }),
    dueDate: timestamp("due_date", { withTimezone: true }),
    position: integer("position").notNull().default(0),
    completed: boolean("completed").notNull().default(false),

    // Campos custom "frios" (colunas quentes ficam tipadas acima).
    custom: jsonb("custom").notNull().default({}),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index("tasks_org_idx").on(t.orgId),
    index("tasks_list_idx").on(t.listId),
    index("tasks_status_idx").on(t.statusId),
    index("tasks_client_idx").on(t.clientId),
    index("tasks_parent_idx").on(t.parentId),
  ],
);

// Relations
export const spacesRelations = relations(spaces, ({ many, one }) => ({
  organization: one(organizations, {
    fields: [spaces.orgId],
    references: [organizations.id],
  }),
  folders: many(folders),
  lists: many(lists),
}));

export const foldersRelations = relations(folders, ({ one, many }) => ({
  space: one(spaces, { fields: [folders.spaceId], references: [spaces.id] }),
  lists: many(lists),
}));

export const listsRelations = relations(lists, ({ one, many }) => ({
  space: one(spaces, { fields: [lists.spaceId], references: [spaces.id] }),
  folder: one(folders, { fields: [lists.folderId], references: [folders.id] }),
  client: one(clients, { fields: [lists.clientId], references: [clients.id] }),
  statuses: many(statuses),
  tasks: many(tasks),
}));

export const statusesRelations = relations(statuses, ({ one, many }) => ({
  list: one(lists, { fields: [statuses.listId], references: [lists.id] }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  list: one(lists, { fields: [tasks.listId], references: [lists.id] }),
  status: one(statuses, { fields: [tasks.statusId], references: [statuses.id] }),
  client: one(clients, { fields: [tasks.clientId], references: [clients.id] }),
  parent: one(tasks, { fields: [tasks.parentId], references: [tasks.id], relationName: "subtasks" }),
  subtasks: many(tasks, { relationName: "subtasks" }),
}));
