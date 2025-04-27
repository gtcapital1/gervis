ALTER TABLE "mifid" ALTER COLUMN "annual_income" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "mifid" ALTER COLUMN "monthly_expenses" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "mifid" ALTER COLUMN "debts" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "mifid" ALTER COLUMN "net_worth" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "mifid" ADD COLUMN "investment_objective" text NOT NULL;--> statement-breakpoint
ALTER TABLE "mifid" ADD COLUMN "etf_objective_question" text NOT NULL;--> statement-breakpoint
ALTER TABLE "mifid" DROP COLUMN "dependents";--> statement-breakpoint
ALTER TABLE "mifid" DROP COLUMN "assets";--> statement-breakpoint
ALTER TABLE "mifid" DROP COLUMN "investment_horizon";--> statement-breakpoint
ALTER TABLE "mifid" DROP COLUMN "retirement_interest";--> statement-breakpoint
ALTER TABLE "mifid" DROP COLUMN "wealth_growth_interest";--> statement-breakpoint
ALTER TABLE "mifid" DROP COLUMN "income_generation_interest";--> statement-breakpoint
ALTER TABLE "mifid" DROP COLUMN "capital_preservation_interest";--> statement-breakpoint
ALTER TABLE "mifid" DROP COLUMN "estate_planning_interest";--> statement-breakpoint
ALTER TABLE "mifid" DROP COLUMN "volatility_tolerance";--> statement-breakpoint
ALTER TABLE "mifid" DROP COLUMN "years_of_experience";--> statement-breakpoint
ALTER TABLE "mifid" DROP COLUMN "investment_frequency";--> statement-breakpoint
ALTER TABLE "mifid" DROP COLUMN "advisor_usage";--> statement-breakpoint
ALTER TABLE "mifid" DROP COLUMN "monitoring_time";--> statement-breakpoint
ALTER TABLE "mifid" DROP COLUMN "specific_questions";