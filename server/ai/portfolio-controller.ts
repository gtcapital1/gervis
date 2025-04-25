/**
 * Portfolio Controller
 * 
 * Controller per la generazione di portafogli di investimento utilizzando AI.
 * Espone funzioni per essere utilizzate come strumenti dall'agente AI.
 */

import { Request, Response } from 'express';
import { db } from '../db';
import { generatePortfolio } from './portfolio-generator';
import { portfolioProducts, userProducts, modelPortfolios, portfolioAllocations } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

/**
 * Interfaccia per i risultati dell'analisi del portafoglio
 */
export interface PortfolioAnalysisResult {
  averageRisk: number;
  averageInvestmentHorizon: number | null;
  assetClassDistribution: {
    [key: string]: number; // Categoria come chiave, percentuale come valore
  };
}

/**
 * Funzione per generare un portafoglio di investimento ottimizzato
 * Può essere chiamata direttamente come API o utilizzata come strumento dall'agente AI
 */
export async function generateInvestmentPortfolio(
  userId: number,
  portfolioDescription: string,
  clientProfile: string,
  riskLevel: string = 'balanced',
  investmentHorizon: string = 'medium_term',
  objectives: string[] = ['growth']
) {
  try {
    // Genera il portafoglio utilizzando l'AI
    const generatedPortfolio = await generatePortfolio(
      userId,
      portfolioDescription,
      clientProfile,
      riskLevel,
      investmentHorizon,
      objectives
    );
    
    return {
      success: true,
      portfolio: generatedPortfolio
    };
  } catch (error) {
    console.error('Error generating portfolio:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Calcola metriche dettagliate su un portafoglio:
 * - Orizzonte temporale medio ponderato
 * - Rischio medio ponderato
 * - Distribuzione percentuale per asset class
 * 
 * @param portfolioAllocation L'allocazione del portafoglio con i dettagli dei prodotti
 * @returns Oggetto con i risultati dell'analisi
 */
export async function calculatePortfolioMetrics(
  portfolioAllocation: Array<{
    isinId: number;
    percentage: number;
    category?: string; // Categoria opzionale direttamente nell'allocazione
  }>
): Promise<PortfolioAnalysisResult> {
  try {
    // Inizializza il risultato
    const result: PortfolioAnalysisResult = {
      averageRisk: 0,
      averageInvestmentHorizon: null,
      assetClassDistribution: {}
    };
    
    // Se l'allocazione è vuota, restituisci i valori di default
    if (!portfolioAllocation.length) {
      return result;
    }
    
    // Ottieni tutti i dettagli dei prodotti
    const productIds = portfolioAllocation.map(item => item.isinId);
    
    // Creazione di una mappa per accesso veloce ai prodotti
    const productDetails: { [key: number]: any } = {};
    
    // Ottieni tutti i prodotti in un'unica query usando sql.in
    const products = await db.execute(sql`
      SELECT * FROM portfolio_products 
      WHERE id IN (${sql.join(productIds, sql`, `)})
    `);
    
    // Popola la mappa per un accesso veloce
    for (const product of products) {
      if (product && typeof product.id === 'number') {
        productDetails[product.id] = product;
      }
    }
    
    // Calcolo del rischio medio ponderato
    let riskSum = 0;
    let riskCount = 0;
    
    // Calcolo dell'orizzonte temporale medio ponderato
    let horizonSum = 0;
    let horizonCount = 0;
    
    // Calcolo della distribuzione per asset class
    const assetDistribution: { [key: string]: number } = {};
    
    // Analisi di tutti i prodotti nel portafoglio
    for (const item of portfolioAllocation) {
      const product = productDetails[item.isinId];
      
      // Se il prodotto non esiste, salta
      if (!product) continue;
      
      const percentage = item.percentage / 100; // Converti in formato decimale (0-1)
      
      // Usa la categoria dal prodotto o dall'allocazione
      const category = product.category || item.category || 'other';
      
      // Aggiorna distribuzione asset class
      if (!assetDistribution[category]) {
        assetDistribution[category] = 0;
      }
      assetDistribution[category] += item.percentage;
      
      // Calcolo rischio medio
      if (product.sri_risk && !isNaN(Number(product.sri_risk))) {
        riskSum += Number(product.sri_risk) * percentage;
        riskCount += percentage;
      }
      
      // Calcolo orizzonte temporale medio
      if (product.recommended_holding_period) {
        // Converti il periodo di detenzione raccomandato in anni se è una stringa
        let horizonInYears: number | null = null;
        
        if (typeof product.recommended_holding_period === 'number') {
          horizonInYears = product.recommended_holding_period;
        } else {
          // Tentativo di estrazione di valore numerico da stringa
          const holdingPeriod = product.recommended_holding_period.toLowerCase();
          
          // Pattern per estrarre valori numerici
          const yearPattern = /(\d+)[\s-]*(?:year|yr|anno|anni)/i;
          const monthPattern = /(\d+)[\s-]*(?:month|mo|mese|mesi)/i;
          
          const yearMatch = holdingPeriod.match(yearPattern);
          const monthMatch = holdingPeriod.match(monthPattern);
          
          if (yearMatch) {
            horizonInYears = parseInt(yearMatch[1], 10);
          } else if (monthMatch) {
            horizonInYears = parseInt(monthMatch[1], 10) / 12;
          } else if (holdingPeriod.includes('short')) {
            horizonInYears = 2; // Default per short-term
          } else if (holdingPeriod.includes('medium')) {
            horizonInYears = 5; // Default per medium-term
          } else if (holdingPeriod.includes('long')) {
            horizonInYears = 10; // Default per long-term
          }
        }
        
        if (horizonInYears !== null) {
          horizonSum += horizonInYears * percentage;
          horizonCount += percentage;
        }
      }
    }
    
    // Calcola i valori finali
    result.averageRisk = riskCount > 0 ? riskSum / riskCount : 0;
    result.averageInvestmentHorizon = horizonCount > 0 ? horizonSum / horizonCount : null;
    result.assetClassDistribution = assetDistribution;
    
    return result;
  } catch (error) {
    console.error('Error calculating portfolio metrics:', error);
    // Restituisci valori di default in caso di errore
    return {
      averageRisk: 0,
      averageInvestmentHorizon: null,
      assetClassDistribution: {}
    };
  }
}

/**
 * Controller per la richiesta HTTP di generazione portafoglio
 */
export const createPortfolioWithAI = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato'
      });
    }

    const userId = req.user.id;
    const {
      portfolioDescription,
      clientProfile,
      riskLevel = 'balanced',
      investmentHorizon = 'medium_term',
      objectives = ['growth']
    } = req.body;

    // Valida i parametri richiesti
    if (!portfolioDescription || !clientProfile) {
      return res.status(400).json({
        success: false,
        message: 'I parametri portfolioDescription e clientProfile sono obbligatori'
      });
    }

    // Genera il portafoglio
    const result = await generateInvestmentPortfolio(
      userId,
      portfolioDescription,
      clientProfile,
      riskLevel,
      investmentHorizon,
      objectives
    );

    if (!result.success || !result.portfolio) {
      return res.status(500).json({
        success: false,
        message: 'Errore durante la generazione del portafoglio',
        error: result.error || 'Portafoglio non generato correttamente'
      });
    }

    // Opzionalmente, salva il portafoglio generato nel database
    // Questa logica può essere commentata se si vuole solo generare ma non salvare
    const generatedPortfolio = result.portfolio;
    
    // Salva il portafoglio nel database in una transazione
    const dbResult = await db.transaction(async (tx) => {
      // Crea il portfolio
      const [newPortfolio] = await tx.insert(modelPortfolios)
        .values({
          name: generatedPortfolio.name,
          description: generatedPortfolio.description,
          clientProfile: generatedPortfolio.clientProfile,
          riskLevel: generatedPortfolio.riskLevel,
          createdBy: userId
        })
        .returning();
      
      // Crea le allocazioni
      const allocationsData = generatedPortfolio.allocation.map(item => ({
        portfolioId: newPortfolio.id,
        productId: item.isinId,
        percentage: item.percentage.toString()
      }));
      
      const newAllocations = await tx.insert(portfolioAllocations)
        .values(allocationsData)
        .returning();
      
      return {
        portfolio: newPortfolio,
        allocations: newAllocations
      };
    });

    // Calcola le metriche del portafoglio
    const portfolioMetrics = await calculatePortfolioMetrics(
      generatedPortfolio.allocation.map(item => ({
        isinId: item.isinId,
        percentage: item.percentage,
        category: item.category
      }))
    );

    // Restituisci il portafoglio generato e i dettagli del database
    res.json({
      success: true,
      generatedPortfolio: result.portfolio,
      savedPortfolio: dbResult.portfolio,
      allocations: dbResult.allocations,
      portfolioMetrics
    });
  } catch (error) {
    console.error('Error in createPortfolioWithAI:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la generazione del portafoglio',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Endpoint per calcolare le metriche di un portafoglio esistente
 */
export const getPortfolioMetrics = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato'
      });
    }

    const portfolioId = parseInt(req.params.id);
    if (isNaN(portfolioId)) {
      return res.status(400).json({
        success: false,
        message: 'ID portafoglio non valido'
      });
    }

    // Ottieni l'allocazione del portafoglio
    const allocations = await db.select({
      productId: portfolioAllocations.productId,
      percentage: portfolioAllocations.percentage
    })
    .from(portfolioAllocations)
    .where(eq(portfolioAllocations.portfolioId, portfolioId));

    if (allocations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Portafoglio non trovato o senza allocazioni'
      });
    }

    // Converti l'allocazione nel formato richiesto e filtra eventuali null
    const portfolioAllocation = allocations
      .filter(alloc => alloc.productId !== null)
      .map(alloc => ({
        isinId: alloc.productId as number, // Type assertion
        percentage: parseFloat(alloc.percentage.toString())
      }));

    // Calcola le metriche
    const metrics = await calculatePortfolioMetrics(portfolioAllocation);

    res.json({
      success: true,
      portfolioId,
      metrics
    });
  } catch (error) {
    console.error('Error calculating portfolio metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel calcolo delle metriche del portafoglio',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Funzione utilizzabile come tool dall'agente AI
 * Questo formato è compatibile con gli strumenti dell'agente
 */
export async function generatePortfolioTool(params: {
  portfolioDescription: string;
  clientProfile: string;
  riskLevel?: string;
  investmentHorizon?: string;
  objectives?: string[];
  userId: number;
}) {
  try {
    const {
      portfolioDescription,
      clientProfile,
      riskLevel = 'balanced',
      investmentHorizon = 'medium_term',
      objectives = ['growth'],
      userId
    } = params;

    // Validazione parametri
    if (!portfolioDescription || !clientProfile) {
      return {
        success: false,
        message: 'I parametri portfolioDescription e clientProfile sono obbligatori'
      };
    }

    if (!userId) {
      return {
        success: false,
        message: 'Impossibile identificare l\'utente'
      };
    }

    // Genera il portafoglio
    const result = await generateInvestmentPortfolio(
      userId,
      portfolioDescription,
      clientProfile,
      riskLevel,
      investmentHorizon,
      objectives
    );

    // Se la generazione ha avuto successo, calcola anche le metriche
    if (result.success && result.portfolio) {
      const portfolioMetrics = await calculatePortfolioMetrics(
        result.portfolio.allocation.map(item => ({
          isinId: item.isinId,
          percentage: item.percentage,
          category: item.category
        }))
      );
      
      return {
        ...result,
        portfolioMetrics
      };
    }

    return result;
  } catch (error) {
    console.error('Error in generatePortfolioTool:', error);
    return {
      success: false,
      message: 'Errore durante la generazione del portafoglio',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 