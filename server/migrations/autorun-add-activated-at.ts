/**
 * Script di migrazione automatica che aggiunge il campo activated_at
 * alla tabella clients per tracciare quando un cliente è diventato attivo.
 */

import { db } from "../db";
import { sql } from "drizzle-orm";
import { clients } from "@shared/schema";
import { eq } from "drizzle-orm/expressions";

export async function autorunAddActivatedAt(silent = false) {
  if (!silent) console.log("Starting migration to add 'activated_at' column to clients table");
  
  try {
    // Verifica se la colonna activated_at esiste già
    const columnExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'activated_at'
      ) as "exists";
    `);
    
    // Verifica il formato dei risultati per debug
    if (!silent) console.log("Column exists check result:", columnExists);
    
    // Accesso sicuro al valore
    const exists = columnExists.length > 0 && 
      (columnExists[0]?.exists === true || columnExists[0]?.exists === 't' || columnExists[0]?.exists === 'true');
    
    if (exists) {
      if (!silent) console.log("Column 'activated_at' already exists");
      return true;
    }
    
    // Aggiungi la colonna activated_at alla tabella clients
    if (!silent) console.log("Adding 'activated_at' column to clients table");
    await db.execute(sql`
      ALTER TABLE clients 
      ADD COLUMN activated_at TIMESTAMP;
    `);
    
    if (!silent) console.log("Column 'activated_at' added to clients table");
    
    // Imposta il valore iniziale per i client già attivi
    // Per i client attivi senza activatedAt, utilizziamo onboardedAt se disponibile, altrimenti createdAt
    if (!silent) console.log("Setting initial values for activated_at for existing active clients");
    
    await db.execute(sql`
      UPDATE clients
      SET activated_at = CASE
        WHEN active = true AND onboarded_at IS NOT NULL THEN onboarded_at
        WHEN active = true THEN created_at
        ELSE NULL
      END
      WHERE active = true;
    `);
    
    if (!silent) console.log("Initial values for activated_at set successfully");
    
    return true;
  } catch (error) {
    console.error(`Error during migration:`, error);
    return false;
  }
} 