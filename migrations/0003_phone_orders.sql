ALTER TABLE "rides" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "source" text DEFAULT 'app' NOT NULL;--> statement-breakpoint
CREATE INDEX "rides_contact_phone_idx" ON "rides" USING btree ("contact_phone");