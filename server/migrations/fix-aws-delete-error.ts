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
  console.log("Avvio fix per problema di eliminazione client su AWS...");
  
  if (!process.env.DATABASE_URL) {
    console.error("Errore: DATABASE_URL non trovato nelle variabili d'ambiente");
    return;
  }
  
  // Connessione al database
  console.log("Connessione al database...");
  const migrationClient = postgres(process.env.DATABASE_URL);
  
  try {
    console.log("Verifica permessi DELETE sul database...");
    
    // 1. Verifica e assegna permessi DELETE nelle tabelle principali
    const tables = ["clients", "assets", "recommendations"];
    
    for (const table of tables) {
      try {
        console.log(`Assegnazione permessi DELETE sulla tabella ${table}...`);
        
        // Per neondb e altri servizi gestiti, l'utente potrebbe essere neondb_owner
        await migrationClient.unsafe(`
          GRANT DELETE ON ${table} TO neondb_owner;
          GRANT DELETE ON ${table} TO CURRENT_USER;
        `);
        
        console.log(`Permessi DELETE assegnati con successo per la tabella ${table}`);
      } catch (error) {
        console.log(`Avviso: Impossibile assegnare permessi alla tabella ${table}. Potrebbe essere già configurato o causato da restrizioni dei privilegi.`);
      }
    }
    
    // 2. Verifica se i vincoli CASCADE sono configurati correttamente
    console.log("Verifica vincoli CASCADE sulle tabelle di relazione...");
    
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
    
    console.log(`Stato attuale dei vincoli - assets: ${assetDeleteRule}, recommendations: ${recommendationsDeleteRule}`);
    console.log("Nota: 'c' indica CASCADE, 'a' indica NO ACTION, 'r' indica RESTRICT");
    
    const needsAssetFix = !assetDeleteRule || assetDeleteRule !== 'c';
    const needsRecommendationFix = !recommendationsDeleteRule || recommendationsDeleteRule !== 'c';
    
    // Se necessario, ricrea i vincoli con CASCADE
    if (needsAssetFix) {
      console.log("Ricreazione vincolo assets_client_id_fkey con CASCADE DELETE...");
      
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
        
        console.log("Vincolo assets_client_id_fkey ricreato con successo");
      } catch (error) {
        console.error("Errore durante la ricreazione del vincolo assets_client_id_fkey:", error);
      }
    }
    
    if (needsRecommendationFix) {
      console.log("Ricreazione vincolo recommendations_client_id_fkey con CASCADE DELETE...");
      
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
        
        console.log("Vincolo recommendations_client_id_fkey ricreato con successo");
      } catch (error) {
        console.error("Errore durante la ricreazione del vincolo recommendations_client_id_fkey:", error);
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
    
    console.log(`
      Stato finale dei vincoli:
      - assets_client_id_fkey: ${finalAssetConstraint[0]?.confdeltype === 'c' ? 'CASCADE configurato' : 'NON configurato correttamente'}
      - recommendations_client_id_fkey: ${finalRecommendationsConstraint[0]?.confdeltype === 'c' ? 'CASCADE configurato' : 'NON configurato correttamente'}
    `);
    
    console.log("Fix completato. L'eliminazione dei clienti dovrebbe ora funzionare correttamente.");
  } catch (error) {
    console.error("Errore durante l'esecuzione del fix:", error);
  } finally {
    // Chiudi la connessione al DB
    await migrationClient.end();
    console.log("Connessione al database chiusa");
  }
}

// Esecuzione della funzione principale
fixAwsDeleteError()
  .then(() => {
    console.log("Script completato");
    process.exit(0);
  })
  .catch(error => {
    console.error("Errore fatale:", error);
    process.exit(1);
  });