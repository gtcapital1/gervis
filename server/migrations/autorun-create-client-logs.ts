/**
 * Script di migrazione automatica che viene eseguito all'avvio dell'applicazione
 * per garantire che la tabella client_logs esista.
 * Questo script viene eseguito all'avvio in modalità silenziosa.
 */

import { db } from "../db";
import { sql } from "drizzle-orm/sql";

export async function autorunCreateClientLogs(silent = false) {
  if (!silent) console.log("Verifica tabella client_logs...");
  
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
      if (!silent) console.log("La tabella client_logs esiste già.");
      return;
    }
    
    if (!silent) console.log("Creazione tabella client_logs...");
    
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
    
    if (!silent) console.log("Tabella client_logs creata con successo.");
  } catch (error) {
    console.error("Errore durante la verifica/creazione della tabella client_logs:", error);
    throw error;
  }
}