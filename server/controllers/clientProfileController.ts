import { Request, Response } from 'express.js';
import { getCompleteClientProfile, findClientByName } from '../services/clientProfileService.js';

// Cache semplice per i profili cliente (in produzione usare Redis o altra soluzione)
const profileCache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minuti in millisecondi

/**
 * Recupera il profilo completo di un cliente tramite ID
 * @route GET /api/clients/:id/profile-complete
 */
export async function getClientProfileById(req: Request, res: Response) {
  try {
    const clientId = parseInt(req.params.id);
    
    if (isNaN(clientId)) {
      return res.status(400).json({
        success: false,
        error: "ID cliente non valido"
      });
    }
    
    // Verifica se il profilo è in cache e ancora valido
    const cacheKey = `client-${clientId}`;
    if (profileCache[cacheKey] && (Date.now() - profileCache[cacheKey].timestamp < CACHE_TTL)) {
      console.log(`Servendo profilo cliente ${clientId} dalla cache`);
      return res.json(profileCache[cacheKey].data);
    }
    
    // Altrimenti recupera dal database
    const result = await getCompleteClientProfile(clientId);
    
    // Se il risultato è positivo, salva in cache
    if (result.success) {
      profileCache[cacheKey] = {
        data: result,
        timestamp: Date.now()
      };
    }
    
    return res.json(result);
  } catch (error) {
    console.error("Errore nella gestione della richiesta di profilo cliente:", error);
    return res.status(500).json({
      success: false,
      error: "Errore del server durante il recupero del profilo cliente"
    });
  }
}

/**
 * Cerca e recupera il profilo completo di un cliente tramite nome
 * @route GET /api/clients/search
 */
export async function searchClientByName(req: Request, res: Response) {
  try {
    const { name } = req.query;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        error: "Nome cliente mancante o non valido"
      });
    }
    
    // Cerca l'ID del cliente per nome
    const clientId = await findClientByName(name, undefined, false);
    
    if (!clientId) {
      return res.status(404).json({
        success: false,
        error: `Cliente "${name}" non trovato`
      });
    }
    
    // Usa la funzione esistente per ottenere il profilo completo
    const result = await getCompleteClientProfile(clientId);
    return res.json(result);
  } catch (error) {
    console.error("Errore nella ricerca del cliente per nome:", error);
    return res.status(500).json({
      success: false,
      error: "Errore del server durante la ricerca del cliente"
    });
  }
}

/**
 * Invalida la cache per un cliente specifico
 * @route POST /api/clients/:id/invalidate-cache
 */
export async function invalidateClientCache(req: Request, res: Response) {
  try {
    const clientId = parseInt(req.params.id);
    
    if (isNaN(clientId)) {
      return res.status(400).json({
        success: false,
        error: "ID cliente non valido"
      });
    }
    
    const cacheKey = `client-${clientId}`;
    if (profileCache[cacheKey]) {
      delete profileCache[cacheKey];
      return res.json({
        success: true,
        message: `Cache invalidata per il cliente ${clientId}`
      });
    }
    
    return res.json({
      success: true,
      message: `Nessuna cache da invalidare per il cliente ${clientId}`
    });
  } catch (error) {
    console.error("Errore nell'invalidazione della cache:", error);
    return res.status(500).json({
      success: false,
      error: "Errore del server durante l'invalidazione della cache"
    });
  }
} 