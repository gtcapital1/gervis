import { db } from '../db';
import { clients } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * This script will migrate the existing client data to populate the firstName and lastName fields
 * from the name field for all clients where firstName or lastName is empty.
 */
async function migrateClientNames() {
  
  
  // Get all clients
  const allClients = await db.select().from(clients);
  let migratedCount = 0;
  
  for (const client of allClients) {
    // Skip clients that already have firstName and lastName populated
    if (client.firstName && client.lastName) {
      
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
      
      
      migratedCount++;
    }
  }
  
  
}

// Run the migration
migrateClientNames()
  .then(() => {
    
    process.exit(0);
  })
  .catch((error) => {
    
    process.exit(1);
  });