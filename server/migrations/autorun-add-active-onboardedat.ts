import postgres from "postgres";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * This migration adds 'active' and 'onboarded_at' columns to the clients table.
 * - 'active' is a boolean field to manually flag if a client is active
 * - 'onboarded_at' is a timestamp field to track when a client became onboarded
 */
export async function autorunAddActiveAndOnboardedAt() {
  console.log("Starting migration to add 'active' and 'onboarded_at' columns to clients table");
  
  try {
    // Create a database connection
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL environment variable is not defined");
    }
    
    const migrationClient = postgres(url);
    console.log("Database connection established");
    
    // Check if the 'active' column exists
    const activeExists = await migrationClient`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'active'
      );
    `;
    
    // Add the 'active' column if it doesn't exist
    if (!activeExists[0].exists) {
      await migrationClient`
        ALTER TABLE clients 
        ADD COLUMN active BOOLEAN DEFAULT TRUE;
      `;
      console.log("Column 'active' added to clients table");
    } else {
      console.log("Column 'active' already exists");
    }
    
    // Check if the 'onboarded_at' column exists
    const onboardedAtExists = await migrationClient`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'onboarded_at'
      );
    `;
    
    // Add the 'onboarded_at' column if it doesn't exist
    if (!onboardedAtExists[0].exists) {
      await migrationClient`
        ALTER TABLE clients 
        ADD COLUMN onboarded_at TIMESTAMP;
      `;
      console.log("Column 'onboarded_at' added to clients table");
      
      // Update existing onboarded clients to set their onboarded_at timestamp
      await migrationClient`
        UPDATE clients 
        SET onboarded_at = NOW() 
        WHERE is_onboarded = TRUE AND onboarded_at IS NULL;
      `;
      console.log("Updated 'onboarded_at' for existing onboarded clients");
    } else {
      console.log("Column 'onboarded_at' already exists");
    }
    
    // Close the database connection
    await migrationClient.end();
    console.log("Migration completed successfully!");
    
    return true;
  } catch (error) {
    console.error(`Error during migration:`, error);
    return false;
  }
} 