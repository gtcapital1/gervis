import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";

// Definizione degli stati di approvazione
export const APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;
export type ApprovalStatus = typeof APPROVAL_STATUSES[number];

// Definizione dei segmenti di clienti
export const CLIENT_SEGMENTS = ["mass_market", "affluent", "hnw", "vhnw", "uhnw"] as const;
export type ClientSegment = typeof CLIENT_SEGMENTS[number];

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  company: text("company"),
  isIndependent: boolean("is_independent").default(false),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  name: text("name"),
  phone: text("phone"),
  signature: text("signature"),
  companyLogo: text("company_logo"), // Campo per il logo aziendale
  companyInfo: text("company_info"), // Campo per le informazioni societarie aggiuntive
  role: text("role").default("advisor"),
  approvalStatus: text("approval_status").default("pending"), // Stato di approvazione: pending, approved, rejected
  isPro: boolean("is_pro").default(false),
  proSince: timestamp("pro_since"),
  isEmailVerified: boolean("is_email_verified").default(false),
  verificationToken: text("verification_token"),
  verificationTokenExpires: timestamp("verification_token_expires"),
  verificationPin: text("verification_pin"), // PIN a 4 cifre per la verifica
  registrationCompleted: boolean("registration_completed").default(false), // Flag che indica se la registrazione è stata completata
  createdAt: timestamp("created_at").defaultNow(), // Data di creazione dell'utente
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  firstName: true,
  lastName: true,
  company: true,
  isIndependent: true,
  password: true,
  email: true,
  phone: true,
  role: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Risk Profile Types
export const RISK_PROFILES = ["conservative", "moderate", "balanced", "growth", "aggressive"] as const;
export type RiskProfile = typeof RISK_PROFILES[number];

// Investment Experience Levels
export const EXPERIENCE_LEVELS = ["none", "beginner", "intermediate", "advanced", "expert"] as const;
export type ExperienceLevel = typeof EXPERIENCE_LEVELS[number];

// Investment Goals
// Lista di interessi personali che possono essere selezionati dal cliente
export const PERSONAL_INTERESTS = [
  "travel", "sports", "technology", "art", "music", "cinema", 
  "literature", "cooking", "fashion", "photography", "environment", 
  "philanthropy", "health", "education", "real_estate", "entrepreneurship", 
  "financial_markets", "politics", "science"
] as const;
export type PersonalInterest = typeof PERSONAL_INTERESTS[number];

// Gli obiettivi di investimento ora utilizzano una scala da 1 a 5
export const INVESTMENT_GOALS = ["retirement", "wealth_growth", "income_generation", "capital_preservation", "estate_planning"] as const;
export type InvestmentGoal = typeof INVESTMENT_GOALS[number];

// Investment Horizons
export const INVESTMENT_HORIZONS = ["short_term", "medium_term", "long_term"] as const;
export type InvestmentHorizon = typeof INVESTMENT_HORIZONS[number];

// Asset Categories
export const ASSET_CATEGORIES = ["real_estate", "equity", "bonds", "cash", "private_equity", "venture_capital", "cryptocurrencies", "other"] as const;
export type AssetCategory = typeof ASSET_CATEGORIES[number];

