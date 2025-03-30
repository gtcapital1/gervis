/**
 * Script per eseguire la migrazione che aggiunge il campo activated_at
 * alla tabella clients per tracciare quando un cliente è diventato attivo.
 */

import { autorunAddActivatedAt } from './autorun-add-activated-at';

async function runAddActivatedAtMigration() {
  console.log('Inizio esecuzione migrazione per aggiungere activated_at');
  
  try {
    // Esegui la migrazione con silent = false per mostrare tutti i log
    console.log('\n======== Migrazione activated_at ========');
    const success = await autorunAddActivatedAt(false);
    
    if (success) {
      console.log('Migrazione activated_at completata con successo');
    } else {
      throw new Error('La migrazione activated_at è fallita');
    }
    
    console.log('======== Fine migrazione activated_at ========\n');
    
  } catch (error) {
    console.error('Errore durante l\'esecuzione della migrazione:', error);
    throw error;
  }
}

// Esegui la migrazione se questo file viene eseguito direttamente
if (require.main === module) {
  runAddActivatedAtMigration()
    .then(() => {
      console.log('Script completato con successo');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script fallito con errore:', error);
      process.exit(1);
    });
}

export default runAddActivatedAtMigration; 