import { sql } from 'drizzle-orm';
import { db } from '../db';

export async function runMigration() {
  console.log('Running migration: add metadata column to conversations table');
  
  try {
    // Controlla se la colonna esiste già
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'conversations' AND column_name = 'metadata'
    `);
    
    // Verifica se ci sono risultati
    if (result.length === 0) {
      // La colonna non esiste, aggiungila
      await db.execute(sql`
        ALTER TABLE conversations 
        ADD COLUMN metadata TEXT
      `);
      console.log('✅ Migration completed: metadata column added to conversations table');
    } else {
      console.log('⏭️ Migration skipped: metadata column already exists in conversations table');
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Esegui la migrazione immediatamente se questo file viene eseguito direttamente
if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
} 