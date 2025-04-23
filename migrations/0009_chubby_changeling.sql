CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" text NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversationId" integer NOT NULL,
	"content" text NOT NULL,
	"role" varchar(50) NOT NULL,
	"createdAt" timestamp NOT NULL,
	"functionCalls" text,
	"functionResults" text
);
--> statement-breakpoint
CREATE TABLE "signature_sessions" (
	"id" varchar PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"created_by" integer NOT NULL,
	"token" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"document_url" varchar,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "signed_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer,
	"document_name" varchar(255) NOT NULL,
	"document_type" varchar(100) NOT NULL,
	"signature_date" timestamp DEFAULT now(),
	"signature_type" varchar(50) NOT NULL,
	"document_url" varchar(1000),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "verified_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer,
	"session_id" text NOT NULL,
	"id_front_url" text NOT NULL,
	"id_back_url" text NOT NULL,
	"selfie_url" text NOT NULL,
	"document_url" text,
	"verification_date" timestamp DEFAULT now(),
	"verification_status" text DEFAULT 'verified' NOT NULL,
	"token_used" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	"created_by" integer
);
--> statement-breakpoint
ALTER TABLE "trend_data" DROP CONSTRAINT "trend_data_advisor_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "trend_data" ALTER COLUMN "date" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "trend_data" ALTER COLUMN "date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "trend_data" ADD COLUMN "client_id" integer;--> statement-breakpoint
ALTER TABLE "trend_data" ADD COLUMN "portfolio_value" numeric;--> statement-breakpoint
ALTER TABLE "trend_data" ADD COLUMN "roi" numeric;--> statement-breakpoint
ALTER TABLE "trend_data" ADD COLUMN "risk" numeric;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reset_password_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reset_password_expires" timestamp;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_conversations_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_sessions" ADD CONSTRAINT "signature_sessions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_sessions" ADD CONSTRAINT "signature_sessions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signed_documents" ADD CONSTRAINT "signed_documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verified_documents" ADD CONSTRAINT "verified_documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verified_documents" ADD CONSTRAINT "verified_documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_data" ADD CONSTRAINT "trend_data_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_data" DROP COLUMN "advisor_id";--> statement-breakpoint
ALTER TABLE "trend_data" DROP COLUMN "type";--> statement-breakpoint
ALTER TABLE "trend_data" DROP COLUMN "value";--> statement-breakpoint
ALTER TABLE "trend_data" DROP COLUMN "value_float";--> statement-breakpoint
ALTER TABLE "trend_data" DROP COLUMN "metadata";--> statement-breakpoint
ALTER TABLE "trend_data" DROP COLUMN "created_at";