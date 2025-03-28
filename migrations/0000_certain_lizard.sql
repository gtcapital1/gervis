CREATE TABLE "ai_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer,
	"profile_data" jsonb NOT NULL,
	"last_generated_at" timestamp DEFAULT now(),
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer,
	"category" text NOT NULL,
	"value" integer NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"email_subject" text,
	"email_recipients" text,
	"log_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"address" text,
	"tax_code" text,
	"password" text,
	"last_login" timestamp,
	"has_portal_access" boolean DEFAULT false,
	"is_onboarded" boolean DEFAULT false,
	"is_archived" boolean DEFAULT false,
	"risk_profile" text,
	"investment_experience" text,
	"investment_goals" text[],
	"investment_horizon" text,
	"annual_income" integer,
	"net_worth" integer,
	"monthly_expenses" integer,
	"dependents" integer,
	"employment_status" text,
	"personal_interests" text[],
	"personal_interests_notes" text,
	"retirement_interest" integer,
	"wealth_growth_interest" integer,
	"income_generation_interest" integer,
	"capital_preservation_interest" integer,
	"estate_planning_interest" integer,
	"onboarding_token" text,
	"token_expiry" timestamp,
	"created_at" timestamp DEFAULT now(),
	"advisor_id" integer
);
--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"actions" jsonb
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"age" integer,
	"company" text,
	"is_independent" boolean DEFAULT false,
	"password" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"phone" text,
	"signature" text,
	"company_logo" text,
	"company_info" text,
	"role" text DEFAULT 'advisor',
	"approval_status" text DEFAULT 'pending',
	"is_pro" boolean DEFAULT false,
	"pro_since" timestamp,
	"is_email_verified" boolean DEFAULT false,
	"verification_token" text,
	"verification_token_expires" timestamp,
	"verification_pin" text,
	"registration_completed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ai_profiles" ADD CONSTRAINT "ai_profiles_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_profiles" ADD CONSTRAINT "ai_profiles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_logs" ADD CONSTRAINT "client_logs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_logs" ADD CONSTRAINT "client_logs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_advisor_id_users_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;