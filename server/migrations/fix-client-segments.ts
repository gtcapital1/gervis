/**
 * Migration to fix client segments based on netWorth values
 * 
 * This script will ensure that all clients have the correct client segment
 * based on their netWorth value, using consistent rules across the application.
 */

import { sql } from 'drizzle-orm';
import { db } from '@shared/db';
import { clients } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
  try {
    console.log("Starting client segments fix migration...");
    
    // Get all clients
    const allClients = await db.select().from(clients);
    console.log(`Found ${allClients.length} clients to check.`);
    
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    // Process each client
    for (const client of allClients) {
      try {
        // Skip if netWorth is null
        if (client.netWorth === null || client.netWorth === undefined) {
          console.log(`Skipping client ${client.id} (${client.name}) - netWorth is null.`);
          skipped++;
          continue;
        }
        
        // Determine correct segment
        let correctSegment: "mass_market" | "affluent" | "hnw" | "vhnw" | "uhnw";
        if (client.netWorth >= 500000) {
          correctSegment = 'hnw';
        } else if (client.netWorth >= 100000) {
          correctSegment = 'affluent';
        } else {
          correctSegment = 'mass_market';
        }
        
        // Update if segment is incorrect
        if (client.clientSegment !== correctSegment) {
          console.log(`Fixing client ${client.id} (${client.name}): netWorth=${client.netWorth}, current segment=${client.clientSegment}, correct segment=${correctSegment}`);
          
          await db.update(clients)
            .set({ clientSegment: correctSegment })
            .where(eq(clients.id, client.id));
          
          updated++;
        } else {
          // Client segment is already correct
          skipped++;
        }
      } catch (error) {
        console.error(`Error processing client ${client.id}:`, error);
        errors++;
      }
    }
    
    console.log(`Migration completed. Updated ${updated} clients, skipped ${skipped} clients, encountered ${errors} errors.`);
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Execute the migration
main()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  }); 