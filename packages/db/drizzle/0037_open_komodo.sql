CREATE TABLE "portfolio_items" (
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
--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "portfolio_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "portfolio_org_idx" ON "portfolio_items" USING btree ("org_id");--> statement-breakpoint

-- Sem RLS (aparece no link público; org_id filtrado no app). Grant ao role da app.
GRANT SELECT, INSERT, UPDATE, DELETE ON "portfolio_items" TO wayline_app;