// Client Schema
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  name: text("name").notNull(), // Keep for backward compatibility
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address"),
  taxCode: text("tax_code"),
  password: text("password"), // Client portal password
  lastLogin: timestamp("last_login"),
  hasPortalAccess: boolean("has_portal_access").default(false),
  isOnboarded: boolean("is_onboarded").default(false),
  isArchived: boolean("is_archived").default(false),
  active: boolean("active").default(true), // Whether the client is active (manually managed)
  onboardedAt: timestamp("onboarded_at"), // Timestamp when client was onboarded
  activatedAt: timestamp("activated_at"), // Timestamp when client became active
  clientSegment: text("client_segment").$type<ClientSegment>(), // Segmento cliente (mass_market, affluent, hnw, vhnw, uhnw)
  riskProfile: text("risk_profile"),
  investmentExperience: text("investment_experience"),
  investmentGoals: text("investment_goals").array(),
  investmentHorizon: text("investment_horizon"),
  annualIncome: integer("annual_income"),
  netWorth: integer("net_worth"),
  monthlyExpenses: integer("monthly_expenses"),
  dependents: integer("dependents"),
  employmentStatus: text("employment_status"),
  // Nuovi campi per interessi personali e valutazione degli obiettivi di investimento
  personalInterests: text("personal_interests").array(),
  personalInterestsNotes: text("personal_interests_notes"),
  // Scala da 1 a 5 per ogni obiettivo di investimento (1 = non interessa, 5 = interessa molto)
  retirementInterest: integer("retirement_interest"),
  wealthGrowthInterest: integer("wealth_growth_interest"),
  incomeGenerationInterest: integer("income_generation_interest"),
  capitalPreservationInterest: integer("capital_preservation_interest"),
  estatePlanningInterest: integer("estate_planning_interest"),
  onboardingToken: text("onboarding_token"),
  tokenExpiry: timestamp("token_expiry"),
  createdAt: timestamp("created_at").defaultNow(),
  advisorId: integer("advisor_id").references(() => users.id, { onDelete: "cascade" }),
  totalAssets: integer("total_assets").default(0), // Nuova colonna per memorizzare la somma totale degli asset
});

export const insertClientSchema = createInsertSchema(clients).pick({
  firstName: true,
  lastName: true,
  name: true,
  email: true,
  phone: true,
  address: true,
  taxCode: true,
  isOnboarded: true,
  isArchived: true,
  active: true,
  onboardedAt: true,
  activatedAt: true,
  clientSegment: true,
  riskProfile: true,
  investmentExperience: true,
  investmentGoals: true,
  investmentHorizon: true,
  annualIncome: true,
  netWorth: true,
  monthlyExpenses: true,
  dependents: true,
  employmentStatus: true,
  personalInterests: true,
  personalInterestsNotes: true,
  retirementInterest: true,
  wealthGrowthInterest: true,
  incomeGenerationInterest: true,
  capitalPreservationInterest: true,
  estatePlanningInterest: true,
  advisorId: true,
});

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// Asset Schema
export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  value: integer("value").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAssetSchema = createInsertSchema(assets).pick({
  clientId: true,
  category: true,
  value: true,
  description: true,
});

export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assets.$inferSelect;

// Recommendations Schema
export const recommendations = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  actions: jsonb("actions"),
});

export const insertRecommendationSchema = createInsertSchema(recommendations).pick({
  clientId: true,
  content: true,
  actions: true,
});

export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Recommendation = typeof recommendations.$inferSelect;

// Tipi di log
export const LOG_TYPES = ["email", "note", "call", "meeting"] as const;
export type LogType = typeof LOG_TYPES[number];

// Client Logs Schema
export const clientLogs = pgTable("client_logs", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "cascade" }),
  type: text("type").notNull().$type<LogType>(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  emailSubject: text("email_subject"), // Per i log di tipo email
  emailRecipients: text("email_recipients"), // Per i log di tipo email
  logDate: timestamp("log_date").notNull(), // Data e ora dell'interazione
  createdAt: timestamp("created_at").defaultNow(), // Data e ora di registrazione del log
  createdBy: integer("created_by").references(() => users.id), // Utente che ha creato il log
});

export const insertClientLogSchema = createInsertSchema(clientLogs).pick({
  clientId: true,
  type: true,
  title: true,
  content: true,
  emailSubject: true,
  emailRecipients: true,
  logDate: true,
  createdBy: true,
});

export type InsertClientLog = z.infer<typeof insertClientLogSchema>;
export type ClientLog = typeof clientLogs.$inferSelect;

// AI Profiles Schema
export const aiProfiles = pgTable("ai_profiles", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "cascade" }),
  profileData: jsonb("profile_data").notNull(), // Dati del profilo in formato JSON (approfondimenti e suggerimenti)
  lastGeneratedAt: timestamp("last_generated_at").defaultNow(), // Data e ora dell'ultima generazione
  createdBy: integer("created_by").references(() => users.id), // Utente che ha generato il profilo
});

