/**
 * This migration adds email verification fields to the users table.
 */
import { db } from "../db";
import { sql } from "drizzle-orm";

async function addEmailVerificationFields() {
  try {
    
    
    // Add the fields to the users table
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS verification_token TEXT,
      ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP;
    `);
    
    // Set existing users as verified since they were already using the system
    await db.execute(sql`
      UPDATE users SET is_email_verified = TRUE WHERE is_email_verified IS NULL;
    `);
    
    
  } catch (error) {
    
    throw error;
  }
}

// Run the migration
addEmailVerificationFields()
  .then(() => {
    
    process.exit(0);
  })
  .catch((error) => {
    
    process.exit(1);
  });