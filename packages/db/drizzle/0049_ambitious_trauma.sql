ALTER TABLE "invoices" ADD COLUMN "recurrence" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "next_issue_at" timestamp with time zone;