export const insertAiProfileSchema = createInsertSchema(aiProfiles).pick({
  clientId: true,
  profileData: true,
  createdBy: true,
});

export type InsertAiProfile = z.infer<typeof insertAiProfileSchema>;
export type AiProfile = typeof aiProfiles.$inferSelect;

// Meeting Schema
export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "cascade" }),
  advisorId: integer("advisor_id").references(() => users.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  title: text("title"),
  location: text("location").default("zoom"),
  dateTime: timestamp("date_time").notNull(),
  duration: integer("duration").default(60), // Durata in minuti, default 60 minuti
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMeetingSchema = createInsertSchema(meetings).pick({
  clientId: true,
  advisorId: true,
  subject: true,
  title: true,
  location: true,
  dateTime: true,
  duration: true,
  notes: true,
});

export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Meeting = typeof meetings.$inferSelect;

// Task completion table
export const completedTasks = pgTable("completed_tasks", {
  id: serial("id").primaryKey(),
  advisorId: integer("advisor_id").notNull(),
  taskId: integer("task_id").notNull(),
  completedAt: timestamp("completed_at").notNull().defaultNow()
});

export type CompletedTask = typeof completedTasks.$inferSelect;
export type InsertCompletedTask = typeof completedTasks.$inferInsert;

// MIFID Schema
export const mifid = pgTable("mifid", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  clientId: integer("client_id").notNull().references(() => clients.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),

  // Sezione 1: Dati Anagrafici e Informazioni Personali
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  birthDate: text("birth_date").notNull(),
  maritalStatus: text("marital_status").notNull(),
  employmentStatus: text("employment_status").notNull(),
  educationLevel: text("education_level").notNull(),
  annualIncome: integer("annual_income").notNull(),
  monthlyExpenses: integer("monthly_expenses").notNull(),
  debts: integer("debts").notNull(),
  dependents: integer("dependents").notNull(),

  // Sezione 2: Situazione Finanziaria Attuale
  assets: jsonb("assets").notNull().$default(() => []), // Array vuoto come default

  // Sezione 3: Obiettivi d'Investimento
  investmentHorizon: text("investment_horizon").notNull(),
  retirementInterest: integer("retirement_interest").notNull(),
  wealthGrowthInterest: integer("wealth_growth_interest").notNull(),
  incomeGenerationInterest: integer("income_generation_interest").notNull(),
  capitalPreservationInterest: integer("capital_preservation_interest").notNull(),
  estatePlanningInterest: integer("estate_planning_interest").notNull(),

  // Sezione 4: Conoscenza ed Esperienza con Strumenti Finanziari
  investmentExperience: text("investment_experience").notNull(),
  pastInvestmentExperience: jsonb("past_investment_experience").notNull(), // Array di stringhe
  financialEducation: jsonb("financial_education").notNull(), // Array di stringhe

  // Sezione 5: Tolleranza al Rischio
  riskProfile: text("risk_profile").notNull(),
  portfolioDropReaction: text("portfolio_drop_reaction").notNull(),
  volatilityTolerance: text("volatility_tolerance").notNull(),

  // Sezione 6: Esperienza e Comportamento d'Investimento
  yearsOfExperience: text("years_of_experience").notNull(),
  investmentFrequency: text("investment_frequency").notNull(),
  advisorUsage: text("advisor_usage").notNull(),
  monitoringTime: text("monitoring_time").notNull(),

  // Sezione 7: Domande Specifiche (opzionale)
  specificQuestions: text("specific_questions"),
});

// Relazione con la tabella clients
export const mifidRelations = relations(mifid, ({ one }) => ({
  client: one(clients, {
    fields: [mifid.clientId],
    references: [clients.id],
  }),
}));

// Tipo per i dati dell'onboarding
export type MifidData = typeof mifid.$inferInsert;
export type Mifid = typeof mifid.$inferSelect;