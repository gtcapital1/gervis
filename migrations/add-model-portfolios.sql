-- Create table for portfolio products (ISIN)
CREATE TABLE IF NOT EXISTS "portfolio_products" (
  "id" serial PRIMARY KEY NOT NULL,
  "isin" text NOT NULL,
  "name" text NOT NULL,
  "category" text NOT NULL,
  "description" text,
  "benchmark" text,
  "dividend_policy" text,
  "currency" text,
  "sri_risk" integer,
  "entry_cost" numeric DEFAULT 0,
  "exit_cost" numeric DEFAULT 0,
  "ongoing_cost" numeric DEFAULT 0,
  "transaction_cost" numeric DEFAULT 0,
  "performance_fee" numeric DEFAULT 0,
  "recommended_holding_period" text,
  "target_market" text,
  "kid_file_path" text,
  "kid_processed" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now(),
  "created_by" integer REFERENCES "users"("id")
);

-- Create table for model portfolios
CREATE TABLE IF NOT EXISTS "model_portfolios" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "client_profile" text NOT NULL,
  "risk_level" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "created_by" integer REFERENCES "users"("id")
);

-- Create table for portfolio allocations
CREATE TABLE IF NOT EXISTS "portfolio_allocations" (
  "id" serial PRIMARY KEY NOT NULL,
  "portfolio_id" integer NOT NULL REFERENCES "model_portfolios"("id") ON DELETE CASCADE,
  "product_id" integer NOT NULL REFERENCES "portfolio_products"("id") ON DELETE CASCADE,
  "percentage" numeric NOT NULL,
  "created_at" timestamp DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS "portfolio_allocations_portfolio_id_idx" ON "portfolio_allocations"("portfolio_id");
CREATE INDEX IF NOT EXISTS "portfolio_allocations_product_id_idx" ON "portfolio_allocations"("product_id");
CREATE UNIQUE INDEX IF NOT EXISTS "portfolio_products_isin_idx" ON "portfolio_products"("isin"); 