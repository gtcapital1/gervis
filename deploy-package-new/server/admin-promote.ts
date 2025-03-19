/**
 * Script temporaneo per promuovere un utente specifico a ruolo admin
 * Questo script è inteso per essere eseguito una sola volta durante la configurazione iniziale
 */

import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function promoteAdminUser() {
  const email = 'gianmarco.trapasso@gmail.com';
  
  try {
    console.log(`Cercando l'utente con email: ${email}`);
    
    // Cerca l'utente
    const result = await db.select().from(users).where(eq(users.email, email));
    
    if (result.length === 0) {
      console.log(`Utente con email ${email} non trovato.`);
      return;
    }
    
    const user = result[0];
    console.log(`Utente trovato: ${user.id} - ${user.name}`);
    
    // Aggiorna il ruolo e lo stato di approvazione
    const updatedUser = await db
      .update(users)
      .set({
        role: 'admin',
        approvalStatus: 'approved'
      })
      .where(eq(users.id, user.id))
      .returning();
    
    if (updatedUser.length > 0) {
      console.log(`Utente ${updatedUser[0].name} (${updatedUser[0].email}) è stato promosso ad admin.`);
      console.log(`Ruolo: ${updatedUser[0].role}, Stato: ${updatedUser[0].approvalStatus}`);
    } else {
      console.log('Errore: Aggiornamento non riuscito');
    }
  } catch (error) {
    console.error('Errore durante la promozione dell\'utente:', error);
  }
}

// Esegui lo script
promoteAdminUser()
  .then(() => {
    console.log('Script completato.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Errore durante l\'esecuzione dello script:', error);
    process.exit(1);
  });