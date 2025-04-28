import { db } from '../db.js';
import { eq, desc, and } from 'drizzle-orm.js';
import { modelPortfolios, portfolioAllocations } from '../../shared/schema.js';

// Interfacce per i dati
interface Instrument {
  name: string;
  isin?: string;
  percentage: number;
  entry_cost?: number;
  exit_cost?: number;
  ongoing_cost?: number;
  transaction_cost?: number;
  performance_fee?: number;
}

interface AssetAllocation {
  category: string;
  percentage: number;
  instruments?: Instrument[];
  risk_level?: number;
  recommended_period?: number;
  expected_return?: number;
  productId?: number; // ID del prodotto nel database
}

interface PortfolioData {
  name: string;
  description?: string;
  construction_logic?: string;
  entry_cost?: number;
  exit_cost?: number;
  ongoing_cost?: number;
  transaction_cost?: number;
  performance_fee?: number;
  target_return?: number;
  risk_level?: number;
  recommended_period?: number;
  client_profile?: string;
  allocations: AssetAllocation[];
}

// Funzioni di calcolo
/**
 * Calcola i costi ponderati per un portafoglio
 * @param portfolio Dati del portafoglio
 * @returns Oggetto con i costi ponderati
 */
export function calculateWeightedCosts(portfolio: PortfolioData) {
  // Se non ci sono allocazioni, usa i valori predefiniti
  if (!portfolio.allocations || portfolio.allocations.length === 0) {
    return {
      entry_cost: portfolio.entry_cost || 0,
      exit_cost: portfolio.exit_cost || 0,
      ongoing_cost: portfolio.ongoing_cost || 0,
      transaction_cost: portfolio.transaction_cost || 0,
      performance_fee: portfolio.performance_fee || 0
    };
  }

  // Inizializza i costi ponderati
  let weightedEntryCost = 0;
  let weightedExitCost = 0;
  let weightedOngoingCost = 0;
  let weightedTransactionCost = 0;
  let weightedPerformanceFee = 0;

  // Calcolo a livello di categorie di asset
  portfolio.allocations.forEach(allocation => {
    const weight = allocation.percentage / 100;

    // Se ci sono strumenti specifici, calcola i costi a livello di strumento
    if (allocation.instruments && allocation.instruments.length > 0) {
      // Calcola i costi a livello di strumento
      let categoryEntryCost = 0;
      let categoryExitCost = 0;
      let categoryOngoingCost = 0;
      let categoryTransactionCost = 0;
      let categoryPerformanceFee = 0;

      allocation.instruments.forEach(instrument => {
        const instrumentWeight = (instrument.percentage / 100) * weight;
        categoryEntryCost += (instrument.entry_cost || portfolio.entry_cost || 0) * instrumentWeight;
        categoryExitCost += (instrument.exit_cost || portfolio.exit_cost || 0) * instrumentWeight;
        categoryOngoingCost += (instrument.ongoing_cost || portfolio.ongoing_cost || 0) * instrumentWeight;
        categoryTransactionCost += (instrument.transaction_cost || portfolio.transaction_cost || 0) * instrumentWeight;
        categoryPerformanceFee += (instrument.performance_fee || portfolio.performance_fee || 0) * instrumentWeight;
      });

      weightedEntryCost += categoryEntryCost;
      weightedExitCost += categoryExitCost;
      weightedOngoingCost += categoryOngoingCost;
      weightedTransactionCost += categoryTransactionCost;
      weightedPerformanceFee += categoryPerformanceFee;
    } else {
      // Usa i costi a livello di portafoglio per questa categoria
      weightedEntryCost += (portfolio.entry_cost || 0) * weight;
      weightedExitCost += (portfolio.exit_cost || 0) * weight;
      weightedOngoingCost += (portfolio.ongoing_cost || 0) * weight;
      weightedTransactionCost += (portfolio.transaction_cost || 0) * weight;
      weightedPerformanceFee += (portfolio.performance_fee || 0) * weight;
    }
  });

  return {
    entry_cost: weightedEntryCost,
    exit_cost: weightedExitCost,
    ongoing_cost: weightedOngoingCost,
    transaction_cost: weightedTransactionCost,
    performance_fee: weightedPerformanceFee
  };
}

