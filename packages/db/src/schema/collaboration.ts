import { relations, sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organizations, users } from "./core";
import { tasks } from "./hierarchy";
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
