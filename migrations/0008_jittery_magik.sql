CREATE TABLE "advisor_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"advisor_id" integer NOT NULL,
	"suggestions_data" jsonb NOT NULL,
	"last_generated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trend_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"advisor_id" integer NOT NULL,
	"type" text NOT NULL,
	"date" timestamp NOT NULL,
	"value" integer,
	"value_float" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "active" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "smtp_host" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "smtp_port" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "smtp_user" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "smtp_pass" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "smtp_from" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "custom_email_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "advisor_suggestions" ADD CONSTRAINT "advisor_suggestions_advisor_id_users_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_data" ADD CONSTRAINT "trend_data_advisor_id_users_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;