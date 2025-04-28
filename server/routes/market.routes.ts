import { Express, Request, Response } from 'express.js';
import { 
  getFinancialNews, 
} from '../market-api.js';
import { rateLimit, isAuthenticated, safeLog, handleErrorResponse } from '../routes.js';

/**
 * Registra le rotte relative ai dati di mercato
 * - Fornisce dati degli indici principali
 * - Fornisce dati su ticker specifici
 * - Convalida ticker
 * - Recupera notizie finanziarie
 * - Fornisce suggerimenti per i ticker
 */
export function registerMarketRoutes(app: Express): void {
  safeLog('Registrazione delle rotte per i dati di mercato');

  // Limita il numero di richieste per prevenire abusi
  const marketRateLimit = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minuti
    max: 60 // 60 richieste per finestra
  });


  app.get('/api/market/news', marketRateLimit, isAuthenticated, (req: Request, res: Response) => {
    try {
      safeLog('Richiesta notizie finanziarie', { filter: req.query.filter });
      getFinancialNews(req, res);
    } catch (error) {
      handleErrorResponse(res, error, 'Errore nel recupero delle notizie finanziarie');
    }
  });

  safeLog('Rotte per i dati di mercato registrate con successo');
} 