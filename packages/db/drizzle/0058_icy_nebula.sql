CREATE TABLE IF NOT EXISTS "access_tables" (
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
-- Backfill: cria um cofre "Acessos" por space que já tem credenciais e vincula as entries legadas.
INSERT INTO "access_tables" ("org_id", "space_id", "name")
SELECT DISTINCT "org_id", "space_id", 'Acessos'
FROM "access_entries"
WHERE "table_id" IS NULL AND "deleted_at" IS NULL;--> statement-breakpoint
UPDATE "access_entries" e SET "table_id" = t."id"
FROM "access_tables" t
WHERE e."table_id" IS NULL AND e."space_id" = t."space_id";
