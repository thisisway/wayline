-- ============================================================================
-- Wayline — Módulo Comercial: aplicação consolidada e idempotente
-- Cobre as migrações 0033–0038 (propostas v2, catálogo, portfólio, contratos,
-- módulos da plataforma). Seguro rodar mais de uma vez (IF NOT EXISTS + blocos
-- DO para as foreign keys).
--
-- Uso (no console do container wayline-db, como owner do banco):
--   psql -U wayline -d wayline -f apply-comercial.sql
--
-- Ou, se o arquivo não estiver no container, cole o conteúdo num heredoc:
--   psql -U wayline -d wayline <<'SQL'
--   ...conteúdo...
--   SQL
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0034: módulos da plataforma
-- ---------------------------------------------------------------------------
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "modules" jsonb DEFAULT '[]'::jsonb NOT NULL;

-- ---------------------------------------------------------------------------
-- 0033: propostas + itens (base) — sem RLS (token é o segredo; org_id no app)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "proposals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "client_id" uuid,
  "title" text DEFAULT 'Proposta' NOT NULL,
  "intro" text DEFAULT '' NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "token" text NOT NULL,
  "valid_until" timestamp with time zone,
  "decided_by_name" text,
  "decided_at" timestamp with time zone,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  CONSTRAINT "proposals_token_unique" UNIQUE("token")
);

CREATE TABLE IF NOT EXISTS "proposal_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "proposal_id" uuid NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "amount_cents" integer DEFAULT 0 NOT NULL,
  "position" integer DEFAULT 0 NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "proposals" ADD CONSTRAINT "proposals_org_id_organizations_id_fk"
    FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "proposals" ADD CONSTRAINT "proposals_client_id_clients_id_fk"
    FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "proposals" ADD CONSTRAINT "proposals_created_by_users_id_fk"
    FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "proposal_items" ADD CONSTRAINT "proposal_items_org_id_organizations_id_fk"
    FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "proposal_items" ADD CONSTRAINT "proposal_items_proposal_id_proposals_id_fk"
    FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "proposals_org_idx" ON "proposals" USING btree ("org_id");
CREATE INDEX IF NOT EXISTS "proposals_token_idx" ON "proposals" USING btree ("token");
CREATE INDEX IF NOT EXISTS "proposal_items_proposal_idx" ON "proposal_items" USING btree ("proposal_id");

-- 0035 + 0037: colunas v2 das propostas e dos itens
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

-- ---------------------------------------------------------------------------
-- 0036: catálogo de serviços — COM RLS (conteúdo interno da org)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "services" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "name" text DEFAULT '' NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "amount_cents" integer DEFAULT 0 NOT NULL,
  "unit" text DEFAULT 'Unidade' NOT NULL,
  "term" text DEFAULT '' NOT NULL,
  "position" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);
DO $$ BEGIN
  ALTER TABLE "services" ADD CONSTRAINT "services_org_id_organizations_id_fk"
    FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "services_org_idx" ON "services" USING btree ("org_id");
ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "services" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "services_org_isolation" ON "services";
CREATE POLICY "services_org_isolation" ON "services"
  USING (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "services" TO wayline_app;

-- ---------------------------------------------------------------------------
-- 0037: portfólio (cases) — sem RLS (aparece no link público; org_id no app)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "portfolio_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "title" text DEFAULT '' NOT NULL,
  "image_url" text DEFAULT '' NOT NULL,
  "link_url" text,
  "position" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);
DO $$ BEGIN
  ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_org_id_organizations_id_fk"
    FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "portfolio_org_idx" ON "portfolio_items" USING btree ("org_id");
GRANT SELECT, INSERT, UPDATE, DELETE ON "portfolio_items" TO wayline_app;

-- ---------------------------------------------------------------------------
-- 0038: contratos — sem RLS (token é o segredo; org_id filtrado no app)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "contracts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "client_id" uuid,
  "proposal_id" uuid,
  "number" integer DEFAULT 0 NOT NULL,
  "title" text DEFAULT 'Contrato' NOT NULL,
  "content" text DEFAULT '' NOT NULL,
  "value_cents" integer DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "token" text NOT NULL,
  "signed_by_name" text,
  "signed_by_doc" text,
  "signed_at" timestamp with time zone,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  CONSTRAINT "contracts_token_unique" UNIQUE("token")
);
DO $$ BEGIN
  ALTER TABLE "contracts" ADD CONSTRAINT "contracts_org_id_organizations_id_fk"
    FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "contracts" ADD CONSTRAINT "contracts_client_id_clients_id_fk"
    FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "contracts" ADD CONSTRAINT "contracts_proposal_id_proposals_id_fk"
    FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "contracts" ADD CONSTRAINT "contracts_created_by_users_id_fk"
    FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "contracts_org_idx" ON "contracts" USING btree ("org_id");
CREATE INDEX IF NOT EXISTS "contracts_token_idx" ON "contracts" USING btree ("token");
GRANT SELECT, INSERT, UPDATE, DELETE ON "contracts" TO wayline_app;

-- ---------------------------------------------------------------------------
-- Conferência rápida (opcional): descomente para listar o que foi criado.
-- ---------------------------------------------------------------------------
-- \dt services|portfolio_items|proposals|proposal_items|contracts
