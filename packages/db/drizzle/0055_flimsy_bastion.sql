CREATE TABLE IF NOT EXISTS "access_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"space_id" uuid NOT NULL,
	"name" text DEFAULT 'Acesso' NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"login" text DEFAULT '' NOT NULL,
	"secret" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "access_entries" ADD CONSTRAINT "access_entries_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "access_entries_org_idx" ON "access_entries" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "access_entries_space_idx" ON "access_entries" USING btree ("space_id");--> statement-breakpoint
ALTER TABLE "access_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "access_entries" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "access_entries_org_isolation" ON "access_entries";--> statement-breakpoint
CREATE POLICY "access_entries_org_isolation" ON "access_entries"
  USING (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "access_entries" TO wayline_app;
