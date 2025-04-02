/**
 * Questo script crea la tabella client_logs nel database per memorizzare le interazioni con i clienti.
 */

import { db } from "../db";
import { SQL } from "drizzle-orm";
import { sql } from "drizzle-orm/sql";
import * as url from 'url';

export async function createClientLogsTable() {
  
  
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
    
    
  } catch (error) {
    
    throw error;
  }
}

// Per eseguire lo script direttamente
const isMainModule = import.meta.url === url.pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  createClientLogsTable()
    .then(() => {
      
      process.exit(0);
    })
    .catch((error) => {
      
      process.exit(1);
    });
}