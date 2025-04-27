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
import { eq, inArray } from 'drizzle-orm';
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
  totalExpenseRatio: number; // TER = (entryFee + exitFee) / periodo + ongoing + transaction
  entryCost: number; // Costo medio di entrata
  exitCost: number; // Costo medio di uscita
  ongoingCost: number; // Costo ongoing
  transactionCost: number; // Costo di transazione
  productDetails: {
    name: string;
    category: string;
    percentage: number;
    risk: number | null;
    horizon: number | null;
    entryCost: number;
    exitCost: number;
    ongoingCost: number;
    transactionCost: number;
  }[];
  riskCalculation: {
    weight: number;
    risk: number;
    contribution: number;
  }[];
  horizonCalculation: {
    weight: number;
    horizon: number;
    contribution: number;
  }[];
  costCalculation: {
    weight: number;
    entry: number;
    exit: number;
    ongoing: number;
    transaction: number;
  }[];
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
  objectives: string[] = ['growth'],
  productInstructions?: string
) {
  try {
    // Genera il portafoglio utilizzando l'AI
    const generatedPortfolio = await generatePortfolio(
      userId,
      portfolioDescription,
      clientProfile,
      riskLevel,
      investmentHorizon,
      objectives,
      productInstructions
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
 * - TER (Total Expense Ratio)
 * 
 * @param portfolioAllocation L'allocazione del portafoglio con i dettagli dei prodotti
 * @returns Oggetto con i risultati dell'analisi
 */
export async function calculatePortfolioMetrics(
  portfolioAllocation: Array<{
    productId: number;
    percentage: number;
    category?: string; // Categoria opzionale direttamente nell'allocazione
  }>
): Promise<PortfolioAnalysisResult> {
  try {
    // Inizializza il risultato
    const result: PortfolioAnalysisResult = {
      averageRisk: 0,
      averageInvestmentHorizon: null,
      assetClassDistribution: {},
      totalExpenseRatio: 0,
      entryCost: 0,
      exitCost: 0,
      ongoingCost: 0,
      transactionCost: 0,
      productDetails: [],
      riskCalculation: [],
      horizonCalculation: [],
      costCalculation: []
    };
    
    // Se l'allocazione è vuota, restituisci i valori di default
    if (!portfolioAllocation.length) {
      return result;
    }
    
    // Ottieni tutti i dettagli dei prodotti
    const productIds = portfolioAllocation.map(item => item.productId);
    
    // Creazione di una mappa per accesso veloce ai prodotti
    const productDetails: { [key: number]: any } = {};
    
    // Ottieni tutti i prodotti usando l'API tipizzata di Drizzle
    const products = await db
      .select()
      .from(portfolioProducts)
      .where(inArray(portfolioProducts.id, productIds));
    
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
    
    // Calcoli per costi
    let entrySum = 0;
    let exitSum = 0;
    let ongoingSum = 0;
    let transactionSum = 0;
    let costCount = 0;
    
    // Calcolo della distribuzione per asset class
    const assetDistribution: { [key: string]: number } = {};
    
    // Analisi di tutti i prodotti nel portafoglio
    for (const item of portfolioAllocation) {
      const product = productDetails[item.productId];
      
      // Se il prodotto non esiste, salta
      if (!product) continue;
      
      const percentage = item.percentage / 100; // Converti in formato decimale (0-1)
      
      // Aggiungi dettagli del prodotto per i log
      result.productDetails.push({
        name: product.name || 'Prodotto sconosciuto',
        category: product.category || item.category || 'other',
        percentage: item.percentage,
        risk: product.sri_risk || null,
        horizon: product.recommended_holding_period ? 
          (typeof product.recommended_holding_period === 'number' ? 
            product.recommended_holding_period : 
            parseFloat(product.recommended_holding_period) || null) : 
          null,
        entryCost: product.entry_cost ? 
          (typeof product.entry_cost === 'number' ? 
            product.entry_cost : 
            parseFloat(product.entry_cost.replace(/[%\s]/g, '')) / 100 || 0) : 
          0,
        exitCost: product.exit_cost ? 
          (typeof product.exit_cost === 'number' ? 
            product.exit_cost : 
            parseFloat(product.exit_cost.replace(/[%\s]/g, '')) / 100 || 0) : 
          0,
        ongoingCost: product.ongoing_cost ? 
          (typeof product.ongoing_cost === 'number' ? 
            product.ongoing_cost : 
            parseFloat(product.ongoing_cost.replace(/[%\s]/g, '')) / 100 || 0) : 
          0,
        transactionCost: product.transaction_cost ? 
          (typeof product.transaction_cost === 'number' ? 
            product.transaction_cost : 
            parseFloat(product.transaction_cost?.replace(/[%\s]/g, '') || '0') / 100 || 0) : 
          0
      });
      
      // Usa la categoria dal prodotto o dall'allocazione
      const category = product.category || item.category || 'other';
      
      // Aggiorna distribuzione asset class
      if (!assetDistribution[category]) {
        assetDistribution[category] = 0;
      }
      assetDistribution[category] += item.percentage;
      
      // Calcolo rischio medio
      if (product.sri_risk && !isNaN(Number(product.sri_risk))) {
        const productRisk = Number(product.sri_risk);
        riskSum += productRisk * percentage;
        riskCount += percentage;
        
        // Aggiungi dettagli del calcolo del rischio
        result.riskCalculation.push({
          weight: percentage,
          risk: productRisk,
          contribution: productRisk * percentage
        });
      }
      
      // Calcolo ongoing_cost (spese correnti)
      if (product.ongoing_cost) {
        let ongoingCostValue = 0;
        
        // Converti ongoing_cost in numero se è una stringa
        if (typeof product.ongoing_cost === 'string') {
          // Se contiene il simbolo %, rimuovilo e dividi per 100
          if (product.ongoing_cost.includes('%')) {
            const cleanedValue = product.ongoing_cost.replace(/[%\s]/g, '');
            ongoingCostValue = parseFloat(cleanedValue) / 100;
          } else {
            // Altrimenti è già un numero decimale (es. "0.45")
            ongoingCostValue = parseFloat(product.ongoing_cost);
          }
        } else if (typeof product.ongoing_cost === 'number') {
          ongoingCostValue = product.ongoing_cost;
        }
        
        // Log per debug
        console.log(`Parsing ongoing_cost for ${product.name}: Original value=${product.ongoing_cost}, Parsed value=${ongoingCostValue}`);
        
        if (!isNaN(ongoingCostValue)) {
          ongoingSum += ongoingCostValue * percentage;
          costCount += percentage;
          
          // Aggiungi dettagli del calcolo del costo
          result.costCalculation.push({
            weight: percentage,
            entry: 0,
            exit: 0,
            ongoing: ongoingCostValue,
            transaction: 0
          });
        }
      }
      
      // Calcolo costi di entrata
      if (product.entry_cost) {
        let entryCostValue = 0;
        
        if (typeof product.entry_cost === 'string') {
          // Se contiene il simbolo %, rimuovilo e dividi per 100
          if (product.entry_cost.includes('%')) {
            const cleanedValue = product.entry_cost.replace(/[%\s]/g, '');
            entryCostValue = parseFloat(cleanedValue) / 100;
          } else {
            // Altrimenti è già un numero decimale (es. "2.00")
            entryCostValue = parseFloat(product.entry_cost);
          }
        } else if (typeof product.entry_cost === 'number') {
          entryCostValue = product.entry_cost;
        }
        
        // Log per debug
        console.log(`Parsing entry_cost for ${product.name}: Original value=${product.entry_cost}, Parsed value=${entryCostValue}`);
        
        if (!isNaN(entryCostValue)) {
          entrySum += entryCostValue * percentage;
          costCount += percentage;
          
          // Aggiungi dettagli del calcolo del costo
          result.costCalculation.push({
            weight: percentage,
            entry: entryCostValue,
            exit: 0,
            ongoing: 0,
            transaction: 0
          });
        }
      }
      
      // Calcolo costi di uscita
      if (product.exit_cost) {
        let exitCostValue = 0;
        
        if (typeof product.exit_cost === 'string') {
          // Se contiene il simbolo %, rimuovilo e dividi per 100
          if (product.exit_cost.includes('%')) {
            const cleanedValue = product.exit_cost.replace(/[%\s]/g, '');
            exitCostValue = parseFloat(cleanedValue) / 100;
          } else {
            // Altrimenti è già un numero decimale (es. "1.00")
            exitCostValue = parseFloat(product.exit_cost);
          }
        } else if (typeof product.exit_cost === 'number') {
          exitCostValue = product.exit_cost;
        }
        
        if (!isNaN(exitCostValue)) {
          exitSum += exitCostValue * percentage;
          costCount += percentage;
          
          // Aggiungi dettagli del calcolo del costo
          result.costCalculation.push({
            weight: percentage,
            entry: 0,
            exit: exitCostValue,
            ongoing: 0,
            transaction: 0
          });
        }
      }
      
      // Calcolo costi di transazione
      if (product.transaction_cost) {
        let transactionCostValue = 0;
        
        if (typeof product.transaction_cost === 'string') {
          // Se contiene il simbolo %, rimuovilo e dividi per 100
          if (product.transaction_cost.includes('%')) {
            const cleanedValue = product.transaction_cost.replace(/[%\s]/g, '');
            transactionCostValue = parseFloat(cleanedValue) / 100;
          } else {
            // Altrimenti è già un numero decimale (es. "0.10")
            transactionCostValue = parseFloat(product.transaction_cost);
          }
        } else if (typeof product.transaction_cost === 'number') {
          transactionCostValue = product.transaction_cost;
        }
        
        if (!isNaN(transactionCostValue)) {
          transactionSum += transactionCostValue * percentage;
          costCount += percentage;
          
          // Aggiungi dettagli del calcolo del costo
          result.costCalculation.push({
            weight: percentage,
            entry: 0,
            exit: 0,
            ongoing: 0,
            transaction: transactionCostValue
          });
        }
      }
      
      // Calcolo orizzonte temporale medio
      if (product.recommended_holding_period) {
        // Converti il periodo di detenzione raccomandato in anni se è una stringa
        let horizonInYears: number | null = null;
        
        if (typeof product.recommended_holding_period === 'number') {
          horizonInYears = product.recommended_holding_period;
        } else if (typeof product.recommended_holding_period === 'string') {
          // Se è un numero semplice come "3" o "5", convertilo direttamente
          if (/^\d+$/.test(product.recommended_holding_period.trim())) {
            horizonInYears = parseInt(product.recommended_holding_period.trim(), 10);
          } else if (/^\d+\.?\d*$/.test(product.recommended_holding_period.trim())) {
            // Se è un numero decimale come "5.5", convertilo direttamente
            horizonInYears = parseFloat(product.recommended_holding_period.trim());
          } else {
            // Altrimenti tenta di estrarre valori numerici da formato testuale
            const holdingPeriod = product.recommended_holding_period.toLowerCase();
            
            // Pattern per estrarre valori numerici
            const yearPattern = /(\d+(?:\.\d+)?)[\s-]*(?:year|yr|anno|anni)/i;
            const monthPattern = /(\d+(?:\.\d+)?)[\s-]*(?:month|mo|mese|mesi)/i;
            
            const yearMatch = holdingPeriod.match(yearPattern);
            const monthMatch = holdingPeriod.match(monthPattern);
            
            if (yearMatch) {
              horizonInYears = parseFloat(yearMatch[1]);
            } else if (monthMatch) {
              horizonInYears = parseFloat(monthMatch[1]) / 12;
            } else if (holdingPeriod.includes('short')) {
              horizonInYears = 2; // Default per short-term
            } else if (holdingPeriod.includes('medium')) {
              horizonInYears = 5; // Default per medium-term
            } else if (holdingPeriod.includes('long')) {
              horizonInYears = 10; // Default per long-term
            }
          }
        }
        
        // Log per debug
        console.log(`Parsing recommended_holding_period for ${product.name}: Original value=${product.recommended_holding_period}, Parsed value=${horizonInYears}`);
        
        if (horizonInYears !== null) {
          horizonSum += horizonInYears * percentage;
          horizonCount += percentage;
          
          // Aggiungi dettagli del calcolo dell'orizzonte
          result.horizonCalculation.push({
            weight: percentage,
            horizon: horizonInYears,
            contribution: horizonInYears * percentage
          });
        }
      }
    }
    
    // Calcola i valori finali
    result.averageRisk = riskCount > 0 ? riskSum / riskCount : 7;
    result.averageInvestmentHorizon = horizonCount > 0 ? horizonSum / horizonCount : 10;
    result.assetClassDistribution = assetDistribution;
    
    // Calcolo costi separati
    result.entryCost = costCount > 0 ? entrySum / costCount : 0;
    result.exitCost = costCount > 0 ? exitSum / costCount : 0;
    result.ongoingCost = costCount > 0 ? ongoingSum / costCount : 0;
    result.transactionCost = costCount > 0 ? transactionSum / costCount : 0;
    
    // Calcolo TER (Total Expense Ratio) con la formula corretta
    // Formula: (costi entrata + costi uscita) / periodo + ongoing + transazione
    const defaultHoldingPeriod = 10; // 10 anni di default se non specificato
    const holdingPeriod = result.averageInvestmentHorizon || defaultHoldingPeriod;
    
    result.totalExpenseRatio = (result.entryCost + result.exitCost) / holdingPeriod + 
                               result.ongoingCost + result.transactionCost;
    
    // Log dettagliato dei calcoli alla fine
    console.log('\n----- CALCOLI DEL PORTAFOGLIO -----');
    console.log(`Dati raccolti per ${portfolioAllocation.length} prodotti`);
    console.log(`Rischio: ${riskCount > 0 ? (riskSum / riskCount).toFixed(2) : 'N/A'} (basato su ${riskCount * 100}% dei dati)`);
    console.log(`Orizzonte: ${horizonCount > 0 ? (horizonSum / horizonCount).toFixed(2) : 'N/A'} anni (basato su ${horizonCount * 100}% dei dati)`);
    console.log(`Costo entrata: ${costCount > 0 ? (entrySum / costCount).toFixed(4) : 'N/A'} (${entrySum.toFixed(4)}/${costCount.toFixed(2)})`);
    console.log(`Costo uscita: ${costCount > 0 ? (exitSum / costCount).toFixed(4) : 'N/A'} (${exitSum.toFixed(4)}/${costCount.toFixed(2)})`);
    console.log(`Costo ongoing: ${costCount > 0 ? (ongoingSum / costCount).toFixed(4) : 'N/A'} (${ongoingSum.toFixed(4)}/${costCount.toFixed(2)})`);
    console.log(`Costo transazione: ${costCount > 0 ? (transactionSum / costCount).toFixed(4) : 'N/A'} (${transactionSum.toFixed(4)}/${costCount.toFixed(2)})`);

    // Log della distribuzione per asset class
    console.log('\n----- DISTRIBUZIONE ASSET CLASS -----');
    let assetClassStr = '';
    const assetClassCategories = Object.keys(result.assetClassDistribution);
    for (let i = 0; i < assetClassCategories.length; i++) {
      const category = assetClassCategories[i];
      const percentage = result.assetClassDistribution[category];
      if (i > 0) assetClassStr += ', ';
      assetClassStr += `${category}: ${percentage.toFixed(1)}%`;
    }
    console.log(`- assetClassDistribution: ${assetClassStr}`);
    
    return result;
  } catch (error) {
    console.error('Error calculating portfolio metrics:', error);
    // Restituisci valori di default in caso di errore
    return {
      averageRisk: 0,
      averageInvestmentHorizon: null,
      assetClassDistribution: {},
      totalExpenseRatio: 0,
      entryCost: 0,
      exitCost: 0,
      ongoingCost: 0,
      transactionCost: 0,
      productDetails: [],
      riskCalculation: [],
      horizonCalculation: [],
      costCalculation: []
    };
  }
}

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
        productId: alloc.productId as number, // Type assertion
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

    // 1. Recupera tutti i prodotti disponibili dal database
    console.log("Recupero prodotti dal database per includerli nel prompt...");
    const availableProducts = await db
      .select()
      .from(portfolioProducts)
      .orderBy(portfolioProducts.name);
    
    console.log(`Trovati ${availableProducts.length} prodotti da includere nel prompt.`);
    
    // 2. Formatta i prodotti per il prompt
    const productContext = availableProducts.map(p => 
      `ID: ${p.id}, ISIN: ${p.isin || 'N/A'}, Nome: ${p.name}, Categoria: ${p.category || 'Non specificata'}`
    ).join('\n');
    
    // 3. Crea un messaggio per OpenAI che richiede esplicitamente di restituire i productId
    const productInstructions = `
    IMPORTANTE: Per ogni prodotto nell'allocazione, DEVI includere il campo 'productId' con l'ID numerico esatto del prodotto.
    
    USA ESCLUSIVAMENTE questi prodotti per l'allocazione:
    ${productContext}
    
    Ogni elemento dell'allocazione DEVE includere:
    1. 'productId' - l'ID numerico esatto del prodotto dalla lista fornita
    2. 'percentage' - la percentuale allocata a questo prodotto (come numero)
    3. 'name' - il nome del prodotto
    4. 'category' - la categoria del prodotto
    `;

    // Genera il portafoglio passando i dati dei prodotti
    const result = await generateInvestmentPortfolio(
      userId,
      portfolioDescription,
      clientProfile,
      riskLevel,
      investmentHorizon,
      objectives,
      productInstructions // Passa il contesto dei prodotti
    );

    // Se la generazione ha avuto successo, calcola anche le metriche
    if (result.success && result.portfolio) {
      const portfolioMetrics = await calculatePortfolioMetrics(
        result.portfolio.allocation.map(item => ({
          productId: item.productId,
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

    // 1. Recupera tutti i prodotti disponibili dal database
    console.log("Recupero prodotti dal database per includerli nel prompt...");
    const availableProducts = await db
      .select()
      .from(portfolioProducts)
      .orderBy(portfolioProducts.name);
    
    console.log(`Trovati ${availableProducts.length} prodotti da includere nel prompt.`);
    
    // 2. Formatta i prodotti per il prompt
    const productContext = availableProducts.map(p => 
      `ID: ${p.id}, ISIN: ${p.isin || 'N/A'}, Nome: ${p.name}, Categoria: ${p.category || 'Non specificata'}`
    ).join('\n');
    
    // 3. Crea un messaggio per OpenAI che richiede esplicitamente di restituire i productId
    const productInstructions = `
    IMPORTANTE: Per ogni prodotto nell'allocazione, DEVI includere il campo 'productId' con l'ID numerico esatto del prodotto.
    
    USA ESCLUSIVAMENTE questi prodotti per l'allocazione:
    ${productContext}
    
    Ogni elemento dell'allocazione DEVE includere:
    1. 'productId' - l'ID numerico esatto del prodotto dalla lista fornita
    2. 'percentage' - la percentuale allocata a questo prodotto (come numero)
    3. 'name' - il nome del prodotto
    4. 'category' - la categoria del prodotto
    `;

    // Genera il portafoglio
    const result = await generateInvestmentPortfolio(
      userId,
      portfolioDescription,
      clientProfile,
      riskLevel,
      investmentHorizon,
      objectives,
      productInstructions
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
        productId: item.productId,
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
        productId: item.productId,
        percentage: item.percentage,
        category: item.category
      }))
    );

    // Debug: confronto tra valori OpenAI e calcolati
    console.log('\n==== DEBUG - CONFRONTO VALORI PORTFOLIO ====');
    
    // Informazioni sui prodotti
    const productIds = generatedPortfolio.allocation.map(item => item.productId);
    const products = await db
      .select()
      .from(portfolioProducts)
      .where(inArray(portfolioProducts.id, productIds));
    
    console.log(`\n----- DETTAGLI PRODOTTI E ALLOCAZIONE -----`);
    console.log(`- Prodotti totali nella tabella DB: ${await db.select({count: sql`count(*)`}).from(portfolioProducts).then(result => result[0].count)}`);
    console.log(`- Prodotti richiesti nell'allocazione: ${generatedPortfolio.allocation.length}`);
    console.log(`- Prodotti trovati nel DB: ${products.length} su ${productIds.length} richiesti`);
    console.log(`- IDs dei prodotti non trovati: ${productIds.filter(id => !products.some(p => p.id === id)).join(', ') || 'Nessuno'}`);
    
    console.log('\n----- VALORI ORIGINALI OPENAI -----');
    console.log(`- averageRisk: ${generatedPortfolio.averageRisk}`);
    console.log(`- averageDuration: ${generatedPortfolio.averageDuration}`);
    console.log(`- totalExpenseRatio: ${generatedPortfolio.totalExpenseRatio}`);
    console.log(`- entryCost: ${generatedPortfolio.entryCost}`);
    console.log(`- exitCost: ${generatedPortfolio.exitCost}`);
    console.log(`- ongoingCost: ${generatedPortfolio.ongoingCost}`);
    console.log(`- transactionCost: ${generatedPortfolio.transactionCost}`);
    
    console.log('\n----- VALORI CALCOLATI SUI PRODOTTI REALI -----');
    console.log(`- averageRisk: ${portfolioMetrics.averageRisk.toFixed(1)} (calcolato come Σ[peso_i * rischio_i])`);
    console.log(`- averageInvestmentHorizon: ${portfolioMetrics.averageInvestmentHorizon ? 
        portfolioMetrics.averageInvestmentHorizon.toFixed(1) + ' anni' : 'N/A'} (calcolato come Σ[peso_i * orizzonte_i])`);
    
    // Calcolo dettagliato del TER
    console.log('\n----- CALCOLO DETTAGLIATO DEL TER -----');
    const holdingPeriod = portfolioMetrics.averageInvestmentHorizon || 10;
    console.log(`- Formula TER: (entryCost + exitCost) / holdingPeriod + ongoingCost + transactionCost`);
    console.log(`- entryCost: ${portfolioMetrics.entryCost.toFixed(4)}`);
    console.log(`- exitCost: ${portfolioMetrics.exitCost.toFixed(4)}`);
    console.log(`- ongoingCost: ${portfolioMetrics.ongoingCost.toFixed(4)}`);
    console.log(`- transactionCost: ${portfolioMetrics.transactionCost.toFixed(4)}`);
    console.log(`- holdingPeriod: ${holdingPeriod.toFixed(1)} anni`);
    console.log(`- Calcolo: (${portfolioMetrics.entryCost.toFixed(4)} + ${portfolioMetrics.exitCost.toFixed(4)}) / ${holdingPeriod.toFixed(1)} + ${portfolioMetrics.ongoingCost.toFixed(4)} + ${portfolioMetrics.transactionCost.toFixed(4)}`);
    console.log(`- totalExpenseRatio: ${portfolioMetrics.totalExpenseRatio.toFixed(4)}`);
    
    // Dettaglio dei prodotti utilizzati
    console.log('\n----- DETTAGLIO DEI PRODOTTI UTILIZZATI -----');
    for (let i = 0; i < portfolioMetrics.productDetails.length; i++) {
      const item = portfolioMetrics.productDetails[i];
      console.log(`  Prodotto ${i + 1} (${item.percentage.toFixed(2)}%): 
        Nome: ${item.name}, 
        Categoria: ${item.category}, 
        Rischio: ${item.risk !== null ? item.risk.toFixed(1) : 'N/A'}, 
        Orizzonte: ${item.horizon !== null ? item.horizon.toFixed(1) + ' anni' : 'N/A'}, 
        Entrata=${(item.entryCost * 100).toFixed(2)}%, 
        Uscita=${(item.exitCost * 100).toFixed(2)}%, 
        Ongoing=${(item.ongoingCost * 100).toFixed(2)}%, 
        Transazioni=${(item.transactionCost * 100).toFixed(2)}%`);
    }
    
    console.log('\n----- DISTRIBUZIONE ASSET CLASS -----');
    let assetClassStr = '';
    const assetClassCategories = Object.keys(portfolioMetrics.assetClassDistribution);
    for (let i = 0; i < assetClassCategories.length; i++) {
      const category = assetClassCategories[i];
      const percentage = portfolioMetrics.assetClassDistribution[category];
      if (i > 0) assetClassStr += ', ';
      assetClassStr += `${category}: ${percentage.toFixed(1)}%`;
    }
    console.log(`- assetClassDistribution: ${assetClassStr}`);
    
    // Sostituisci completamente i valori di OpenAI con quelli calcolati
    generatedPortfolio.averageRisk = portfolioMetrics.averageRisk;
    generatedPortfolio.averageDuration = portfolioMetrics.averageInvestmentHorizon;
    generatedPortfolio.totalExpenseRatio = portfolioMetrics.totalExpenseRatio;
    generatedPortfolio.entryCost = portfolioMetrics.entryCost;
    generatedPortfolio.exitCost = portfolioMetrics.exitCost;
    generatedPortfolio.ongoingCost = portfolioMetrics.ongoingCost;
    generatedPortfolio.transactionCost = portfolioMetrics.transactionCost;
    
    // Convert assetClassDistribution to array format
    generatedPortfolio.assetAllocation = [];
    const categories = Object.keys(portfolioMetrics.assetClassDistribution);
    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];
      const percentage = portfolioMetrics.assetClassDistribution[category];
      generatedPortfolio.assetAllocation.push({
        category,
        percentage
      });
    }

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