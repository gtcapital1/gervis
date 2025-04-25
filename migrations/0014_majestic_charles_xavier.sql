CREATE TABLE "products_public_database" (
	"isin" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"benchmark" text,
	"dividend_policy" text,
	"currency" text,
	"sri_risk" integer,
	"entry_cost" text,
	"exit_cost" text,
	"ongoing_cost" text,
	"transaction_cost" text,
	"performance_fee" text,
	"recommended_holding_period" text,
	"target_market" text,
	"kid_file_path" text,
	"kid_processed" boolean DEFAULT false,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "products_public_database" ADD CONSTRAINT "products_public_database_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;