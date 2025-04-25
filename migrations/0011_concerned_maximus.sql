CREATE TABLE "model_portfolios" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"client_profile" text NOT NULL,
	"risk_level" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE "portfolio_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"portfolio_id" integer,
	"product_id" integer,
	"percentage" numeric NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "portfolio_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"isin" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"entry_cost" numeric DEFAULT '0',
	"exit_cost" numeric DEFAULT '0',
	"ongoing_cost" numeric DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	"created_by" integer
);
--> statement-breakpoint
ALTER TABLE "model_portfolios" ADD CONSTRAINT "model_portfolios_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_allocations" ADD CONSTRAINT "portfolio_allocations_portfolio_id_model_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."model_portfolios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_allocations" ADD CONSTRAINT "portfolio_allocations_product_id_portfolio_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."portfolio_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_products" ADD CONSTRAINT "portfolio_products_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;