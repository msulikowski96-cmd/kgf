CREATE TABLE "drivers" (
	"user_id" varchar PRIMARY KEY NOT NULL,
	"vehicle_model" text NOT NULL,
	"plate" text NOT NULL,
	"car_color" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"online" boolean DEFAULT false NOT NULL,
	"rating_sum" integer DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "pickup_lat" double precision;--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "pickup_lng" double precision;--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "destination_lat" double precision;--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "destination_lng" double precision;--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "distance_km" double precision;--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "duration_min" integer;--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "estimated_price" integer;--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "route" jsonb;--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "driver_id" varchar;--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "accepted_at" timestamp;--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "started_at" timestamp;--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "rating" integer;--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "rating_comment" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'customer' NOT NULL;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rides" ADD CONSTRAINT "rides_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rides_driver_id_idx" ON "rides" USING btree ("driver_id");--> statement-breakpoint
CREATE INDEX "rides_status_idx" ON "rides" USING btree ("status");