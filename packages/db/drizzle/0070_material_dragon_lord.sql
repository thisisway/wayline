CREATE TABLE "proposal_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"proposal_id" uuid NOT NULL,
	"actor_id" uuid,
	"actor_name" text NOT NULL,
	"action" text NOT NULL,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "contact_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "contact_email" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "contact_phone" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "estimated_value_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "expected_close_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "lost_reason" text;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "production_list_id" uuid;--> statement-breakpoint
ALTER TABLE "proposal_activity" ADD CONSTRAINT "proposal_activity_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_activity" ADD CONSTRAINT "proposal_activity_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_activity" ADD CONSTRAINT "proposal_activity_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "proposal_activity_proposal_idx" ON "proposal_activity" USING btree ("proposal_id");--> statement-breakpoint
CREATE INDEX "proposal_activity_org_idx" ON "proposal_activity" USING btree ("org_id");--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "proposals_owner_idx" ON "proposals" USING btree ("owner_id");