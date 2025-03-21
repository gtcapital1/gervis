/**
 * Rotte API per la gestione delle notizie finanziarie e l'analisi AI
 */

import { Express, Request, Response } from 'express';
import { getAllFinancialNews, getNewsDetails } from '../services/financial-news-service';
import { findRelevantClientsForNews } from '../services/ai-analyst-service';
import { storage } from '../storage';
import { log } from '../vite';

/**
 * Registra le rotte per le notizie finanziarie e l'analisi AI
 */
export function registerFinancialNewsRoutes(app: Express): void {
  // Middleware per verificare l'autenticazione
  function isAuthenticated(req: Request, res: Response, next: Function) {
    if (req.session && req.session.passport && req.session.passport.user) {
      return next();
    }
    return res.status(401).json({ success: false, message: 'Non autenticato' });
  }
  
  // Middleware per verificare i permessi admin
  async function isAdmin(req: Request, res: Response, next: Function) {
    if (req.session && req.session.passport && req.session.passport.user) {
      try {
        const userId = req.session.passport.user;
        const user = await storage.getUser(userId);
        
        if (user && user.role === 'admin') {
          return next();
        }
      } catch (error) {
        log(`Errore nella verifica admin: ${error}`, 'financial-news-routes');
      }
    }
    return res.status(403).json({ success: false, message: 'Accesso negato' });
  }
  
  // GET /api/financial-news - Recupera tutte le notizie finanziarie
  app.get('/api/financial-news', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const news = await getAllFinancialNews();
      return res.json({ success: true, news });
    } catch (error) {
      log(`Errore nel recupero delle notizie: ${error}`, 'financial-news-routes');
      return res.status(500).json({ success: false, message: 'Errore nel recupero delle notizie finanziarie' });
    }
  });
  
  // GET /api/financial-news/:id - Recupera i dettagli di una specifica notizia
  app.get('/api/financial-news/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const newsId = req.params.id;
      const newsDetails = await getNewsDetails(newsId);
      
      if (!newsDetails) {
        return res.status(404).json({ success: false, message: 'Notizia non trovata' });
      }
      
      return res.json({ success: true, news: newsDetails });
    } catch (error) {
      log(`Errore nel recupero dei dettagli della notizia: ${error}`, 'financial-news-routes');
      return res.status(500).json({ success: false, message: 'Errore nel recupero dei dettagli della notizia' });
    }
  });
  
  // POST /api/financial-news/:id/analysis - Analizza una notizia e trova clienti rilevanti
  app.post('/api/financial-news/:id/analysis', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.passport.user;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'Utente non trovato' });
      }
      
      const newsId = req.params.id;
      const newsDetails = await getNewsDetails(newsId);
      
      if (!newsDetails) {
        return res.status(404).json({ success: false, message: 'Notizia non trovata' });
      }
      
      // Recupera i clienti dell'advisor
      const clients = await storage.getClientsByAdvisor(userId);
      
      if (!clients || clients.length === 0) {
        return res.json({ success: true, recommendations: [], message: 'Nessun cliente trovato per questo advisor' });
      }
      
      // Trova i clienti rilevanti
      const minimumRelevanceScore = req.body.minimumRelevanceScore || 50;
      const recommendations = await findRelevantClientsForNews(
        newsDetails, 
        clients, 
        `${user.firstName} ${user.lastName}`, 
        user.email,
        user.phone,
        minimumRelevanceScore
      );
      
      return res.json({ success: true, recommendations });
    } catch (error) {
      log(`Errore nell'analisi della notizia: ${error}`, 'financial-news-routes');
      return res.status(500).json({ success: false, message: 'Errore nell\'analisi della notizia' });
    }
  });
  
  // POST /api/financial-news/analysis-all - Analizza tutte le notizie per trovare le più rilevanti
  app.post('/api/financial-news/analysis-all', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.passport.user;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'Utente non trovato' });
      }
      
      // Recupera tutte le notizie
      const allNews = await getAllFinancialNews();
      
      // Limita l'analisi alle notizie più recenti
      const maxNewsToAnalyze = req.body.maxNewsToAnalyze || 5;
      const recentNews = allNews.slice(0, maxNewsToAnalyze);
      
      // Recupera i clienti dell'advisor
      const clients = await storage.getClientsByAdvisor(userId);
      
      if (!clients || clients.length === 0) {
        return res.json({ success: true, allRecommendations: [], message: 'Nessun cliente trovato per questo advisor' });
      }
      
      // Analizza ogni notizia per trovare clienti rilevanti
      const minimumRelevanceScore = req.body.minimumRelevanceScore || 70; // Punteggio più alto per l'analisi di massa
      
      const allRecommendations = await Promise.all(
        recentNews.map(async (news) => {
          const recommendations = await findRelevantClientsForNews(
            news, 
            clients, 
            `${user.firstName} ${user.lastName}`, 
            user.email,
            user.phone,
            minimumRelevanceScore
          );
          
          return {
            newsId: news.id,
            newsTitle: news.title,
            newsSource: news.source,
            newsUrl: news.url,
            recommendationsCount: recommendations.length,
            recommendations
          };
        })
      );
      
      // Filtra solo le notizie che hanno generato raccomandazioni
      const relevantRecommendations = allRecommendations.filter(item => item.recommendationsCount > 0);
      
      return res.json({ 
        success: true, 
        totalNewsAnalyzed: recentNews.length,
        relevantNewsCount: relevantRecommendations.length,
        allRecommendations: relevantRecommendations 
      });
    } catch (error) {
      log(`Errore nell'analisi di tutte le notizie: ${error}`, 'financial-news-routes');
      return res.status(500).json({ success: false, message: 'Errore nell\'analisi delle notizie' });
    }
  });
}