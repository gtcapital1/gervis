import { sql } from 'drizzle-orm';
import { db } from '../db';

export async function addEmailSettingsColumns() {
  console.log('Verifico ed aggiungo colonne per impostazioni email...');
  
  try {
    // Verifica se la colonna smtp_host esiste già
    const checkResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'smtp_host'
    `);

    // Se la colonna non esiste, aggiungi le colonne necessarie
    if (checkResult.length === 0) {
      console.log('Le colonne per impostazioni email non esistono, le aggiungo...');
      
      await db.execute(sql`
        ALTER TABLE users
        ADD COLUMN smtp_host TEXT,
        ADD COLUMN smtp_port INTEGER,
        ADD COLUMN smtp_user TEXT,
        ADD COLUMN smtp_pass TEXT,
        ADD COLUMN smtp_from TEXT,
        ADD COLUMN custom_email_enabled BOOLEAN DEFAULT FALSE;
      `);
      
      console.log('Colonne per impostazioni email aggiunte con successo.');
    } else {
      console.log('Le colonne per impostazioni email esistono già.');
    }
    
    return true;
  } catch (error) {
    console.error('Errore durante l\'aggiunta delle colonne per impostazioni email:', error);
    return false;
  }
}

// Esegui la migrazione all'avvio del server
addEmailSettingsColumns()
  .then(() => console.log('Migrazione per impostazioni email completata.'))
  .catch(err => console.error('Errore durante la migrazione per impostazioni email:', err)); 