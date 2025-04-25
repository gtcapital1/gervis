CREATE TABLE "user_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"product_id" integer,
	"added_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "portfolio_products" ADD COLUMN "available_to_everyone" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user_products" ADD CONSTRAINT "user_products_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_products" ADD CONSTRAINT "user_products_product_id_portfolio_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."portfolio_products"("id") ON DELETE cascade ON UPDATE no action;