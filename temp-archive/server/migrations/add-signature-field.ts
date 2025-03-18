/**
 * This script will add the signature column to the users table.
 */
import { db } from '../db';
import { sql } from 'drizzle-orm';

async function addSignatureField() {
  try {
    console.log('Adding signature field to users table...');
    
    // Execute SQL statement to add the signature column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE IF EXISTS "users" 
      ADD COLUMN IF NOT EXISTS "signature" text;
    `);
    
    console.log('Signature field added successfully!');
  } catch (error) {
    console.error('Error adding signature field:', error);
  }
}

// Run the migration
(async () => {
  await addSignatureField();
  process.exit(0);
})();