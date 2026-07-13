CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"parent_id" uuid,
	"owner_id" uuid,
	"title" text DEFAULT 'Sem título' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"icon" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pages_org_idx" ON "pages" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "pages_parent_idx" ON "pages" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "pages_owner_idx" ON "pages" USING btree ("owner_id");--> statement-breakpoint

-- RLS por org_id (com NULLIF). A visibilidade pessoal (owner_id) é aplicada nas queries.
ALTER TABLE "pages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pages" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "pages_org_isolation" ON "pages"
  USING (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "pages" TO wayline_app;