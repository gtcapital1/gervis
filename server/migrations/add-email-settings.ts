import { sql } from '@vercel/postgres';

export async function addEmailSettingsColumns() {
  
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
    
    return true;
  } catch (error) {
    
    return false;
  }
}

// Esegui la migrazione se questo file viene eseguito direttamente
if (require.main === module) {
  addEmailSettingsColumns()
    .then(() => process.exit(0))
    .catch(err => {
      
      process.exit(1);
    });
} 