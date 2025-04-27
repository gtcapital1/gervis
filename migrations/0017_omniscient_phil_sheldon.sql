ALTER TABLE "model_portfolios" ALTER COLUMN "entry_cost" SET DATA TYPE numeric(10, 5);--> statement-breakpoint
ALTER TABLE "model_portfolios" ALTER COLUMN "entry_cost" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "model_portfolios" ALTER COLUMN "exit_cost" SET DATA TYPE numeric(10, 5);--> statement-breakpoint
ALTER TABLE "model_portfolios" ALTER COLUMN "exit_cost" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "model_portfolios" ALTER COLUMN "ongoing_cost" SET DATA TYPE numeric(10, 5);--> statement-breakpoint
ALTER TABLE "model_portfolios" ALTER COLUMN "ongoing_cost" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "model_portfolios" ALTER COLUMN "transaction_cost" SET DATA TYPE numeric(10, 5);--> statement-breakpoint
ALTER TABLE "model_portfolios" ALTER COLUMN "transaction_cost" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "model_portfolios" ALTER COLUMN "performance_fee" SET DATA TYPE numeric(10, 5);--> statement-breakpoint
ALTER TABLE "model_portfolios" ALTER COLUMN "performance_fee" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "model_portfolios" ALTER COLUMN "total_annual_cost" SET DATA TYPE numeric(10, 5);--> statement-breakpoint
ALTER TABLE "model_portfolios" ALTER COLUMN "total_annual_cost" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "model_portfolios" ALTER COLUMN "average_risk" SET DATA TYPE numeric(10, 5);--> statement-breakpoint
ALTER TABLE "model_portfolios" ALTER COLUMN "average_time_horizon" SET DATA TYPE numeric(10, 5);--> statement-breakpoint
ALTER TABLE "portfolio_allocations" ALTER COLUMN "percentage" SET DATA TYPE numeric(10, 5);