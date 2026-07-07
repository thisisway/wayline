ALTER TABLE "automations" ALTER COLUMN "trigger_status_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "automations" ADD COLUMN "trigger_type" text DEFAULT 'status' NOT NULL;