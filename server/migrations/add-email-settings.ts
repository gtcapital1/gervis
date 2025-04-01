import { sql } from '@vercel/postgres';

export async function addEmailSettingsColumns() {
  console.log('Aggiunta colonne per impostazioni email...');
  try {
    await sql`
      ALTER TABLE users
      ADD COLUMN smtp_host TEXT,
      ADD COLUMN smtp_port INTEGER,
      ADD COLUMN smtp_user TEXT,
      ADD COLUMN smtp_pass TEXT,
      ADD COLUMN smtp_from TEXT,
      ADD COLUMN custom_email_enabled BOOLEAN DEFAULT FALSE;
    `;
    console.log('Colonne per impostazioni email aggiunte con successo.');
    return true;
  } catch (error) {
    console.error('Errore durante l\'aggiunta delle colonne per impostazioni email:', error);
    return false;
  }
}

// Esegui la migrazione se questo file viene eseguito direttamente
if (require.main === module) {
  addEmailSettingsColumns()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Errore:', err);
      process.exit(1);
    });
} 