/**
 * Calcola il costo totale annuo ponderato
 * @param portfolio Dati del portafoglio
 * @returns Costo totale annuo ponderato
 */
export function calculateTotalAnnualCost(portfolio: PortfolioData) {
  const costs = calculateWeightedCosts(portfolio);
  const holdingPeriod = portfolio.recommended_period || 5;
  
  // Formula: (costi di entrata + costi di uscita) / periodo + costi ongoing + costi di transazione
  return ((costs.entry_cost + costs.exit_cost) / holdingPeriod) + costs.ongoing_cost + costs.transaction_cost;
}

/**
 * Calcola il rischio medio ponderato del portafoglio
 * @param portfolio Dati del portafoglio
 * @returns Rischio medio ponderato
 */
export function calculateWeightedRisk(portfolio: PortfolioData) {
  if (!portfolio.allocations || portfolio.allocations.length === 0) {
    return portfolio.risk_level || 3;
  }

  let weightedRisk = 0;
  let totalWeight = 0;

  portfolio.allocations.forEach(allocation => {
    const weight = allocation.percentage / 100;
    totalWeight += weight;
    weightedRisk += (allocation.risk_level || portfolio.risk_level || 3) * weight;
  });

  return totalWeight > 0 ? weightedRisk / totalWeight : (portfolio.risk_level || 3);
}

/**
 * Calcola l'orizzonte temporale medio ponderato
 * @param portfolio Dati del portafoglio
 * @returns Orizzonte temporale medio ponderato
 */
export function calculateWeightedTimePeriod(portfolio: PortfolioData) {
  if (!portfolio.allocations || portfolio.allocations.length === 0) {
    return portfolio.recommended_period || 5;
  }

  let weightedPeriod = 0;
  let totalWeight = 0;

  portfolio.allocations.forEach(allocation => {
    const weight = allocation.percentage / 100;
    totalWeight += weight;
    weightedPeriod += (allocation.recommended_period || portfolio.recommended_period || 5) * weight;
  });

  return totalWeight > 0 ? weightedPeriod / totalWeight : (portfolio.recommended_period || 5);
}

/**
 * Calcola la distribuzione per asset class
 * @param portfolio Dati del portafoglio
 * @returns Oggetto con la distribuzione per asset class
 */
export function calculateAssetClassDistribution(portfolio: PortfolioData) {
  if (!portfolio.allocations || portfolio.allocations.length === 0) {
    return {};
  }

  const distribution: Record<string, number> = {};
  
  // Raggruppa per categoria e calcola le percentuali
  portfolio.allocations.forEach(allocation => {
    const category = allocation.category;
    distribution[category] = (distribution[category] || 0) + allocation.percentage;
  });
  
  return distribution;
}

/**
 * Salva un portafoglio modello nel database
 * @param portfolioData Dati del portafoglio
 * @param userId ID dell'utente
 * @returns ID del portafoglio salvato
 */
