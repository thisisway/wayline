import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations, users } from "./core";
import { lists, tasks } from "./hierarchy";
import { idColumn, softDelete, timestamps } from "./_shared";

/**
 * COLABORAÇÃO — comentários em tarefas (Fase 1.5).
 * `parent_id` já prevê threads; a UI inicial é plana.
 */
export const comments = pgTable(
  "comments",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Comentário atribuível (ClickUp-style): "resolva isto".
    assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
    parentId: uuid("parent_id"),
    body: text("body").notNull(),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index("comments_task_idx").on(t.taskId), index("comments_org_idx").on(t.orgId)],
);

export const commentsRelations = relations(comments, ({ one }) => ({
  task: one(tasks, { fields: [comments.taskId], references: [tasks.id] }),
  author: one(users, { fields: [comments.authorId], references: [users.id], relationName: "author" }),
  assignee: one(users, {
    fields: [comments.assignedTo],
    references: [users.id],
    relationName: "assignee",
  }),
}));

/**
 * NOTIFICAÇÕES (inbox). Denormalizadas (task_title/actor_name/list_id) para o
 * inbox não precisar de joins e sobreviver à exclusão da tarefa.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // 'comment' | 'assigned'
    taskId: uuid("task_id"),
    listId: uuid("list_id"),
    taskTitle: text("task_title").notNull(),
    actorName: text("actor_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (t) => [index("notifications_user_idx").on(t.userId), index("notifications_org_idx").on(t.orgId)],
);

/** CHAT por lista (discussão do board). */
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [index("chat_list_idx").on(t.listId), index("chat_org_idx").on(t.orgId)],
);

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  author: one(users, { fields: [chatMessages.authorId], references: [users.id] }),
}));

/** ANEXOS — só metadados; os bytes ficam no bucket S3/R2 (storage_key). */
export const attachments = pgTable(
  "attachments",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    uploaderId: uuid("uploader_id").references(() => users.id, { onDelete: "set null" }),
    fileName: text("file_name").notNull(),
    storageKey: text("storage_key").notNull(),
    contentType: text("content_type").notNull(),
    size: bigint("size", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [index("attachments_task_idx").on(t.taskId), index("attachments_org_idx").on(t.orgId)],
);

/**
 * DEPENDÊNCIAS entre tarefas. `blocker` bloqueia `blocked`
 * (ou seja: `blocked` está "bloqueada por" `blocker`).
 */
export const taskDependencies = pgTable(
  "task_dependencies",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    uniqueIndex("task_dep_unique").on(t.blockerId, t.blockedId),
    index("task_dep_blocked_idx").on(t.blockedId),
    index("task_dep_blocker_idx").on(t.blockerId),
    index("task_dep_org_idx").on(t.orgId),
  ],
);

/**
 * CONTROLE DE TEMPO. Cada linha é um intervalo `started_at`→`ended_at`.
 * `ended_at` nulo = cronômetro em andamento (só um por usuário).
 */
export const timeEntries = pgTable(
  "time_entries",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().default(sql`now()`),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    index("time_entries_task_idx").on(t.taskId),
    index("time_entries_user_idx").on(t.userId),
    index("time_entries_org_idx").on(t.orgId),
  ],
);

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  user: one(users, { fields: [timeEntries.userId], references: [users.id] }),
}));

/** HISTÓRICO de atividade da tarefa (feed read-only). `actor_name` denormalizado. */
export const activityLog = pgTable(
  "activity_log",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    actorName: text("actor_name").notNull(),
    action: text("action").notNull(),
    detail: text("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [index("activity_task_idx").on(t.taskId), index("activity_org_idx").on(t.orgId)],
);

/** CAMPOS CUSTOMIZADOS — definições por lista. `type`: text|number|select|date|checkbox. */
export const customFieldDefs = pgTable(
  "custom_field_defs",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull(),
    options: jsonb("options").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [index("cfd_list_idx").on(t.listId), index("cfd_org_idx").on(t.orgId)],
);

/** Valores dos campos por tarefa (um por par tarefa+campo; guardado como texto). */
export const customFieldValues = pgTable(
  "custom_field_values",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    fieldId: uuid("field_id")
      .notNull()
      .references(() => customFieldDefs.id, { onDelete: "cascade" }),
    value: text("value"),
  },
  (t) => [
    uniqueIndex("cfv_task_field_unique").on(t.taskId, t.fieldId),
    index("cfv_task_idx").on(t.taskId),
    index("cfv_org_idx").on(t.orgId),
  ],
);

/**
 * CONVITES por link. SEM RLS (como `organizations`): a busca por token acontece
 * antes de o usuário ser membro, então não há org no contexto. O `token` é o
 * segredo; criar/listar/revogar são guardados por `assertMember` na action.
 */
export const invitations = pgTable(
  "invitations",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    role: text("role").notNull().default("member"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revoked: boolean("revoked").notNull().default(false),
  },
  (t) => [index("invitations_org_idx").on(t.orgId)],
);

/**
 * COMPARTILHAMENTO de board por link público (read-only). SEM RLS (como
 * `invitations`): a busca por token acontece sem sessão. O token é o segredo.
 */
export const boardShares = pgTable(
  "board_shares",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    revoked: boolean("revoked").notNull().default(false),
  },
  (t) => [index("board_shares_list_idx").on(t.listId), index("board_shares_org_idx").on(t.orgId)],
);
