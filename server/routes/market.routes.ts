import { Express, Request, Response } from 'express';
import { 
  getMarketIndices, 
  getTickerData, 
  validateTicker, 
  getFinancialNews, 
  getTickerSuggestions 
} from '../market-api';
import { rateLimit, isAuthenticated, safeLog, handleErrorResponse } from '../routes';

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

  // Rotte per i dati di mercato accessibili a utenti autenticati
  app.get('/api/market/indices', marketRateLimit, isAuthenticated, (req: Request, res: Response) => {
    try {
      safeLog('Richiesta dati indici di mercato');
      getMarketIndices(req, res);
    } catch (error) {
      handleErrorResponse(res, error, 'Errore nel recupero degli indici di mercato');
    }
  });

  app.get('/api/market/tickers', marketRateLimit, isAuthenticated, (req: Request, res: Response) => {
    try {
      safeLog('Richiesta dati ticker specifici', { symbols: req.query.symbols });
      getTickerData(req, res);
    } catch (error) {
      handleErrorResponse(res, error, 'Errore nel recupero dei dati dei ticker');
    }
  });

  app.get('/api/market/validate-ticker', marketRateLimit, isAuthenticated, (req: Request, res: Response) => {
    try {
      safeLog('Richiesta validazione ticker', { symbol: req.query.symbol });
      validateTicker(req, res);
    } catch (error) {
      handleErrorResponse(res, error, 'Errore nella validazione del ticker');
    }
  });

  app.get('/api/market/news', marketRateLimit, isAuthenticated, (req: Request, res: Response) => {
    try {
      safeLog('Richiesta notizie finanziarie', { filter: req.query.filter });
      getFinancialNews(req, res);
    } catch (error) {
      handleErrorResponse(res, error, 'Errore nel recupero delle notizie finanziarie');
    }
  });

  app.get('/api/market/ticker-suggestions', marketRateLimit, isAuthenticated, (req: Request, res: Response) => {
    try {
      safeLog('Richiesta suggerimenti ticker', { query: req.query.query });
      getTickerSuggestions(req, res);
    } catch (error) {
      handleErrorResponse(res, error, 'Errore nel recupero dei suggerimenti per i ticker');
    }
  });

  safeLog('Rotte per i dati di mercato registrate con successo');
} 