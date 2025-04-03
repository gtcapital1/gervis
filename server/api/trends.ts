import { Router } from 'express';
import { trendService } from '../trends-service';
import { requireAuth } from './auth';

const router = Router();

// Endpoint per ottenere i dati di trend per un consulente
router.get('/:advisorId', requireAuth, async (req, res) => {
  try {
    const advisorId = parseInt(req.params.advisorId);
    const userId = req.user!.id;

    console.log(`[Trends API] Richiesta dati per advisor ${advisorId} da utente ${userId}`);

    // Verifica che l'utente abbia accesso ai dati del consulente
    if (userId !== advisorId && !req.user!.isAdmin) {
      console.log(`[Trends API] Accesso negato: utente ${userId} non autorizzato a vedere i dati di ${advisorId}`);
      return res.status(403).json({ error: 'Non autorizzato ad accedere a questi dati' });
    }

    console.log(`[Trends API] Generazione trend per advisor ${advisorId}`);
    await trendService.generateAndSaveTrendsForAdvisor(advisorId);
    
    console.log(`[Trends API] Recupero trend per advisor ${advisorId}`);
    const trendData = await trendService.getTrendDataForAdvisor(advisorId);
    
    console.log(`[Trends API] Dati recuperati:`, JSON.stringify(trendData, null, 2));
    
    res.json({
      success: true,
      data: trendData
    });
  } catch (error) {
    console.error('[Trends API] Errore:', error);
    res.status(500).json({ error: 'Errore nel recupero dei dati di trend' });
  }
});

export default router; 