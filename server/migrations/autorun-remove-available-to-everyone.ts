import { db } from '../db.js';
import fs from 'fs';

// Nome di questa migrazione
const MIGRATION_NAME = 'remove-available-to-everyone';
// Imposta a true per farla eseguire automaticamente all'avvio del server
const AUTORUN = true;

// Directory per tenere traccia delle migrazioni eseguite
const MIGRATIONS_DIR = `${process.env.HOME}/.gervis/migrations`;

// Verificare se questa migrazione è già stata eseguita
function hasRun(): boolean {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    return false;
  }
  
  const filePath = `${MIGRATIONS_DIR}/${MIGRATION_NAME}.done`;
  return fs.existsSync(filePath);
}

// Contrassegnare questa migrazione come eseguita
function markAsRun() {
  const filePath = `${MIGRATIONS_DIR}/${MIGRATION_NAME}.done`;
  fs.writeFileSync(filePath, new Date().toISOString());
}

// Esegui la migrazione
async function runMigration() {
  console.log(`[Migration] Running ${MIGRATION_NAME}...`);
  
  try {
    await db.execute(`
      ALTER TABLE "portfolio_products" DROP COLUMN IF EXISTS "available_to_everyone";
    `);
    
    console.log(`[Migration] Successfully removed available_to_everyone column from portfolio_products table.`);
    markAsRun();
    return true;
  } catch (error) {
    console.error(`[Migration] Failed to run ${MIGRATION_NAME}:`, error);
    return false;
  }
}

// Esporta la funzione per l'esecuzione manuale
export default async function run() {
  if (hasRun()) {
    console.log(`[Migration] ${MIGRATION_NAME} already run, skipping.`);
    return true;
  }
  
  return await runMigration();
}

// Esegui automaticamente all'importazione se AUTORUN è impostato
if (AUTORUN) {
  (async () => {
    try {
      await run();
    } catch (error) {
      console.error(`[Migration] Error in ${MIGRATION_NAME}:`, error);
    }
  })();
} 