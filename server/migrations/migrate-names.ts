import { db } from '../db';
import { clients } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * This script will migrate the existing client data to populate the firstName and lastName fields
 * from the name field for all clients where firstName or lastName is empty.
 */
async function migrateClientNames() {
  console.log('Starting client name migration...');
  
  // Get all clients
  const allClients = await db.select().from(clients);
  let migratedCount = 0;
  
  for (const client of allClients) {
    // Skip clients that already have firstName and lastName populated
    if (client.firstName && client.lastName) {
      console.log(`Skipping client ${client.id} (${client.name}) - already has first/last name`);
      continue;
    }
    
    // If name exists but first/last name fields are empty, populate them
    if (client.name) {
      const nameParts = client.name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      
      // Update the client record
      await db.update(clients)
        .set({ 
          firstName, 
          lastName 
        })
        .where(eq(clients.id, client.id));
      
      console.log(`Migrated client ${client.id} - "${client.name}" → firstName: "${firstName}", lastName: "${lastName}"`);
      migratedCount++;
    }
  }
  
  console.log(`Migration complete. ${migratedCount} client records updated.`);
}

// Run the migration
migrateClientNames()
  .then(() => {
    console.log('Client name migration finished successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error during client name migration:', error);
    process.exit(1);
  });