/**
 * Script di migrazione automatica che aggiunge il campo activated_at
 * alla tabella clients per tracciare quando un cliente è diventato attivo.
 */

import { db } from "../db.js";
import { sql } from "drizzle-orm";
import { clients } from "@shared/schema";
import { eq } from "drizzle-orm/expressions";

export async function autorunAddActivatedAt(silent = false) {
  if (!silent) 
  
  try {
    // Verifica se la colonna activated_at esiste già
    const columnExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'activated_at'
      ) as "exists";
    `);
    
    // Verifica il formato dei risultati per debug
    if (!silent) 
    
    // Accesso sicuro al valore
    const exists = columnExists.length > 0 && 
      (columnExists[0]?.exists === true || columnExists[0]?.exists === 't' || columnExists[0]?.exists === 'true');
    
    if (exists) {
      if (!silent) 
      return true;
    }
    
    // Aggiungi la colonna activated_at alla tabella clients
    if (!silent) 
    await db.execute(sql`
      ALTER TABLE clients 
      ADD COLUMN activated_at TIMESTAMP;
    `);
    
    if (!silent) 
    
    // Imposta il valore iniziale per i client già attivi
    // Per i client attivi senza activatedAt, utilizziamo onboardedAt se disponibile, altrimenti createdAt
    if (!silent) 
    
    await db.execute(sql`
      UPDATE clients
      SET activated_at = CASE
        WHEN active = true AND onboarded_at IS NOT NULL THEN onboarded_at
        WHEN active = true THEN created_at
        ELSE NULL
      END
      WHERE active = true;
    `);
    
    if (!silent) 
    
    return true;
  } catch (error) {
    
    return false;
  }
} 