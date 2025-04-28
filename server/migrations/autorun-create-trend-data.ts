import { db } from '../db.js';
import { sql } from 'drizzle-orm';
import { fileURLToPath } from 'url';

/**
 * Esegue la migrazione per creare la tabella trend_data
 * @param silent Se true, non verrà mostrato alcun messaggio di log
 */
export async function autorunCreateTrendData(silent: boolean = false): Promise<void> {
  if (!silent) console.log('Checking if trend_data table needs to be created...');

  try {
    // Verifica se la tabella esiste già
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_data'
      );
    `);

    const exists = tableExists[0].exists;

    if (exists) {
      if (!silent) console.log('trend_data table already exists, skipping creation');
      return;
    }

    // Crea la tabella trend_data
    await db.execute(sql`
      CREATE TABLE trend_data (
        id SERIAL PRIMARY KEY,
        advisor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        date TIMESTAMP NOT NULL,
        value INTEGER,
        value_float TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Crea indici per migliorare le prestazioni di query comuni
    await db.execute(sql`
      CREATE INDEX idx_trend_data_advisor_id ON trend_data (advisor_id);
    `);
    
    await db.execute(sql`
      CREATE INDEX idx_trend_data_type ON trend_data (type);
    `);
    
    await db.execute(sql`
      CREATE INDEX idx_trend_data_date ON trend_data (date);
    `);
    
    await db.execute(sql`
      CREATE INDEX idx_trend_data_advisor_id_type ON trend_data (advisor_id, type);
    `);

    if (!silent) console.log('Successfully created trend_data table');
  } catch (error) {
    console.error('Error creating trend_data table:', error);
    throw error;
  }
}

// Funzione per verificare se il file corrente è il modulo principale
const isMainModule = () => {
  try {
    return process.argv[1] === fileURLToPath(import.meta.url);
  } catch (error) {
    return false;
  }
};

// Se il file viene eseguito direttamente, esegui la migrazione
if (isMainModule()) {
  autorunCreateTrendData()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
} 