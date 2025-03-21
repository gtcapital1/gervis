/**
 * Questo script crea la tabella client_logs nel database per memorizzare le interazioni con i clienti.
 */

import { db } from "../db";
import { SQL } from "drizzle-orm";
import { sql } from "drizzle-orm/sql";

export async function createClientLogsTable() {
  console.log("Creazione tabella client_logs...");
  
  try {
    // Verifica se la tabella client_logs esiste già
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'client_logs'
      );
    `);
    
    const exists = tableExists[0].exists;
    
    if (exists) {
      console.log("La tabella client_logs esiste già.");
      return;
    }
    
    // Crea la tabella client_logs
    await db.execute(sql`
      CREATE TABLE client_logs (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        email_subject TEXT,
        email_recipients TEXT,
        log_date TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(id)
      );
    `);
    
    console.log("Tabella client_logs creata con successo.");
  } catch (error) {
    console.error("Errore durante la creazione della tabella client_logs:", error);
    throw error;
  }
}

// Per eseguire lo script direttamente
if (require.main === module) {
  createClientLogsTable()
    .then(() => {
      console.log("Migrazione completata.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Errore durante la migrazione:", error);
      process.exit(1);
    });
}