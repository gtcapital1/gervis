ALTER TABLE "portfolio_products" ADD COLUMN "benchmark" text;--> statement-breakpoint
ALTER TABLE "portfolio_products" ADD COLUMN "dividend_policy" text;--> statement-breakpoint
ALTER TABLE "portfolio_products" ADD COLUMN "currency" text;--> statement-breakpoint
ALTER TABLE "portfolio_products" ADD COLUMN "sri_risk" integer;--> statement-breakpoint
ALTER TABLE "portfolio_products" ADD COLUMN "transaction_cost" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "portfolio_products" ADD COLUMN "performance_fee" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "portfolio_products" ADD COLUMN "recommended_holding_period" text;--> statement-breakpoint
ALTER TABLE "portfolio_products" ADD COLUMN "target_market" text;--> statement-breakpoint
ALTER TABLE "portfolio_products" ADD COLUMN "kid_file_path" text;--> statement-breakpoint
ALTER TABLE "portfolio_products" ADD COLUMN "kid_processed" boolean DEFAULT false;