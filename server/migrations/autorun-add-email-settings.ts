import { sql } from 'drizzle-orm.js';
import { db } from '../db.js';

export async function addEmailSettingsColumns() {
  
  
  try {
    // Verifica se la colonna smtp_host esiste già
    const checkResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'smtp_host'
    `);

    // Se la colonna non esiste, aggiungi le colonne necessarie
    if (checkResult.length === 0) {
      
      
      await db.execute(sql`
        ALTER TABLE users
        ADD COLUMN smtp_host TEXT,
        ADD COLUMN smtp_port INTEGER,
        ADD COLUMN smtp_user TEXT,
        ADD COLUMN smtp_pass TEXT,
        ADD COLUMN smtp_from TEXT,
        ADD COLUMN custom_email_enabled BOOLEAN DEFAULT FALSE;
      `);
      
      
    } else {
      
    }
    
    return true;
  } catch (error) {
    
    return false;
  }
}

// Esegui la migrazione all'avvio del server
addEmailSettingsColumns()
  .then(() => {
    // Migration completed successfully
  })
  .catch(err => {
    // Error handling
  });  