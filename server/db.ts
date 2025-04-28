import postgres from "postgres.js";
import { drizzle } from "drizzle-orm/postgres-js.js";
import * as schema from "@shared/schema";

// Debug di connessione al database


// Variabili per connection string con minime informazioni di debug
let connectionString: string | undefined;
try {
  connectionString = process.env.DATABASE_URL;
  if (connectionString) {
    const redactedUrl = connectionString.includes('@') ? 
      connectionString.substring(0, connectionString.indexOf('@')) + '@[REDACTED]' : 
      '[CONNESSIONE DB PARAMETRI]';
    
  } else {
    
  }
} catch (err) {
  
}

// Create a postgres connection
const client = postgres(connectionString!, { 
  prepare: false,
  debug: false, // Disabilitato il debug
});

// Drizzle instance
export const db = drizzle(client, { schema });

// Export for direct SQL queries if needed
export { client as sql };

// Esegui un test semplice di connessione

try {
  client`SELECT 1 as test`.then(result => {
    
  }).catch(err => {
    
  });
  
} catch (err) {
  
}