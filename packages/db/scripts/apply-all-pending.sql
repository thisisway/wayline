-- ============================================================================
-- Wayline — TODAS as migrações pendentes (0033–0050), consolidadas.
-- Idempotente (IF NOT EXISTS / DO-EXCEPTION nas FKs). Seguro reaplicar.
--
-- Uso (console do container wayline-db, como owner):
--   psql -U wayline -d wayline -f apply-all-pending.sql
-- ============================================================================

-- ---------- platform_settings: colunas novas (0034/0039/0044) ----------
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "modules" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "support_whatsapp_url" text;
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "support_alert_whatsapp" text;

-- ---------- organizations: stripe (0045) ----------
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;

-- ---------- 0033/0035/0037: propostas + itens (no-RLS) ----------
CREATE TABLE IF NOT EXISTS "proposals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "org_id" uuid NOT NULL,
  "client_id" uuid, "title" text DEFAULT 'Proposta' NOT NULL, "intro" text DEFAULT '' NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL, "token" text NOT NULL, "valid_until" timestamptz,
  "decided_by_name" text, "decided_at" timestamptz, "created_by" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL, "updated_at" timestamptz DEFAULT now() NOT NULL,
  "deleted_at" timestamptz, CONSTRAINT "proposals_token_unique" UNIQUE("token"));
CREATE TABLE IF NOT EXISTS "proposal_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "org_id" uuid NOT NULL,
  "proposal_id" uuid NOT NULL, "description" text DEFAULT '' NOT NULL,
  "amount_cents" integer DEFAULT 0 NOT NULL, "position" integer DEFAULT 0 NOT NULL);
CREATE INDEX IF NOT EXISTS "proposals_org_idx" ON "proposals"("org_id");
CREATE INDEX IF NOT EXISTS "proposals_token_idx" ON "proposals"("token");
CREATE INDEX IF NOT EXISTS "proposal_items_proposal_idx" ON "proposal_items"("proposal_id");
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "number" integer DEFAULT 0 NOT NULL;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "objective" text DEFAULT '' NOT NULL;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "terms" text DEFAULT '' NOT NULL;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "bonus" text DEFAULT '' NOT NULL;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "schedule" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "portfolio_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "discount_pct" integer DEFAULT 0 NOT NULL;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "payment_method" text DEFAULT '' NOT NULL;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "payment_terms" text DEFAULT '' NOT NULL;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "recurrence" text DEFAULT 'once' NOT NULL;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "next_steps" text DEFAULT '' NOT NULL;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "internal_notes" text DEFAULT '' NOT NULL;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "decided_by_doc" text;
ALTER TABLE "proposal_items" ADD COLUMN IF NOT EXISTS "details" text DEFAULT '' NOT NULL;
ALTER TABLE "proposal_items" ADD COLUMN IF NOT EXISTS "quantity" integer DEFAULT 1 NOT NULL;
ALTER TABLE "proposal_items" ADD COLUMN IF NOT EXISTS "unit" text DEFAULT 'Unidade' NOT NULL;
ALTER TABLE "proposal_items" ADD COLUMN IF NOT EXISTS "term" text DEFAULT '' NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON "proposals" TO wayline_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "proposal_items" TO wayline_app;

-- ---------- 0036: catálogo de serviços (COM RLS) ----------
CREATE TABLE IF NOT EXISTS "services" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "org_id" uuid NOT NULL,
  "name" text DEFAULT '' NOT NULL, "description" text DEFAULT '' NOT NULL,
  "amount_cents" integer DEFAULT 0 NOT NULL, "unit" text DEFAULT 'Unidade' NOT NULL,
  "term" text DEFAULT '' NOT NULL, "position" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL, "updated_at" timestamptz DEFAULT now() NOT NULL,
  "deleted_at" timestamptz);
CREATE INDEX IF NOT EXISTS "services_org_idx" ON "services"("org_id");
ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "services" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "services_org_isolation" ON "services";
CREATE POLICY "services_org_isolation" ON "services"
  USING (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "services" TO wayline_app;

-- ---------- 0037: portfólio (no-RLS) ----------
CREATE TABLE IF NOT EXISTS "portfolio_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "org_id" uuid NOT NULL,
  "title" text DEFAULT '' NOT NULL, "image_url" text DEFAULT '' NOT NULL, "link_url" text,
  "position" integer DEFAULT 0 NOT NULL, "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL, "deleted_at" timestamptz);
CREATE INDEX IF NOT EXISTS "portfolio_org_idx" ON "portfolio_items"("org_id");
GRANT SELECT, INSERT, UPDATE, DELETE ON "portfolio_items" TO wayline_app;

-- ---------- 0038: contratos (no-RLS) ----------
CREATE TABLE IF NOT EXISTS "contracts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "org_id" uuid NOT NULL,
  "client_id" uuid, "proposal_id" uuid, "number" integer DEFAULT 0 NOT NULL,
  "title" text DEFAULT 'Contrato' NOT NULL, "content" text DEFAULT '' NOT NULL,
  "value_cents" integer DEFAULT 0 NOT NULL, "status" text DEFAULT 'draft' NOT NULL,
  "token" text NOT NULL, "signed_by_name" text, "signed_by_doc" text, "signed_at" timestamptz,
  "created_by" uuid, "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL, "deleted_at" timestamptz,
  CONSTRAINT "contracts_token_unique" UNIQUE("token"));
CREATE INDEX IF NOT EXISTS "contracts_org_idx" ON "contracts"("org_id");
CREATE INDEX IF NOT EXISTS "contracts_token_idx" ON "contracts"("token");
GRANT SELECT, INSERT, UPDATE, DELETE ON "contracts" TO wayline_app;

