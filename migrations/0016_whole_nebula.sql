ALTER TABLE "model_portfolios" ADD COLUMN "construction_logic" text;--> statement-breakpoint
ALTER TABLE "model_portfolios" ADD COLUMN "entry_cost" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "model_portfolios" ADD COLUMN "exit_cost" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "model_portfolios" ADD COLUMN "ongoing_cost" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "model_portfolios" ADD COLUMN "transaction_cost" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "model_portfolios" ADD COLUMN "performance_fee" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "model_portfolios" ADD COLUMN "total_annual_cost" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "model_portfolios" ADD COLUMN "average_risk" numeric;--> statement-breakpoint
ALTER TABLE "model_portfolios" ADD COLUMN "average_time_horizon" numeric;--> statement-breakpoint
ALTER TABLE "model_portfolios" ADD COLUMN "asset_class_distribution" jsonb;--> statement-breakpoint
ALTER TABLE "user_products" ADD COLUMN "is_favorite" boolean DEFAULT false;