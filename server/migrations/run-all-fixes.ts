/**
 * Script per eseguire tutte le migrazioni di fix in sequenza
 * Questo file coordina l'esecuzione di tutti gli script di migrazione necessari
 * per garantire il corretto funzionamento del database.
 */

import fixCascadeConstraints from './fix-cascade-delete';

async function runAllFixes() {
  
  
  try {
    // 1. Esegui il fix dei vincoli CASCADE DELETE
    
    await fixCascadeConstraints();
    
    
    // Altri fix possono essere aggiunti qui sotto
    // Esempio: 
    // 
    // await fixAltreStrutture();
    // 
    
    
    
  } catch (error) {
    
    throw error;
  }
}

// Esegui le migrazioni se questo file viene eseguito direttamente
if (require.main === module) {
  runAllFixes()
    .then(() => {
      
      process.exit(0);
    })
    .catch((error) => {
      
      process.exit(1);
    });
}

export default runAllFixes;