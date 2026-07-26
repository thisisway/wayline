-- ============================================================================
-- Wayline — Suporte + Formulários: aplicação consolidada e idempotente
-- Cobre as migrações 0039 (suporte), 0040 (formulários) e 0041 (roteamento
-- resposta→tarefa). Seguro rodar mais de uma vez (IF NOT EXISTS).
--
-- Uso (console do container wayline-db, como owner):
--   psql -U wayline -d wayline -f apply-suporte-forms.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0039: suporte (chamados) + link do WhatsApp
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "support_tickets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "user_id" uuid,
  "user_name" text DEFAULT '' NOT NULL,
  "user_email" text DEFAULT '' NOT NULL,
  "org_name" text DEFAULT '' NOT NULL,
  "category" text DEFAULT 'support' NOT NULL,
  "subject" text DEFAULT '' NOT NULL,
  "message" text DEFAULT '' NOT NULL,
  "status" text DEFAULT 'open' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "support_tickets_status_idx" ON "support_tickets"("status");
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "support_whatsapp_url" text;
GRANT SELECT, INSERT, UPDATE, DELETE ON "support_tickets" TO wayline_app;

-- 0042: anexo (print) + thread de mensagens do chamado
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "attachment_url" text;
CREATE TABLE IF NOT EXISTS "support_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ticket_id" uuid NOT NULL, "org_id" uuid NOT NULL, "author_id" uuid,
  "author_name" text DEFAULT '' NOT NULL, "is_admin" boolean DEFAULT false NOT NULL,
  "body" text DEFAULT '' NOT NULL, "attachment_url" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "support_messages_ticket_idx" ON "support_messages"("ticket_id");
GRANT SELECT, INSERT, UPDATE, DELETE ON "support_messages" TO wayline_app;

-- ---------------------------------------------------------------------------
-- 0040: formulários + respostas (no-RLS; token público)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "forms" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "title" text DEFAULT 'Formulário' NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "token" text NOT NULL,
  "thank_you" text DEFAULT 'Obrigado! Sua resposta foi registrada.' NOT NULL,
  "created_by" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "deleted_at" timestamptz,
  CONSTRAINT "forms_token_unique" UNIQUE("token")
);
CREATE TABLE IF NOT EXISTS "form_responses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "form_id" uuid NOT NULL,
  "answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "forms_org_idx" ON "forms"("org_id");
CREATE INDEX IF NOT EXISTS "forms_token_idx" ON "forms"("token");
CREATE INDEX IF NOT EXISTS "form_responses_form_idx" ON "form_responses"("form_id");
CREATE INDEX IF NOT EXISTS "form_responses_org_idx" ON "form_responses"("org_id");
GRANT SELECT, INSERT, UPDATE, DELETE ON "forms" TO wayline_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "form_responses" TO wayline_app;

-- ---------------------------------------------------------------------------
-- 0041: resposta do formulário vira tarefa (lista de destino)
-- ---------------------------------------------------------------------------
ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "target_list_id" uuid;
