CREATE TABLE "automations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"list_id" uuid NOT NULL,
	"trigger_status_id" uuid NOT NULL,
	"action_type" text NOT NULL,
	"action_value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "automations" ADD CONSTRAINT "automations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automations" ADD CONSTRAINT "automations_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automations" ADD CONSTRAINT "automations_trigger_status_id_statuses_id_fk" FOREIGN KEY ("trigger_status_id") REFERENCES "public"."statuses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "automations_status_idx" ON "automations" USING btree ("trigger_status_id");--> statement-breakpoint
CREATE INDEX "automations_list_idx" ON "automations" USING btree ("list_id");--> statement-breakpoint
CREATE INDEX "automations_org_idx" ON "automations" USING btree ("org_id");--> statement-breakpoint

-- RLS por org_id (com NULLIF)
ALTER TABLE "automations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "automations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "automations_org_isolation" ON "automations"
  USING (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "automations" TO wayline_app;