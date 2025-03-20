/**
 * Questo script aggiunge vincoli CASCADE DELETE alle tabelle di assets e recommendations
 * per garantire che l'eliminazione di un cliente rimuova automaticamente tutte le entità correlate.
 * 
 * Senza questi vincoli, l'eliminazione di un cliente fallisce a causa di vincoli di integrità referenziale.
 */

import postgres from 'postgres';
import dotenv from 'dotenv';

// Carica le variabili d'ambiente
dotenv.config();

async function fixCascadeConstraints() {
  console.log('Inizio migrazione per aggiungere CASCADE DELETE');
  
  // Verifica che DATABASE_URL sia definito
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL non è definito nelle variabili d\'ambiente');
    process.exit(1);
  }
  
  // Crea una connessione al database
  const sql = postgres(dbUrl, { 
    prepare: false,
    debug: true,
    // Impostiamo un timeout più lungo per le operazioni
    connect_timeout: 20, 
    idle_timeout: 20
  });
  
  try {
    console.log('Connessione al database stabilita');
    
    // Verifichiamo se esistono i vincoli e quale tipo di regola hanno
    const constraintCheck = await sql`
      SELECT 
        EXISTS (
          SELECT FROM information_schema.table_constraints 
          WHERE constraint_name = 'assets_client_id_fkey' 
          AND constraint_type = 'FOREIGN KEY'
        ) AS assets_constraint_exists,
        EXISTS (
          SELECT FROM information_schema.table_constraints 
          WHERE constraint_name = 'recommendations_client_id_fkey' 
          AND constraint_type = 'FOREIGN KEY'
        ) AS recommendations_constraint_exists,
        (SELECT confdeltype FROM pg_constraint c
         JOIN pg_namespace n ON n.oid = c.connamespace
         WHERE conname = 'assets_client_id_fkey'
         AND n.nspname = 'public') as assets_delete_rule,
        (SELECT confdeltype FROM pg_constraint c
         JOIN pg_namespace n ON n.oid = c.connamespace
         WHERE conname = 'recommendations_client_id_fkey'
         AND n.nspname = 'public') as recommendations_delete_rule;
    `;
    
    const assetsConstraintExists = constraintCheck[0]?.assets_constraint_exists || false;
    const recommendationsConstraintExists = constraintCheck[0]?.recommendations_constraint_exists || false;
    const assetsDeleteRule = constraintCheck[0]?.assets_delete_rule;
    const recommendationsDeleteRule = constraintCheck[0]?.recommendations_delete_rule;
    
    console.log(`Vincolo assets: ${assetsConstraintExists ? 'Esiste' : 'Non esiste'}, Regola: ${assetsDeleteRule || 'N/A'}`);
    console.log(`Vincolo recommendations: ${recommendationsConstraintExists ? 'Esiste' : 'Non esiste'}, Regola: ${recommendationsDeleteRule || 'N/A'}`);
    
    // 'c' rappresenta CASCADE, 'a' rappresenta NO ACTION, 'r' rappresenta RESTRICT
    const needsAssetsUpdate = !assetsConstraintExists || assetsDeleteRule !== 'c';
    const needsRecommendationsUpdate = !recommendationsConstraintExists || recommendationsDeleteRule !== 'c';
    
    if (!needsAssetsUpdate && !needsRecommendationsUpdate) {
      console.log('Vincoli CASCADE già correttamente configurati, nessuna modifica necessaria');
      await sql.end();
      return;
    }
    
    console.log('Avvio transazione per modificare i vincoli...');
    await sql`BEGIN`;
    
    // Aggiorna i vincoli di assets se necessario
    if (needsAssetsUpdate) {
      console.log('Aggiornamento vincolo assets...');
      
      // Se il vincolo esiste già, lo eliminiamo prima
      if (assetsConstraintExists) {
        console.log('Eliminazione vincolo assets esistente...');
        await sql`ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_client_id_fkey`;
      }
      
      // Aggiungiamo il vincolo con CASCADE DELETE
      console.log('Creazione nuovo vincolo assets con CASCADE DELETE...');
      await sql`ALTER TABLE assets 
                ADD CONSTRAINT assets_client_id_fkey 
                FOREIGN KEY (client_id) 
                REFERENCES clients(id) 
                ON DELETE CASCADE`;
      
      console.log('Vincolo assets aggiornato con successo');
    }
    
    // Aggiorna i vincoli di recommendations se necessario
    if (needsRecommendationsUpdate) {
      console.log('Aggiornamento vincolo recommendations...');
      
      // Se il vincolo esiste già, lo eliminiamo prima
      if (recommendationsConstraintExists) {
        console.log('Eliminazione vincolo recommendations esistente...');
        await sql`ALTER TABLE recommendations DROP CONSTRAINT IF EXISTS recommendations_client_id_fkey`;
      }
      
      // Aggiungiamo il vincolo con CASCADE DELETE
      console.log('Creazione nuovo vincolo recommendations con CASCADE DELETE...');
      await sql`ALTER TABLE recommendations 
                ADD CONSTRAINT recommendations_client_id_fkey 
                FOREIGN KEY (client_id) 
                REFERENCES clients(id) 
                ON DELETE CASCADE`;
      
      console.log('Vincolo recommendations aggiornato con successo');
    }
    
    // Commit delle modifiche
    console.log('Commit delle modifiche...');
    await sql`COMMIT`;
    console.log('Migrazione completata con successo');
    
  } catch (error) {
    console.error('Errore durante la migrazione:', error);
    
    // Rollback in caso di errore
    try {
      console.log('Esecuzione rollback...');
      await sql`ROLLBACK`;
    } catch (rollbackError) {
      console.error('Errore durante il rollback:', rollbackError);
    }
    
    throw error;
  } finally {
    // Chiudiamo sempre la connessione
    await sql.end();
    console.log('Connessione al database chiusa');
  }
}

// Esegui la migrazione immediatamente senza controllo del modulo
fixCascadeConstraints()
  .then(() => {
    console.log('Script completato con successo');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script fallito con errore:', error);
    process.exit(1);
  });

export default fixCascadeConstraints;