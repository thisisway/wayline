CREATE TABLE "custom_field_defs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"list_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_field_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"field_id" uuid NOT NULL,
	"value" text
);
--> statement-breakpoint
ALTER TABLE "custom_field_defs" ADD CONSTRAINT "custom_field_defs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_defs" ADD CONSTRAINT "custom_field_defs_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_field_id_custom_field_defs_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."custom_field_defs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cfd_list_idx" ON "custom_field_defs" USING btree ("list_id");--> statement-breakpoint
CREATE INDEX "cfd_org_idx" ON "custom_field_defs" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cfv_task_field_unique" ON "custom_field_values" USING btree ("task_id","field_id");--> statement-breakpoint
CREATE INDEX "cfv_task_idx" ON "custom_field_values" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "cfv_org_idx" ON "custom_field_values" USING btree ("org_id");--> statement-breakpoint

-- RLS por org_id (com NULLIF)
ALTER TABLE "custom_field_defs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "custom_field_defs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "custom_field_defs_org_isolation" ON "custom_field_defs"
  USING (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint
ALTER TABLE "custom_field_values" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "custom_field_values" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "custom_field_values_org_isolation" ON "custom_field_values"
  USING (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "custom_field_defs" TO wayline_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "custom_field_values" TO wayline_app;