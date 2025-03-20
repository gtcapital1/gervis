/**
 * Script per eseguire tutte le migrazioni di fix in sequenza
 * Questo file coordina l'esecuzione di tutti gli script di migrazione necessari
 * per garantire il corretto funzionamento del database.
 */

import fixCascadeConstraints from './fix-cascade-delete';

async function runAllFixes() {
  console.log('Inizio esecuzione di tutte le migrazioni di fix database');
  
  try {
    // 1. Esegui il fix dei vincoli CASCADE DELETE
    console.log('\n======== Fix vincoli CASCADE DELETE ========');
    await fixCascadeConstraints();
    console.log('======== Fine fix vincoli CASCADE DELETE ========\n');
    
    // Altri fix possono essere aggiunti qui sotto
    // Esempio: 
    // console.log('\n======== Fix altre strutture ========');
    // await fixAltreStrutture();
    // console.log('======== Fine fix altre strutture ========\n');
    
    console.log('Tutte le migrazioni di fix completate con successo');
    
  } catch (error) {
    console.error('Errore durante l\'esecuzione dei fix:', error);
    throw error;
  }
}

// Esegui le migrazioni se questo file viene eseguito direttamente
if (require.main === module) {
  runAllFixes()
    .then(() => {
      console.log('Script completato con successo');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script fallito con errore:', error);
      process.exit(1);
    });
}

export default runAllFixes;