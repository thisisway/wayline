ALTER TABLE "proposal_items" ADD COLUMN "details" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "proposal_items" ADD COLUMN "quantity" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "proposal_items" ADD COLUMN "unit" text DEFAULT 'Unidade' NOT NULL;--> statement-breakpoint
ALTER TABLE "proposal_items" ADD COLUMN "term" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "number" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "objective" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "terms" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "bonus" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "schedule" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "discount_pct" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "payment_method" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "payment_terms" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "recurrence" text DEFAULT 'once' NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "next_steps" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "internal_notes" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "decided_by_doc" text;