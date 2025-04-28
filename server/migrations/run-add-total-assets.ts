/**
 * Script per eseguire la migrazione che aggiunge il campo total_assets
 * alla tabella clients e aggiorna i valori per tutti i client esistenti.
 */

import { autorunAddTotalAssets } from './autorun-add-total-assets.js';

async function runAddTotalAssetsMigration() {
  
  
  try {
    // Esegui la migrazione con silent = false per mostrare tutti i log
    
    const success = await autorunAddTotalAssets(false);
    
    if (success) {
      
    } else {
      throw new Error('La migrazione total_assets è fallita');
    }
    
    
    
  } catch (error) {
    
    throw error;
  }
}

// Esegui la migrazione se questo file viene eseguito direttamente
if (require.main === module) {
  runAddTotalAssetsMigration()
    .then(() => {
      
      process.exit(0);
    })
    .catch((error) => {
      
      process.exit(1);
    });
}

export default runAddTotalAssetsMigration; 