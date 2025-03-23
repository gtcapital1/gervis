/**
 * Script di migrazione per aggiornare la struttura della tabella ai_profiles
 * Allinea la struttura del database con il nuovo formato raccomandazioni di Sigmund
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

export async function updateAiProfilesStructure() {
  console.log("Inizia aggiornamento struttura ai_profiles...");
  
  try {
    // Verifica e svuota la tabella ai_profiles
    await db.execute(sql`TRUNCATE TABLE ai_profiles CASCADE`);
    console.log("Tabella ai_profiles svuotata con successo");
    
    // Aggiorna il commento sul campo profileData
    await db.execute(sql`
      COMMENT ON COLUMN ai_profiles.profile_data IS 'Dati del profilo in formato JSON (raccomandazioni unificate)'
    `);
    console.log("Commento campo profile_data aggiornato");
    
    // Crea un indice per il campo clientId
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_ai_profiles_client_id ON ai_profiles (client_id)
    `);
    console.log("Indice idx_ai_profiles_client_id creato (se non esisteva)");
    
    console.log("Aggiornamento struttura ai_profiles completato con successo");
  } catch (error) {
    console.error("Errore durante l'aggiornamento della struttura ai_profiles:", error);
    throw error;
  }
}

// Se eseguito direttamente
if (require.main === module) {
  updateAiProfilesStructure()
    .then(() => {
      console.log("Script completato con successo");
      process.exit(0);
    })
    .catch(error => {
      console.error("Errore durante l'esecuzione dello script:", error);
      process.exit(1);
    });
}