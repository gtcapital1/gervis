/**
 * This migration adds verification PIN fields to the users table.
 */
import { db } from '../db.js';
import { sql } from 'drizzle-orm.js';

async function addVerificationPinFields() {
  try {
    
    
    // Add verification_pin column
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS verification_pin TEXT,
      ADD COLUMN IF NOT EXISTS registration_completed BOOLEAN DEFAULT FALSE
    `);
    
    
  } catch (error) {
    
    throw error;
  }
}

// Execute the migration
addVerificationPinFields()
  .then(() => {
    
    process.exit(0);
  })
  .catch((error) => {
    
    process.exit(1);
  });