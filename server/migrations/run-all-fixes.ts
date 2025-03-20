/**
 * Questo script esegue tutte le correzioni di sicurezza e vincoli di integrità
 * necessarie per il corretto funzionamento dell'eliminazione dei clienti.
 */
import { fixCascadeDelete } from './fix-cascade-delete';
import { fixDeletePermissions } from './fix-delete-permissions';

async function runAllFixes() {
  console.log("Avvio correzioni Database - Eliminazione Clienti");
  
  try {
    // Primo passo: sistemiamo i permessi DELETE
    console.log("\n1. Correzione dei permessi di eliminazione nel database");
    const permissionsResult = await fixDeletePermissions();
    console.log("Risultato correzione permessi:", permissionsResult);
    
    if (!permissionsResult.success) {
      console.error("Errore nella correzione dei permessi, dettagli:", permissionsResult.error);
      process.exit(1);
    }
    
    // Secondo passo: configuriamo i vincoli CASCADE DELETE
    console.log("\n2. Configurazione dei vincoli di eliminazione a cascata");
    const cascadeResult = await fixCascadeDelete();
    console.log("Risultato configurazione cascade delete:", cascadeResult);
    
    if (!cascadeResult.success) {
      console.error("Errore nella configurazione cascade delete, dettagli:", cascadeResult.error);
      process.exit(1);
    }
    
    console.log("\n✓ Tutte le correzioni sono state applicate con successo!");
    console.log("✓ I clienti possono ora essere eliminati correttamente, insieme a tutti i loro dati correlati.");
    
    return { 
      success: true, 
      message: "Tutte le correzioni database applicate con successo",
      permissionsResult,
      cascadeResult
    };
  } catch (error) {
    console.error("Errore durante l'esecuzione delle correzioni:", error);
    return { success: false, error: String(error) };
  }
}

// Esegui la funzione se lo script viene eseguito direttamente
if (require.main === module) {
  runAllFixes()
    .then(result => {
      console.log("Risultato finale:", result.success ? "Successo" : "Fallimento");
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error("Errore fatale:", err);
      process.exit(1);
    });
}

export { runAllFixes };