/**
 * Script di migrazione per aggiornare la struttura della tabella ai_profiles
 * Allinea la struttura del database con il nuovo formato raccomandazioni di Sigmund
 */

import { db } from '../db.js';
import { sql } from 'drizzle-orm';

export async function updateAiProfilesStructure() {
  
  
  try {
    // Verifica e svuota la tabella ai_profiles
    await db.execute(sql`TRUNCATE TABLE ai_profiles CASCADE`);
    
    
    // Aggiorna il commento sul campo profileData
    await db.execute(sql`
      COMMENT ON COLUMN ai_profiles.profile_data IS 'Dati del profilo in formato JSON (raccomandazioni unificate)'
    `);
    
    
    // Crea un indice per il campo clientId
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_ai_profiles_client_id ON ai_profiles (client_id)
    `);
    
    
    
  } catch (error) {
    
    throw error;
  }
}

// Esposizione della funzione esportata in formato ES Module
// Questo file non supporta l'esecuzione diretta ed è solo importato dal server