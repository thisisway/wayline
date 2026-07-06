CREATE TABLE "board_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"list_id" uuid NOT NULL,
	"token" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	CONSTRAINT "board_shares_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "board_shares" ADD CONSTRAINT "board_shares_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_shares" ADD CONSTRAINT "board_shares_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_shares" ADD CONSTRAINT "board_shares_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "board_shares_list_idx" ON "board_shares" USING btree ("list_id");--> statement-breakpoint
CREATE INDEX "board_shares_org_idx" ON "board_shares" USING btree ("org_id");--> statement-breakpoint

-- Sem RLS de propósito (como invitations): a busca por token ocorre sem sessão.
-- O token é o segredo; getActive/create/revoke filtram por org_id + assertMember.
GRANT SELECT, INSERT, UPDATE, DELETE ON "board_shares" TO wayline_app;