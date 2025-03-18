/**
 * This migration adds verification PIN fields to the users table.
 */
import { db } from '../db';
import { sql } from 'drizzle-orm';

async function addVerificationPinFields() {
  try {
    console.log('Adding verification PIN fields to users table...');
    
    // Add verification_pin column
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS verification_pin TEXT,
      ADD COLUMN IF NOT EXISTS registration_completed BOOLEAN DEFAULT FALSE
    `);
    
    console.log('Verification PIN fields added successfully.');
  } catch (error) {
    console.error('Error adding verification PIN fields:', error);
    throw error;
  }
}

// Execute the migration
addVerificationPinFields()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });