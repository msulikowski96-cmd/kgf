CREATE TABLE "rides" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"pickup_address" text NOT NULL,
	"destination_address" text NOT NULL,
	"scheduled_at" timestamp,
	"vehicle_model" text NOT NULL,
	"passengers" integer DEFAULT 1 NOT NULL,
	"contact_name" text NOT NULL,
	"contact_phone" text NOT NULL,
	"notes" text,
	"payment_method" text DEFAULT 'card' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rides" ADD CONSTRAINT "rides_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rides_user_id_idx" ON "rides" USING btree ("user_id");