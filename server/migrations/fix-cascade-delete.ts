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
  
  
  // Verifica che DATABASE_URL sia definito
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    
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
    
    
    
    
    // 'c' rappresenta CASCADE, 'a' rappresenta NO ACTION, 'r' rappresenta RESTRICT
    const needsAssetsUpdate = !assetsConstraintExists || assetsDeleteRule !== 'c';
    const needsRecommendationsUpdate = !recommendationsConstraintExists || recommendationsDeleteRule !== 'c';
    
    if (!needsAssetsUpdate && !needsRecommendationsUpdate) {
      
      await sql.end();
      return;
    }
    
    
    await sql`BEGIN`;
    
    // Aggiorna i vincoli di assets se necessario
    if (needsAssetsUpdate) {
      
      
      // Se il vincolo esiste già, lo eliminiamo prima
      if (assetsConstraintExists) {
        
        await sql`ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_client_id_fkey`;
      }
      
      // Aggiungiamo il vincolo con CASCADE DELETE
      
      await sql`ALTER TABLE assets 
                ADD CONSTRAINT assets_client_id_fkey 
                FOREIGN KEY (client_id) 
                REFERENCES clients(id) 
                ON DELETE CASCADE`;
      
      
    }
    
    // Aggiorna i vincoli di recommendations se necessario
    if (needsRecommendationsUpdate) {
      
      
      // Se il vincolo esiste già, lo eliminiamo prima
      if (recommendationsConstraintExists) {
        
        await sql`ALTER TABLE recommendations DROP CONSTRAINT IF EXISTS recommendations_client_id_fkey`;
      }
      
      // Aggiungiamo il vincolo con CASCADE DELETE
      
      await sql`ALTER TABLE recommendations 
                ADD CONSTRAINT recommendations_client_id_fkey 
                FOREIGN KEY (client_id) 
                REFERENCES clients(id) 
                ON DELETE CASCADE`;
      
      
    }
    
    // Commit delle modifiche
    
    await sql`COMMIT`;
    
    
  } catch (error) {
    
    
    // Rollback in caso di errore
    try {
      
      await sql`ROLLBACK`;
    } catch (rollbackError) {
      
    }
    
    throw error;
  } finally {
    // Chiudiamo sempre la connessione
    await sql.end();
    
  }
}

// Esegui la migrazione immediatamente senza controllo del modulo
fixCascadeConstraints()
  .then(() => {
    
    process.exit(0);
  })
  .catch((error) => {
    
    process.exit(1);
  });

export default fixCascadeConstraints;