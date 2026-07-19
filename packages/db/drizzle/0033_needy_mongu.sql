CREATE TABLE "proposal_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"proposal_id" uuid NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposals" (
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
--> statement-breakpoint
ALTER TABLE "proposal_items" ADD CONSTRAINT "proposal_items_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_items" ADD CONSTRAINT "proposal_items_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "proposal_items_proposal_idx" ON "proposal_items" USING btree ("proposal_id");--> statement-breakpoint
CREATE INDEX "proposals_org_idx" ON "proposals" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "proposals_token_idx" ON "proposals" USING btree ("token");--> statement-breakpoint

-- Sem RLS (token é o segredo; org_id filtrado no app). Grants ao role da app.
GRANT SELECT, INSERT, UPDATE, DELETE ON "proposals" TO wayline_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "proposal_items" TO wayline_app;
