/**
 * Questo script imposta vincoli di eliminazione a cascata per le tabelle
 * assets e recommendations quando un cliente viene eliminato.
 * Risolve i problemi di eliminazione dei clienti nell'ambiente AWS.
 */
import { db } from "../db";
import { sql } from "drizzle-orm";

async function fixCascadeDelete() {
  try {
    console.log("Avvio configurazione eliminazione a cascata...");
    
    // Rimuovi vincoli esistenti
    console.log("Rimozione vincoli esistenti...");
    try {
      await db.execute(sql`
        ALTER TABLE IF EXISTS assets
        DROP CONSTRAINT IF EXISTS assets_client_id_fkey;
      `);
      
      await db.execute(sql`
        ALTER TABLE IF EXISTS recommendations
        DROP CONSTRAINT IF EXISTS recommendations_client_id_fkey;
      `);
      console.log("Vincoli esistenti rimossi con successo");
    } catch (dropError) {
      console.warn("Avviso durante la rimozione dei vincoli:", dropError);
      // Continuiamo anche se ci sono errori qui
    }
    
    // Aggiungi vincoli con CASCADE DELETE
    console.log("Aggiunta vincoli con CASCADE DELETE...");
    await db.execute(sql`
      ALTER TABLE assets
      ADD CONSTRAINT assets_client_id_fkey
      FOREIGN KEY (client_id)
      REFERENCES clients(id)
      ON DELETE CASCADE;
    `);
    
    await db.execute(sql`
      ALTER TABLE recommendations
      ADD CONSTRAINT recommendations_client_id_fkey
      FOREIGN KEY (client_id)
      REFERENCES clients(id)
      ON DELETE CASCADE;
    `);
    
    console.log("Vincoli CASCADE DELETE aggiunti con successo");
    
    // Concedi permessi DELETE sulle tabelle principali
    console.log("Impostazione permessi DELETE...");
    
    // Recupera il nome utente attuale dal database
    const userResult = await db.execute(sql`SELECT current_user AS username`);
    const username = userResult[0]?.username;
    
    if (!username) {
      throw new Error("Impossibile recuperare il nome utente corrente");
    }
    
    console.log(`Nome utente corrente: ${username}`);
    
    await db.execute(sql`GRANT DELETE ON clients TO ${sql.raw(username as string)}`);
    await db.execute(sql`GRANT DELETE ON assets TO ${sql.raw(username as string)}`);
    await db.execute(sql`GRANT DELETE ON recommendations TO ${sql.raw(username as string)}`);
    
    console.log("Permessi DELETE concessi con successo");
    
    // Verifica che le eliminazioni a cascata funzionino
    console.log("Test di eliminazione a cascata...");
    
    const testResult = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.table_constraints 
        WHERE constraint_name = 'assets_client_id_fkey' 
        AND constraint_type = 'FOREIGN KEY'
      ) AS assets_constraint_exists,
      EXISTS (
        SELECT FROM information_schema.table_constraints 
        WHERE constraint_name = 'recommendations_client_id_fkey' 
        AND constraint_type = 'FOREIGN KEY'
      ) AS recommendations_constraint_exists;
    `);
    
    console.log("Risultato test vincoli:", testResult[0]);
    
    return { 
      success: true, 
      message: "Configurazione eliminazione a cascata completata con successo",
      constraintsVerified: testResult[0]
    };
  } catch (error) {
    console.error("Errore durante la configurazione dell'eliminazione a cascata:", error);
    return { success: false, error: String(error) };
  }
}

// Esegui la funzione se lo script viene eseguito direttamente
if (require.main === module) {
  fixCascadeDelete()
    .then(result => {
      console.log(result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error("Errore:", err);
      process.exit(1);
    });
}

export { fixCascadeDelete };