import { relations } from "drizzle-orm";
import { index, pgTable, text, uuid } from "drizzle-orm/pg-core";
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
    parentId: uuid("parent_id"),
    body: text("body").notNull(),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index("comments_task_idx").on(t.taskId), index("comments_org_idx").on(t.orgId)],
);

export const commentsRelations = relations(comments, ({ one }) => ({
  task: one(tasks, { fields: [comments.taskId], references: [tasks.id] }),
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
}));
