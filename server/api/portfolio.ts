import { Router } from 'express';
// Rimuovo l'importazione problematica
// import { isAuthenticated } from '../auth.js';
import { db } from '../db.js';
import { modelPortfolios, portfolioAllocations } from '../../shared/schema.js';

const router = Router();

// Endpoint per salvare un portfolio generato
router.post('/save', async (req, res) => {  // Rimuovo isAuthenticated
  try {
    // Verifica che l'utente sia autenticato
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato'
      });
    }

    const {
      name,
      description,
      clientProfile,
      riskLevel,
      constructionLogic,
      entryCost,
      exitCost,
      ongoingCost,
      transactionCost,
      totalAnnualCost,
      averageRisk,
      averageTimeHorizon,
      assetClassDistribution,
      allocation
    } = req.body;

    // Validazione dati base
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Nome portafoglio obbligatorio'
      });
    }

    // Validazione allocazione
    if (!allocation || !Array.isArray(allocation) || allocation.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Allocazione prodotti obbligatoria'
      });
    }

    // Converti valori numerici se necessario
    const numericEntryCost = typeof entryCost === 'string' ? parseFloat(entryCost) : entryCost;
    const numericExitCost = typeof exitCost === 'string' ? parseFloat(exitCost) : exitCost;
    const numericOngoingCost = typeof ongoingCost === 'string' ? parseFloat(ongoingCost) : ongoingCost;
    const numericTransactionCost = typeof transactionCost === 'string' ? parseFloat(transactionCost) : transactionCost;
    const numericTotalCost = typeof totalAnnualCost === 'string' ? parseFloat(totalAnnualCost) : totalAnnualCost;
    const numericRisk = typeof averageRisk === 'string' ? parseFloat(averageRisk) : averageRisk;
    const numericTimeHorizon = typeof averageTimeHorizon === 'string' ? parseFloat(averageTimeHorizon) : averageTimeHorizon;

    // Salva il portfolio nel database in una transazione
    const result = await db.transaction(async (tx) => {
      // 1. Inserisci il portfolio - correggo i nomi delle proprietà
      const [newPortfolio] = await tx.insert(modelPortfolios)
        .values({
          name,
          description: description || '',
          clientProfile: clientProfile || '', // corretto
          riskLevel: riskLevel || '', // corretto
          createdBy: req.user?.id, // corretto e aggiunto ?
          constructionLogic: constructionLogic || '', // corretto
          entryCost: numericEntryCost || 0, // corretto
          exitCost: numericExitCost || 0, // corretto
          ongoingCost: numericOngoingCost || 0, // corretto
          transactionCost: numericTransactionCost || 0, // corretto
          totalAnnualCost: numericTotalCost || 0, // corretto
          averageRisk: numericRisk || 0, // corretto
          averageTimeHorizon: numericTimeHorizon || null, // corretto
          assetClassDistribution: assetClassDistribution || '[]' // corretto
        })
        .returning();
      
      // 2. Inserisci le allocazioni
      const allocationsData = allocation.map(item => ({
        portfolioId: newPortfolio.id, // corretto
        productId: typeof item.productId === 'string' ? parseInt(item.productId) : item.productId, // corretto
        percentage: item.percentage
      }));
      
      const allocations = await tx.insert(portfolioAllocations)
        .values(allocationsData)
        .returning();
      
      return {
        portfolio: newPortfolio,
        allocations
      };
    });

    // Restituisci risposta con i dati inseriti
    res.json({
      success: true,
      message: 'Portafoglio salvato con successo',
      data: result
    });
  } catch (error) {
    console.error('Errore nel salvataggio del portafoglio:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel salvataggio del portafoglio',
      error: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
});

export default router; 