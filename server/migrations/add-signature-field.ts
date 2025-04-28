/**
 * This script will add the signature column to the users table.
 */
import { db } from '../db.js';
import { sql } from 'drizzle-orm';

async function addSignatureField() {
  try {
    
    
    // Execute SQL statement to add the signature column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE IF EXISTS "users" 
      ADD COLUMN IF NOT EXISTS "signature" text;
    `);
    
    
  } catch (error) {
    
  }
}

// Run the migration
(async () => {
  await addSignatureField();
  process.exit(0);
})();