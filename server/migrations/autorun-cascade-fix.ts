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
    
  }
  
  if (!process.env.DATABASE_URL) {
    if (!silent) {
      
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
      
      
    }
    
    const needsAssetFix = !assetDeleteRule || assetDeleteRule !== 'c';
    const needsRecommendationFix = !recommendationsDeleteRule || recommendationsDeleteRule !== 'c';
    
    // Se necessario, ricrea i vincoli con CASCADE
    if (needsAssetFix) {
      if (!silent) {
        
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
          
        }
      } catch (error) {
        if (!silent) {
          
        }
      }
    }
    
    if (needsRecommendationFix) {
      if (!silent) {
        
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
          
        }
      } catch (error) {
        if (!silent) {
          
        }
      }
    }
    
    // Verifica permessi DELETE sulle tabelle
    try {
      if (!silent) {
        
      }
      
      await migrationClient.unsafe(`
        GRANT DELETE ON clients, assets, recommendations TO CURRENT_USER;
      `);
      
      if (!silent) {
        
      }
    } catch (error) {
      if (!silent) {
        
      }
    }
    
    if (!silent) {
      
    }
    return true;
  } catch (error) {
    if (!silent) {
      
    }
    return false;
  } finally {
    // Chiudi la connessione al DB
    await migrationClient.end();
    if (!silent) {
      
    }
  }
}