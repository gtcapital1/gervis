/**
 * Script di migrazione automatica che viene eseguito all'avvio dell'applicazione
 * per garantire che i vincoli CASCADE DELETE siano configurati correttamente.
 * Questo script viene eseguito all'avvio in modalità silenziosa.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Nota: non importiamo dotenv perché è già caricato nel file index.ts principale

export async function autorunCascadeFix(silent = false) {
  if (!silent) {
    console.log("Esecuzione fix automatico vincoli CASCADE DELETE...");
  }
  
  if (!process.env.DATABASE_URL) {
    if (!silent) {
      console.error("Errore: DATABASE_URL non trovato nelle variabili d'ambiente");
    }
    return;
  }
  
  // Connessione al database
  const migrationClient = postgres(process.env.DATABASE_URL);
  
  try {
    // Verifica se i vincoli CASCADE sono configurati correttamente
    const assetConstraint = await migrationClient`
      SELECT confdeltype FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conname = 'assets_client_id_fkey'
      AND n.nspname = 'public'
    `;
    
    const recommendationsConstraint = await migrationClient`
      SELECT confdeltype FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conname = 'recommendations_client_id_fkey'
      AND n.nspname = 'public'
    `;
    
    // Ottieni lo stato attuale dei vincoli
    const assetDeleteRule = assetConstraint[0]?.confdeltype;
    const recommendationsDeleteRule = recommendationsConstraint[0]?.confdeltype;
    
    if (!silent) {
      console.log(`Stato attuale dei vincoli - assets: ${assetDeleteRule}, recommendations: ${recommendationsDeleteRule}`);
      console.log("Nota: 'c' indica CASCADE, 'a' indica NO ACTION, 'r' indica RESTRICT");
    }
    
    const needsAssetFix = !assetDeleteRule || assetDeleteRule !== 'c';
    const needsRecommendationFix = !recommendationsDeleteRule || recommendationsDeleteRule !== 'c';
    
    // Se necessario, ricrea i vincoli con CASCADE
    if (needsAssetFix) {
      if (!silent) {
        console.log("Ricreazione vincolo assets_client_id_fkey con CASCADE DELETE...");
      }
      
      try {
        // Prima elimina il vincolo esistente
        await migrationClient.unsafe(`
          ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_client_id_fkey;
        `);
        
        // Poi ricrea con CASCADE
        await migrationClient.unsafe(`
          ALTER TABLE assets 
          ADD CONSTRAINT assets_client_id_fkey 
          FOREIGN KEY (client_id) 
          REFERENCES clients(id) 
          ON DELETE CASCADE;
        `);
        
        if (!silent) {
          console.log("Vincolo assets_client_id_fkey ricreato con successo");
        }
      } catch (error) {
        if (!silent) {
          console.error("Errore durante la ricreazione del vincolo assets_client_id_fkey:", error);
        }
      }
    }
    
    if (needsRecommendationFix) {
      if (!silent) {
        console.log("Ricreazione vincolo recommendations_client_id_fkey con CASCADE DELETE...");
      }
      
      try {
        // Prima elimina il vincolo esistente
        await migrationClient.unsafe(`
          ALTER TABLE recommendations DROP CONSTRAINT IF EXISTS recommendations_client_id_fkey;
        `);
        
        // Poi ricrea con CASCADE
        await migrationClient.unsafe(`
          ALTER TABLE recommendations 
          ADD CONSTRAINT recommendations_client_id_fkey 
          FOREIGN KEY (client_id) 
          REFERENCES clients(id) 
          ON DELETE CASCADE;
        `);
        
        if (!silent) {
          console.log("Vincolo recommendations_client_id_fkey ricreato con successo");
        }
      } catch (error) {
        if (!silent) {
          console.error("Errore durante la ricreazione del vincolo recommendations_client_id_fkey:", error);
        }
      }
    }
    
    // Verifica permessi DELETE sulle tabelle
    try {
      if (!silent) {
        console.log("Verifica permessi DELETE sul database...");
      }
      
      await migrationClient.unsafe(`
        GRANT DELETE ON clients, assets, recommendations TO CURRENT_USER;
      `);
      
      if (!silent) {
        console.log("Permessi DELETE assegnati con successo");
      }
    } catch (error) {
      if (!silent) {
        console.log("Nota: Impossibile assegnare esplicitamente i permessi DELETE. L'utente potrebbe già avere i permessi necessari.");
      }
    }
    
    if (!silent) {
      console.log("Fix automatico completato.");
    }
    return true;
  } catch (error) {
    if (!silent) {
      console.error("Errore durante l'esecuzione del fix automatico:", error);
    }
    return false;
  } finally {
    // Chiudi la connessione al DB
    await migrationClient.end();
    if (!silent) {
      console.log("Connessione al database chiusa");
    }
  }
}