-- ---------- 0039/0042/0043: suporte (chamados + mensagens) ----------
CREATE TABLE IF NOT EXISTS "support_tickets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "org_id" uuid NOT NULL,
  "user_id" uuid, "user_name" text DEFAULT '' NOT NULL, "user_email" text DEFAULT '' NOT NULL,
  "org_name" text DEFAULT '' NOT NULL, "category" text DEFAULT 'support' NOT NULL,
  "subject" text DEFAULT '' NOT NULL, "message" text DEFAULT '' NOT NULL,
  "status" text DEFAULT 'open' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL, "updated_at" timestamptz DEFAULT now() NOT NULL);
CREATE INDEX IF NOT EXISTS "support_tickets_status_idx" ON "support_tickets"("status");
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "attachment_url" text;
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "user_read_at" timestamptz;
CREATE TABLE IF NOT EXISTS "support_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ticket_id" uuid NOT NULL, "org_id" uuid NOT NULL, "author_id" uuid,
  "author_name" text DEFAULT '' NOT NULL, "is_admin" boolean DEFAULT false NOT NULL,
  "body" text DEFAULT '' NOT NULL, "attachment_url" text,
  "created_at" timestamptz DEFAULT now() NOT NULL);
CREATE INDEX IF NOT EXISTS "support_messages_ticket_idx" ON "support_messages"("ticket_id");
GRANT SELECT, INSERT, UPDATE, DELETE ON "support_tickets" TO wayline_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "support_messages" TO wayline_app;

-- ---------- 0040/0041: formulários ----------
CREATE TABLE IF NOT EXISTS "forms" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "org_id" uuid NOT NULL,
  "title" text DEFAULT 'Formulário' NOT NULL, "description" text DEFAULT '' NOT NULL,
  "fields" jsonb DEFAULT '[]'::jsonb NOT NULL, "status" text DEFAULT 'draft' NOT NULL,
  "token" text NOT NULL, "thank_you" text DEFAULT 'Obrigado! Sua resposta foi registrada.' NOT NULL,
  "created_by" uuid, "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL, "deleted_at" timestamptz,
  CONSTRAINT "forms_token_unique" UNIQUE("token"));
ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "target_list_id" uuid;
CREATE TABLE IF NOT EXISTS "form_responses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "org_id" uuid NOT NULL,
  "form_id" uuid NOT NULL, "answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL);
CREATE INDEX IF NOT EXISTS "forms_org_idx" ON "forms"("org_id");
CREATE INDEX IF NOT EXISTS "forms_token_idx" ON "forms"("token");
CREATE INDEX IF NOT EXISTS "form_responses_form_idx" ON "form_responses"("form_id");
CREATE INDEX IF NOT EXISTS "form_responses_org_idx" ON "form_responses"("org_id");
GRANT SELECT, INSERT, UPDATE, DELETE ON "forms" TO wayline_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "form_responses" TO wayline_app;

-- ---------- 0046: portal do cliente (no-RLS) ----------
CREATE TABLE IF NOT EXISTS "client_portals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "org_id" uuid NOT NULL,
  "client_id" uuid NOT NULL UNIQUE, "token" text NOT NULL UNIQUE,
  "revoked" boolean DEFAULT false NOT NULL, "created_at" timestamptz DEFAULT now() NOT NULL);
CREATE INDEX IF NOT EXISTS "client_portals_token_idx" ON "client_portals"("token");
GRANT SELECT, INSERT, UPDATE, DELETE ON "client_portals" TO wayline_app;

-- ---------- 0047: proofing (anotações em comentários) ----------
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "attachment_id" uuid;
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "pin_x" real;
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "pin_y" real;

-- ---------- 0048/0049: faturas (no-RLS) ----------
CREATE TABLE IF NOT EXISTS "invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "org_id" uuid NOT NULL,
  "client_id" uuid, "contract_id" uuid, "number" integer DEFAULT 0 NOT NULL,
  "title" text DEFAULT 'Fatura' NOT NULL, "description" text DEFAULT '' NOT NULL,
  "amount_cents" integer DEFAULT 0 NOT NULL, "due_date" timestamptz,
  "status" text DEFAULT 'draft' NOT NULL, "paid_at" timestamptz,
  "token" text NOT NULL UNIQUE, "created_by" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL, "updated_at" timestamptz DEFAULT now() NOT NULL,
  "deleted_at" timestamptz);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "recurrence" text DEFAULT 'none' NOT NULL;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "next_issue_at" timestamptz;
CREATE INDEX IF NOT EXISTS "invoices_org_idx" ON "invoices"("org_id");
CREATE INDEX IF NOT EXISTS "invoices_token_idx" ON "invoices"("token");
GRANT SELECT, INSERT, UPDATE, DELETE ON "invoices" TO wayline_app;

-- ---------- 0050: despesas (no-RLS) ----------
CREATE TABLE IF NOT EXISTS "expenses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "org_id" uuid NOT NULL,
  "client_id" uuid, "description" text DEFAULT '' NOT NULL, "category" text DEFAULT 'Geral' NOT NULL,
  "amount_cents" integer DEFAULT 0 NOT NULL, "due_date" timestamptz,
  "paid" boolean DEFAULT false NOT NULL, "paid_at" timestamptz,
  "recurrence" text DEFAULT 'none' NOT NULL, "created_by" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL, "updated_at" timestamptz DEFAULT now() NOT NULL,
  "deleted_at" timestamptz);
CREATE INDEX IF NOT EXISTS "expenses_org_idx" ON "expenses"("org_id");
GRANT SELECT, INSERT, UPDATE, DELETE ON "expenses" TO wayline_app;
