ALTER TABLE "tasks" ADD COLUMN "approval_status" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "approval_by" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "approval_at" timestamp with time zone;