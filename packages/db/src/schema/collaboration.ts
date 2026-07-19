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
import { clients, organizations, users } from "./core";
import { lists, statuses, tasks } from "./hierarchy";
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
    // Nulo quando o comentário vem do cliente pelo link público (usa guest_name).
    authorId: uuid("author_id").references(() => users.id, { onDelete: "cascade" }),
    /** Nome do convidado (portal do cliente) quando não há author_id. */
    guestName: text("guest_name"),
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

/** DOCUMENTO/brief por lista (um por lista). Editável e gerável por IA. */
export const documents = pgTable(
  "documents",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Brief"),
    content: text("content").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    uniqueIndex("documents_list_unique").on(t.listId),
    index("documents_org_idx").on(t.orgId),
  ],
);

/**
 * PÁGINAS (Docs / Wiki / Notepad). Documentos com hierarquia (parent_id) e
 * escopo: `owner_id` nulo = documento do WORKSPACE (compartilhado com a org);
 * `owner_id` preenchido = nota PESSOAL (Notepad), visível só ao dono.
 * RLS por org isola tenants; a visibilidade pessoal é aplicada nas queries.
 */
export const pages = pgTable(
  "pages",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Sem título"),
    content: text("content").notNull().default(""),
    icon: text("icon"),
    position: integer("position").notNull().default(0),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index("pages_org_idx").on(t.orgId),
    index("pages_parent_idx").on(t.parentId),
    index("pages_owner_idx").on(t.ownerId),
  ],
);

export const pagesRelations = relations(pages, ({ one }) => ({
  owner: one(users, { fields: [pages.ownerId], references: [users.id] }),
}));

/**
 * AUTOMAÇÕES por lista. Gatilho: tarefa entra numa coluna (trigger_status_id).
 * Ação: `action_type` ('assign' | 'priority') com `action_value` (userId ou prioridade).
 */
export const automations = pgTable(
  "automations",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    /** 'status' (entra na coluna) | 'approved' | 'changes'. */
    triggerType: text("trigger_type").notNull().default("status"),
    /** Coluna do gatilho (só quando trigger_type = 'status'). */
    triggerStatusId: uuid("trigger_status_id").references(() => statuses.id, {
      onDelete: "cascade",
    }),
    actionType: text("action_type").notNull(),
    actionValue: text("action_value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    index("automations_status_idx").on(t.triggerStatusId),
    index("automations_list_idx").on(t.listId),
    index("automations_org_idx").on(t.orgId),
  ],
);

/**
 * PORTFÓLIO (módulo Comercial): cases/trabalhos exibidos na proposta. SEM RLS
 * (aparecem no link público das propostas; org_id filtrado no app).
 */
export const portfolioItems = pgTable(
  "portfolio_items",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull().default(""),
    imageUrl: text("image_url").notNull().default(""),
    linkUrl: text("link_url"),
    position: integer("position").notNull().default(0),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index("portfolio_org_idx").on(t.orgId)],
);

/**
 * CATÁLOGO DE SERVIÇOS (módulo Comercial). Serviços reutilizáveis que preenchem
 * itens de proposta. COM RLS por org (conteúdo interno, não é compartilhado).
 */
export const services = pgTable(
  "services",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull().default(""),
    description: text("description").notNull().default(""),
    amountCents: integer("amount_cents").notNull().default(0),
    unit: text("unit").notNull().default("Unidade"),
    term: text("term").notNull().default(""),
    position: integer("position").notNull().default(0),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index("services_org_idx").on(t.orgId)],
);

/**
 * PROPOSTAS comerciais. SEM RLS (como `invitations`/`board_shares`): o `token`
 * é o segredo do link público, e as buscas internas filtram por `org_id`
 * explicitamente (guardadas por assertMember/assertRole nas actions).
 */
export const proposals = pgTable(
  "proposals",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    /** Número sequencial por org (PROP-00010). */
    number: integer("number").notNull().default(0),
    title: text("title").notNull().default("Proposta"),
    /** Apresentação (intro), Objetivo, Condições gerais, Bônus — seções de texto. */
    intro: text("intro").notNull().default(""),
    objective: text("objective").notNull().default(""),
    terms: text("terms").notNull().default(""),
    bonus: text("bonus").notNull().default(""),
    /** Cronograma de entrega: fases [{label, duration}]. */
    schedule: jsonb("schedule").$type<Array<{ label: string; duration: string }>>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    /** IDs de cases do portfólio incluídos na proposta. */
    portfolioIds: jsonb("portfolio_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    /** Comercial. */
    discountPct: integer("discount_pct").notNull().default(0),
    paymentMethod: text("payment_method").notNull().default(""),
    paymentTerms: text("payment_terms").notNull().default(""),
    /** once | monthly */
    recurrence: text("recurrence").notNull().default("once"),
    nextSteps: text("next_steps").notNull().default(""),
    /** Só interno (não vai pro cliente). */
    internalNotes: text("internal_notes").notNull().default(""),
    /** draft | sent | accepted | rejected */
    status: text("status").notNull().default("draft"),
    token: text("token").notNull().unique(),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    /** Assinatura do cliente pelo link público. */
    decidedByName: text("decided_by_name"),
    decidedByDoc: text("decided_by_doc"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index("proposals_org_idx").on(t.orgId), index("proposals_token_idx").on(t.token)],
);

/** Itens (linhas) da proposta. Valor em centavos. */
export const proposalItems = pgTable(
  "proposal_items",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    proposalId: uuid("proposal_id")
      .notNull()
      .references(() => proposals.id, { onDelete: "cascade" }),
    description: text("description").notNull().default(""),
    /** Descrição longa (detalhes do serviço). */
    details: text("details").notNull().default(""),
    /** Preço UNITÁRIO em centavos. Subtotal = quantity × amountCents. */
    amountCents: integer("amount_cents").notNull().default(0),
    quantity: integer("quantity").notNull().default(1),
    unit: text("unit").notNull().default("Unidade"),
    /** Prazo de entrega (texto livre). */
    term: text("term").notNull().default(""),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("proposal_items_proposal_idx").on(t.proposalId)],
);

export const proposalsRelations = relations(proposals, ({ one, many }) => ({
  client: one(clients, { fields: [proposals.clientId], references: [clients.id] }),
  organization: one(organizations, {
    fields: [proposals.orgId],
    references: [organizations.id],
  }),
  items: many(proposalItems),
}));

export const proposalItemsRelations = relations(proposalItems, ({ one }) => ({
  proposal: one(proposals, { fields: [proposalItems.proposalId], references: [proposals.id] }),
}));

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
