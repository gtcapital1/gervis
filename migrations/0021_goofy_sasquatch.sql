ALTER TABLE "assets" ADD COLUMN "product_id" integer;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "isin" text;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_product_id_portfolio_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."portfolio_products"("id") ON DELETE set null ON UPDATE no action;