import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * This script will add the firstName and lastName columns to the clients table
 * and populate them with data from the name column.
 */
async function addNameColumns() {
  
  
  try {
    // Step 1: Add firstName column if it doesn't exist
    
    await db.execute(sql`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS first_name TEXT
    `);
    
    // Step 2: Add lastName column if it doesn't exist
    
    await db.execute(sql`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS last_name TEXT
    `);
    
    // Step 3: Populate the new columns with data from the name column
    
    await db.execute(sql`
      UPDATE clients
      SET 
        first_name = SPLIT_PART(name, ' ', 1),
        last_name = SUBSTRING(name FROM POSITION(' ' IN name) + 1)
      WHERE 
        (first_name IS NULL OR first_name = '') AND 
        (last_name IS NULL OR last_name = '') AND
        name IS NOT NULL AND 
        POSITION(' ' IN name) > 0
    `);
    
    // For clients with single word names, treat it as firstName
    await db.execute(sql`
      UPDATE clients
      SET 
        first_name = name,
        last_name = ''
      WHERE 
        (first_name IS NULL OR first_name = '') AND 
        (last_name IS NULL OR last_name = '') AND
        name IS NOT NULL AND 
        POSITION(' ' IN name) = 0
    `);
    
    
  } catch (error) {
    
    throw error;
  }
}

// Run the migration
addNameColumns()
  .then(() => {
    
    process.exit(0);
  })
  .catch((error) => {
    
    process.exit(1);
  });