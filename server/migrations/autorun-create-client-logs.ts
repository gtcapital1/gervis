/**
 * Script di migrazione automatica che viene eseguito all'avvio dell'applicazione
 * per garantire che la tabella client_logs esista.
 * Questo script viene eseguito all'avvio in modalità silenziosa.
 */

import { db } from "../db.js";
import { sql } from "drizzle-orm/sql.js";

export async function autorunCreateClientLogs(silent = false) {
  if (!silent) {
    console.log("Verifying client_logs table existence...");
  }
  
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
      if (!silent) {
        console.log("client_logs table already exists.");
      }
      return;
    }
    
    if (!silent) {
      console.log("Creating client_logs table...");
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
    
    if (!silent) {
      console.log("client_logs table created successfully.");
    }
    return true;
  } catch (error) {
    if (!silent) {
      console.error("Errore durante la creazione della tabella client_logs:", error);
    }
    return false;
  }
}