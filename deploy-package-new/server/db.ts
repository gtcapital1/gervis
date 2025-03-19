import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@shared/schema";

// Debug di connessione al database
console.log("DEBUG - Database initialization");

// Variabili per connection string con minime informazioni di debug
let connectionString: string | undefined;
try {
  connectionString = process.env.DATABASE_URL;
  if (connectionString) {
    const redactedUrl = connectionString.includes('@') ? 
      connectionString.substring(0, connectionString.indexOf('@')) + '@[REDACTED]' : 
      '[CONNESSIONE DB PARAMETRI]';
    console.log("DEBUG - URL DB trovato:", redactedUrl);
  } else {
    console.error("ERRORE CRITICO: DATABASE_URL non è definito nell'ambiente!");
  }
} catch (err) {
  console.error("Errore durante il recupero del DATABASE_URL:", err);
}

// Create a postgres connection
const client = postgres(connectionString!, { 
  prepare: false,
  debug: process.env.DEBUG_DB === 'true'
});

// Drizzle instance
export const db = drizzle(client, { schema });

// Export for direct SQL queries if needed
export { client as sql };

// Esegui un test semplice di connessione
console.log("DEBUG - Tentativo di connessione al database...");
try {
  client`SELECT 1 as test`.then(result => {
    console.log("DEBUG - Test di connessione al database riuscito:", result);
  }).catch(err => {
    console.error("ERRORE - Test di connessione al database fallito:", err);
  });
  console.log("DEBUG - Database configurato correttamente");
} catch (err) {
  console.error("ERRORE durante il test di connessione al database:", err);
}