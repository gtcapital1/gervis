import { Router } from 'express';
import { trendService } from '../trends-service.js';

// Definizione del middleware di autenticazione
function isAuthenticated(req: any, res: any, next: Function) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  next();
}

const router = Router();

// Endpoint per ottenere i dati di trend per un consulente
router.get('/:advisorId', isAuthenticated, async (req, res) => {
  try {
    const advisorId = parseInt(req.params.advisorId);
    const userId = req.user!.id;
    const forceRefresh = req.query.refresh === 'true';

    console.log(`[Trends API] Richiesta dati per advisor ${advisorId} da utente ${userId}, forceRefresh: ${forceRefresh}`);

    // Verifica che l'utente abbia accesso ai dati del consulente
    if (userId !== advisorId && !(req.user as any).isAdmin) {
      console.log(`[Trends API] Accesso negato: utente ${userId} non autorizzato a vedere i dati di ${advisorId}`);
      return res.status(403).json({ error: 'Non autorizzato ad accedere a questi dati' });
    }

    // Se è richiesto un refresh forzato o non ci sono dati, genera i trend
    if (forceRefresh) {
      console.log(`[Trends API] Forza rigenerazione trend per advisor ${advisorId}`);
      await trendService.generateAndSaveTrendsForAdvisor(advisorId);
    } else {
      // Verifica se esistono già dati di trend per questo advisor
      const existingData = await trendService.getTrendDataForAdvisor(advisorId);
      
      // Se non ci sono dati, genera i trend
      if (!existingData || existingData.length === 0) {
        console.log(`[Trends API] Nessun dato esistente, generazione trend per advisor ${advisorId}`);
        await trendService.generateAndSaveTrendsForAdvisor(advisorId);
      } else {
        console.log(`[Trends API] Dati esistenti trovati per advisor ${advisorId}, skip generazione`);
      }
    }
    
    console.log(`[Trends API] Recupero trend per advisor ${advisorId}`);
    const trendData = await trendService.getTrendDataForAdvisor(advisorId);
    
    console.log(`[Trends API] Dati recuperati:`, JSON.stringify(trendData, null, 2));
    
    res.json({
      success: true,
      refreshed: forceRefresh,
      data: trendData
    });
  } catch (error) {
    console.error('[Trends API] Errore:', error);
    res.status(500).json({ error: 'Errore nel recupero dei dati di trend' });
  }
});

export default router; 