/**
 * Script per eseguire la migrazione che aggiunge il campo total_assets
 * alla tabella clients e aggiorna i valori per tutti i client esistenti.
 */

import { autorunAddTotalAssets } from './autorun-add-total-assets';

async function runAddTotalAssetsMigration() {
  console.log('Inizio esecuzione migrazione per aggiungere total_assets');
  
  try {
    // Esegui la migrazione con silent = false per mostrare tutti i log
    console.log('\n======== Migrazione total_assets ========');
    const success = await autorunAddTotalAssets(false);
    
    if (success) {
      console.log('Migrazione total_assets completata con successo');
    } else {
      throw new Error('La migrazione total_assets è fallita');
    }
    
    console.log('======== Fine migrazione total_assets ========\n');
    
  } catch (error) {
    console.error('Errore durante l\'esecuzione della migrazione:', error);
    throw error;
  }
}

// Esegui la migrazione se questo file viene eseguito direttamente
if (require.main === module) {
  runAddTotalAssetsMigration()
    .then(() => {
      console.log('Script completato con successo');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script fallito con errore:', error);
      process.exit(1);
    });
}

export default runAddTotalAssetsMigration; 