export async function saveModelPortfolio(portfolioData: PortfolioData, userId: number) {
  // Calcola i costi ponderati
  const weightedCosts = calculateWeightedCosts(portfolioData);
  
  // Calcola il rischio medio ponderato
  const weightedRisk = calculateWeightedRisk(portfolioData);
  
  // Calcola l'orizzonte temporale medio ponderato
  const weightedPeriod = calculateWeightedTimePeriod(portfolioData);
  
  // Calcola il costo totale annuo
  const totalAnnualCost = calculateTotalAnnualCost(portfolioData);
  
  // Calcola la distribuzione per asset class
  const assetClassDistribution = calculateAssetClassDistribution(portfolioData);
  
  try {
    console.log("Portfolio data for saving:", {
      name: portfolioData.name,
      description: portfolioData.description || '',
      clientProfile: portfolioData.client_profile || '',
      riskLevel: portfolioData.risk_level?.toString() || '3',
      costs: {
        entry: weightedCosts.entry_cost,
        exit: weightedCosts.exit_cost,
        ongoing: weightedCosts.ongoing_cost,
        transaction: weightedCosts.transaction_cost,
        performance: weightedCosts.performance_fee,
      },
      allocations: portfolioData.allocations?.length || 0
    });
    
    // Ensure numeric values are properly formatted as strings to avoid type issues
    // Usa Drizzle ORM per inserire il portafoglio
    const newPortfolio = await db.insert(modelPortfolios).values({
      createdBy: userId,
      name: portfolioData.name,
      description: portfolioData.description || '',
      clientProfile: portfolioData.client_profile || '',
      riskLevel: portfolioData.risk_level?.toString() || '3',
      constructionLogic: portfolioData.construction_logic || null,
      entryCost: weightedCosts.entry_cost.toString(),
      exitCost: weightedCosts.exit_cost.toString(),
      ongoingCost: weightedCosts.ongoing_cost.toString(),
      transactionCost: weightedCosts.transaction_cost.toString(),
      performanceFee: weightedCosts.performance_fee.toString(),
      totalAnnualCost: totalAnnualCost.toString(),
      averageRisk: weightedRisk.toString(),
      averageTimeHorizon: weightedPeriod.toString(),
      assetClassDistribution: assetClassDistribution,
    }).returning();

    if (!newPortfolio || newPortfolio.length === 0) {
      throw new Error("Failed to create portfolio - no data returned");
    }
    
    const portfolioId = newPortfolio[0].id;
    console.log(`Created portfolio with ID: ${portfolioId}`);
    
    // Inserisci le allocazioni
    if (portfolioData.allocations && portfolioData.allocations.length > 0) {
      for (const allocation of portfolioData.allocations) {
        if (!allocation.productId) {
          console.error("Missing productId in allocation", allocation);
          continue; // Skip allocations without productId
        }
        
        try {
          const newAllocation = await db.insert(portfolioAllocations).values({
            portfolioId: portfolioId,
            productId: allocation.productId,
            percentage: allocation.percentage.toString(),
          }).returning();
          
          console.log(`Created allocation with ID: ${newAllocation[0]?.id || 'unknown'}`);
        } catch (allocError) {
          console.error("Error inserting allocation:", allocError);
        }
      }
    }
    
    return {
      id: portfolioId,
      totalAnnualCost
    };
  } catch (error) {
    console.error('Error saving portfolio:', error);
    throw error;
  }
}

/**
 * Ottiene un portafoglio modello per ID
 * @param portfolioId ID del portafoglio
 * @returns Dati del portafoglio
 */
export async function getModelPortfolio(portfolioId: number) {
  // Ottieni il portafoglio usando Drizzle ORM
  const portfolio = await db.select().from(modelPortfolios)
    .where(eq(modelPortfolios.id, portfolioId))
    .limit(1);
    
  if (!portfolio || portfolio.length === 0) {
    throw new Error('Portfolio not found');
  }
  
  // Ottieni le allocazioni
  const allocations = await db.select()
    .from(portfolioAllocations)
    .where(eq(portfolioAllocations.portfolioId, portfolioId));
    
  // Aggiungi le allocazioni al portafoglio
  return {
    ...portfolio[0],
    allocations
  };
}

/**
 * Ottiene tutti i portafogli modello di un utente
 * @param userId ID dell'utente
 * @returns Lista dei portafogli
 */
export async function getUserModelPortfolios(userId: number) {
  return db.select()
    .from(modelPortfolios)
    .where(eq(modelPortfolios.createdBy, userId))
    .orderBy(desc(modelPortfolios.createdAt));
}

/**
 * Elimina un portafoglio modello
 * @param portfolioId ID del portafoglio
 * @param userId ID dell'utente
 * @returns true se eliminato con successo
 */
export async function deleteModelPortfolio(portfolioId: number, userId: number) {
  const result = await db.delete(modelPortfolios)
    .where(
      and(
        eq(modelPortfolios.id, portfolioId),
        eq(modelPortfolios.createdBy, userId)
      )
    );
  
  // In Drizzle the delete operation returns affected rows directly
  return result !== undefined && Array.isArray(result) && result.length > 0;
} 