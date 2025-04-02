/**
 * Fix per errori di eliminazione dei clienti su AWS.
 * Questo script identifica e risolve problemi comuni che possono impedire 
 * l'eliminazione dei clienti nell'ambiente AWS.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config();

async function fixAwsDeleteError() {
  
  
  if (!process.env.DATABASE_URL) {
    
    return;
  }
  
  // Connessione al database
  
  const migrationClient = postgres(process.env.DATABASE_URL);
  
  try {
    
    
    // 1. Verifica e assegna permessi DELETE nelle tabelle principali
    const tables = ["clients", "assets", "recommendations"];
    
    for (const table of tables) {
      try {
        
        
        // Per neondb e altri servizi gestiti, l'utente potrebbe essere neondb_owner
        await migrationClient.unsafe(`
          GRANT DELETE ON ${table} TO neondb_owner;
          GRANT DELETE ON ${table} TO CURRENT_USER;
        `);
        
        
      } catch (error) {
        
      }
    }
    
    // 2. Verifica se i vincoli CASCADE sono configurati correttamente
    
    
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
    
    
    
    
    const needsAssetFix = !assetDeleteRule || assetDeleteRule !== 'c';
    const needsRecommendationFix = !recommendationsDeleteRule || recommendationsDeleteRule !== 'c';
    
    // Se necessario, ricrea i vincoli con CASCADE
    if (needsAssetFix) {
      
      
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
        
        
      } catch (error) {
        
      }
    }
    
    if (needsRecommendationFix) {
      
      
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
        
        
      } catch (error) {
        
      }
    }
    
    // 3. Verifica finale dei vincoli
    const finalAssetConstraint = await migrationClient`
      SELECT confdeltype FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conname = 'assets_client_id_fkey'
      AND n.nspname = 'public'
    `;
    
    const finalRecommendationsConstraint = await migrationClient`
      SELECT confdeltype FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conname = 'recommendations_client_id_fkey'
      AND n.nspname = 'public'
    `;
    
    
      Stato finale dei vincoli:
      - assets_client_id_fkey: ${finalAssetConstraint[0]?.confdeltype === 'c' ? 'CASCADE configurato' : 'NON configurato correttamente'}
      - recommendations_client_id_fkey: ${finalRecommendationsConstraint[0]?.confdeltype === 'c' ? 'CASCADE configurato' : 'NON configurato correttamente'}
    `);
    
    
  } catch (error) {
    
  } finally {
    // Chiudi la connessione al DB
    await migrationClient.end();
    
  }
}

// Esecuzione della funzione principale
fixAwsDeleteError()
  .then(() => {
    
    process.exit(0);
  })
  .catch(error => {
    
    process.exit(1);
  });