CREATE TABLE "client_portals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"token" text NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_portals_client_id_unique" UNIQUE("client_id"),
	CONSTRAINT "client_portals_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE INDEX "client_portals_token_idx" ON "client_portals" USING btree ("token");--> statement-breakpoint

-- Sem RLS (resolve o token sem sessão; conteúdo lido depois em withOrg). Grant ao role da app.
GRANT SELECT, INSERT, UPDATE, DELETE ON "client_portals" TO wayline_app;