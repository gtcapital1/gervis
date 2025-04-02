/**
 * Helper per operazioni di eliminazione affidabili
 * Questo modulo assicura che le operazioni DELETE siano eseguite correttamente
 * anche in presenza di potenziali problemi con il server.
 */

import { httpRequest } from './queryClient';

/**
 * Esegue un'operazione DELETE verificando il risultato
 * @param endpoint Endpoint da chiamare (es. '/api/clients/123')
 * @param verifyEndpoint Endpoint per verificare che l'eliminazione sia avvenuta (es. '/api/clients')
 * @param verifyFunction Funzione per verificare che l'elemento sia stato effettivamente eliminato
 * @returns true se l'elemento è stato eliminato con successo, false altrimenti
 */
export async function verifiedDelete<T, V>(
  endpoint: string,
  verifyEndpoint: string,
  verifyFunction: (data: V) => boolean
): Promise<boolean> {
  
  
  try {
    // Esegui la richiesta DELETE
    const deleteResult = await httpRequest<T>("DELETE", endpoint);
    
    
    // Verifica che l'eliminazione sia avvenuta facendo una GET sull'endpoint di verifica
    const verifyResult = await httpRequest<V>("GET", verifyEndpoint);
    const isDeleted = verifyFunction(verifyResult);
    
    if (isDeleted) {
      
      return true;
    } else {
      
      
      // Tentativo di ripristino - seconda richiesta DELETE più aggressiva
      console.warn(`[verifiedDelete] Tentativo di recupero con richiesta DELETE diretta`);
      try {
        await fetch(endpoint, {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '-1',
            'X-Requested-With': 'XMLHttpRequest',
            'X-No-HTML-Response': 'true',
            'X-Force-Content-Type': 'application/json',
            'X-Retry-Delete': 'true'
          }
        });
        
        // Verifica di nuovo
        const secondVerifyResult = await httpRequest<V>("GET", verifyEndpoint);
        const isDeletedAfterRetry = verifyFunction(secondVerifyResult);
        
        if (isDeletedAfterRetry) {
          
          return true;
        } else {
          
          return false;
        }
      } catch (retryError) {
        
        return false;
      }
    }
  } catch (error) {
    
    return false;
  }
}