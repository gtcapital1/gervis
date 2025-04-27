import { Request, Response } from 'express';
import { saveModelPortfolio, getUserModelPortfolios, getModelPortfolio, deleteModelPortfolio } from '../services/portfolioService';
import { db } from '../db';
import { modelPortfolios, portfolioAllocations } from '../../shared/schema';

/**
 * Salva un nuovo portafoglio modello
 */
export async function savePortfolio(req: Request, res: Response) {
  try {
    // Verifica che l'utente sia autenticato
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Utente non autenticato'
      });
    }

    const userId = req.user.id;
    const portfolioData = req.body;

    // Validazione di base
    if (!portfolioData.name) {
      return res.status(400).json({
        success: false,
        error: 'Nome del portafoglio richiesto'
      });
    }

    if (!portfolioData.allocations || !Array.isArray(portfolioData.allocations) || portfolioData.allocations.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Almeno una allocazione di asset è richiesta'
      });
    }

    // Salva il portafoglio direttamente senza ricalcoli
    // Tutti i valori vengono usati esattamente come passati dal client
    try {
      // Inizia una transazione per salvare sia il portfolio che le allocations
      const result = await db.transaction(async (tx) => {
        // 1. Salva il portfolio principale
        const [newPortfolio] = await tx.insert(modelPortfolios).values({
          createdBy: userId,
          name: portfolioData.name,
          description: portfolioData.description || '',
          clientProfile: portfolioData.clientProfile || '',
          riskLevel: portfolioData.riskLevel || '3',
          constructionLogic: portfolioData.constructionLogic || null,
          
          // Utilizza i valori inviati direttamente (assicurati che siano nel formato corretto)
          entryCost: (portfolioData.entryCost || 0).toString(),
          exitCost: (portfolioData.exitCost || 0).toString(),
          ongoingCost: (portfolioData.ongoingCost || 0).toString(),
          transactionCost: (portfolioData.transactionCost || 0).toString(),
          performanceFee: (portfolioData.performanceFee || 0).toString(),
          totalAnnualCost: (portfolioData.totalExpenseRatio || 0).toString(),
          
          // Metriche passate direttamente
          averageRisk: (portfolioData.averageRisk || 3).toString(),
          averageTimeHorizon: (portfolioData.averageTimeHorizon || 5).toString(),
          
          // Asset distribution
          assetClassDistribution: portfolioData.assetAllocation || {}
        }).returning();

        if (!newPortfolio) {
          throw new Error("Errore durante il salvataggio del portfolio");
        }

        const portfolioId = newPortfolio.id;
        
        // 2. Salva le allocazioni
        const allocationsToSave = portfolioData.allocations.map((alloc: any) => ({
          portfolioId: portfolioId,
          productId: alloc.productId,
          percentage: alloc.percentage.toString()
        }));
        
        const savedAllocations = await tx.insert(portfolioAllocations)
          .values(allocationsToSave)
          .returning();
        
        return {
          portfolio: newPortfolio,
          allocations: savedAllocations
        };
      });

      return res.status(201).json({
        success: true,
        data: result
      });
    } catch (dbError) {
      console.error('Errore del database:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Errore durante il salvataggio nel database'
      });
    }
  } catch (error) {
    console.error('Errore nel salvataggio del portafoglio:', error);
    return res.status(500).json({
      success: false,
      error: 'Si è verificato un errore durante il salvataggio del portafoglio'
    });
  }
}

/**
 * Ottiene tutti i portafogli modello dell'utente
 */
export async function getUserPortfolios(req: Request, res: Response) {
  try {
    // Verifica che l'utente sia autenticato
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Utente non autenticato'
      });
    }

    const userId = req.user.id;
    const portfolios = await getUserModelPortfolios(userId);

    return res.status(200).json({
      success: true,
      data: portfolios
    });
  } catch (error) {
    console.error('Errore nel recupero dei portafogli:', error);
    return res.status(500).json({
      success: false,
      error: 'Si è verificato un errore durante il recupero dei portafogli'
    });
  }
}

/**
 * Ottiene un portafoglio modello specifico
 */
export async function getPortfolio(req: Request, res: Response) {
  try {
    // Verifica che l'utente sia autenticato
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Utente non autenticato'
      });
    }

    const portfolioId = parseInt(req.params.id);
    if (isNaN(portfolioId)) {
      return res.status(400).json({
        success: false,
        error: 'ID portafoglio non valido'
      });
    }

    const portfolio = await getModelPortfolio(portfolioId);

    // Verifica che il portafoglio appartenga all'utente
    if (portfolio.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Non hai i permessi per accedere a questo portafoglio'
      });
    }

    return res.status(200).json({
      success: true,
      data: portfolio
    });
  } catch (error) {
    console.error('Errore nel recupero del portafoglio:', error);
    return res.status(500).json({
      success: false,
      error: 'Si è verificato un errore durante il recupero del portafoglio'
    });
  }
}

/**
 * Elimina un portafoglio modello
 */
export async function removePortfolio(req: Request, res: Response) {
  try {
    // Verifica che l'utente sia autenticato
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Utente non autenticato'
      });
    }

    const portfolioId = parseInt(req.params.id);
    if (isNaN(portfolioId)) {
      return res.status(400).json({
        success: false,
        error: 'ID portafoglio non valido'
      });
    }

    const userId = req.user.id;
    const deleted = await deleteModelPortfolio(portfolioId, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Portafoglio non trovato o non hai i permessi per eliminarlo'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Portafoglio eliminato con successo'
    });
  } catch (error) {
    console.error('Errore nell\'eliminazione del portafoglio:', error);
    return res.status(500).json({
      success: false,
      error: 'Si è verificato un errore durante l\'eliminazione del portafoglio'
    });
  }
} 