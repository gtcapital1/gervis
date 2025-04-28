/**
 * Script per eseguire la migrazione che aggiunge il campo activated_at
 * alla tabella clients per tracciare quando un cliente è diventato attivo.
 */

import { autorunAddActivatedAt } from './autorun-add-activated-at.js';

async function runAddActivatedAtMigration() {
  
  
  try {
    // Esegui la migrazione con silent = false per mostrare tutti i log
    
    const success = await autorunAddActivatedAt(false);
    
    if (success) {
      
    } else {
      throw new Error('La migrazione activated_at è fallita');
    }
    
    
    
  } catch (error) {
    
    throw error;
  }
}

// Esegui la migrazione se questo file viene eseguito direttamente
if (require.main === module) {
  runAddActivatedAtMigration()
    .then(() => {
      
      process.exit(0);
    })
    .catch((error) => {
      
      process.exit(1);
    });
}

export default runAddActivatedAtMigration; 