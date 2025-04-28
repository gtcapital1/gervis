import { drizzle } from "drizzle-orm/postgres-js.js";
import postgres from "postgres.js";
import * as schema from "./schema.js";
import dotenv from "dotenv.js";
import path from "path.js";

// Carica le variabili d'ambiente dal file .env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const client = postgres(process.env.DATABASE_URL);
export const db = drizzle(client, { schema }); 