import { applyRawSql } from "@wayline/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Migrações 0058–0067, idempotentes (IF NOT EXISTS / DO…EXCEPTION). Endpoint
// pontual: exige ?secret=CRON_SECRET e a env MIGRATE_DSN (DSN privilegiada).
// Remova a env MIGRATE_DSN após aplicar para deixar o endpoint inerte.
const MIGRATIONS = `CREATE TABLE IF NOT EXISTS "access_tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"space_id" uuid NOT NULL,
	"folder_id" uuid,
	"name" text DEFAULT 'Acessos' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "access_entries" ADD COLUMN IF NOT EXISTS "table_id" uuid;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "access_tables" ADD CONSTRAINT "access_tables_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "access_tables_org_idx" ON "access_tables" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "access_tables_space_idx" ON "access_tables" USING btree ("space_id");--> statement-breakpoint
ALTER TABLE "access_tables" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "access_tables" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "access_tables_org_isolation" ON "access_tables";--> statement-breakpoint
CREATE POLICY "access_tables_org_isolation" ON "access_tables"
  USING (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "access_tables" TO wayline_app;--> statement-breakpoint
INSERT INTO "access_tables" ("org_id", "space_id", "name")
SELECT DISTINCT "org_id", "space_id", 'Acessos'
FROM "access_entries"
WHERE "table_id" IS NULL AND "deleted_at" IS NULL;--> statement-breakpoint
UPDATE "access_entries" e SET "table_id" = t."id"
FROM "access_tables" t
WHERE e."table_id" IS NULL AND e."space_id" = t."space_id";
--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN IF NOT EXISTS "module_access" jsonb;
--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "stage" text DEFAULT 'lead' NOT NULL;
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "production_list_id" uuid;
--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "target" text DEFAULT 'list' NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "password_resets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_resets_email_unique" UNIQUE("email")
);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "password_resets" TO wayline_app;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "calendar_token" text;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_calendar_token_unique" UNIQUE("calendar_token");
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "calendly_signing_key" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text DEFAULT 'Token' NOT NULL,
	"token_hash" text NOT NULL,
	"scope" text DEFAULT 'write' NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "api_tokens" TO wayline_app;
--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "target_status_id" uuid;`;

async function handle(req: Request): Promise<Response> {
  const secret = new URL(req.url).searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return new Response("unauthorized", { status: 401 });
  }
  // DSN privilegiada (dono das tabelas): via corpo do POST, query ou env.
  let dsn = process.env.MIGRATE_DSN ?? "";
  if (req.method === "POST") {
    const body = (await req.json().catch(() => null)) as { dsn?: string } | null;
    if (body?.dsn) dsn = body.dsn;
  } else {
    dsn = new URL(req.url).searchParams.get("dsn") ?? dsn;
  }
  if (!dsn) return Response.json({ error: "dsn ausente" }, { status: 400 });

  const result = await applyRawSql(dsn, MIGRATIONS);
  return Response.json({ ok: result.errors.length === 0, ...result });
}

export const GET = handle;
export const POST = handle;
