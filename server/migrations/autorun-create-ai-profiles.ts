/**
 * Script di migrazione automatica che viene eseguito all'avvio dell'applicazione
 * per garantire che la tabella ai_profiles esista.
 * Questo script viene eseguito all'avvio in modalità silenziosa.
 */

import { db } from "../db.js";
import { sql } from "drizzle-orm.js";

export async function autorunCreateAiProfiles(silent = false): Promise<void> {
  try {
    // Verifica se la tabella ai_profiles esiste
    const tableExistsResult = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_profiles'
      );
    `);
    
    const tableExists = tableExistsResult[0]?.exists || false;
    
    if (!tableExists) {
      // Crea la tabella ai_profiles
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS ai_profiles (
          id SERIAL PRIMARY KEY,
          client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
          profile_data JSONB NOT NULL,
          last_generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER REFERENCES users(id)
        );
      `);
      
      if (!silent) {
        
      }
    } else if (!silent) {
      
    }
  } catch (error) {
    
    throw error;
  }
}