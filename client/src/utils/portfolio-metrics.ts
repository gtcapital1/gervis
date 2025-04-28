/**
 * Utility per il calcolo delle metriche di portafoglio
 * 
 * Implementa funzioni per calcolare:
 * - TER (Total Expense Ratio) medio ponderato
 * - SRI (Synthetic Risk Indicator) medio ponderato
 * - Orizzonte temporale consigliato per il portafoglio
 */

export interface AssetMetrics {
  id: number;
  value: number;
  category?: string;
  description?: string;
  isin?: string;
  productName?: string;
  // Costi
  entryFee?: number;   // Commissioni di ingresso (%)
  exitFee?: number;    // Commissioni di uscita (%)
  ongoingCharge?: number; // Spese correnti (%)
  transactionCost?: number; // Costi di transazione (%)
  recommendedHoldingPeriod?: number; // Periodo di detenzione consigliato (anni)
  // Rischio
  sri?: number; // Indicatore sintetico di rischio (1-7)
  // Orizzonte temporale - Non più utilizzato, usiamo recommended_holding_period
  horizon?: string; 
}

/**
 * Calcola il TER medio ponderato del portafoglio
 * Formula: TER = (entry + exit)/holding_period + ongoing + transaction
 * dove ogni componente è la media pesata dei valori dei singoli asset
 */
export function calculatePortfolioTER(assets: AssetMetrics[]): number | null {
  if (!assets || assets.length === 0) return null;
  
  let totalValue = 0;
  let weightedEntryFee = 0;
  let weightedExitFee = 0;
  let weightedOngoingCharge = 0;
  let weightedTransactionCost = 0;
  let weightedHoldingPeriod = 0;
  
  // Somma ponderata delle componenti di costo
  assets.forEach(asset => {
    const value = asset.value || 0;
    if (value <= 0) return;
    
    totalValue += value;
    
    // Applica pesi in base al valore dell'asset
    weightedEntryFee += (asset.entryFee || 0) * value;
    weightedExitFee += (asset.exitFee || 0) * value;
    weightedOngoingCharge += (asset.ongoingCharge || 0) * value;
    weightedTransactionCost += (asset.transactionCost || 0) * value;
    
    // Per il periodo di detenzione, usiamo l'inverso per la media armonica
    // (per evitare che periodi molto lunghi abbiano un impatto ridotto)
    if (asset.recommendedHoldingPeriod && asset.recommendedHoldingPeriod > 0) {
      weightedHoldingPeriod += value / asset.recommendedHoldingPeriod;
    }
  });
  
  if (totalValue === 0) return null;
  
  // Calcola le medie ponderate
  const avgEntryFee = weightedEntryFee / totalValue;
  const avgExitFee = weightedExitFee / totalValue;
  const avgOngoingCharge = weightedOngoingCharge / totalValue;
  const avgTransactionCost = weightedTransactionCost / totalValue;
  
  // Per il periodo di detenzione, calcoliamo la media armonica ponderata
  let avgHoldingPeriod = 5; // Default: 5 anni
  if (weightedHoldingPeriod > 0) {
    avgHoldingPeriod = totalValue / weightedHoldingPeriod;
  }
  
  // Formula completa per il TER
  const ter = (avgEntryFee + avgExitFee) / avgHoldingPeriod + avgOngoingCharge + avgTransactionCost;
  
  return ter;
}

/**
 * Calcola l'indicatore di rischio sintetico (SRI) medio ponderato del portafoglio
 * La media viene arrotondata all'intero più vicino per rispettare la scala SRI (1-7)
 */
export function calculatePortfolioSRI(assets: AssetMetrics[]): number | null {
  if (!assets || assets.length === 0) return null;
  
  let totalValue = 0;
  let weightedSRI = 0;
  let validAssetCount = 0;
  
  assets.forEach(asset => {
    const value = asset.value || 0;
    if (value <= 0 || !asset.sri) return;
    
    totalValue += value;
    weightedSRI += asset.sri * value;
    validAssetCount++;
  });
  
  if (validAssetCount === 0 || totalValue === 0) return null;
  
  // Calcola la media ponderata e arrotonda all'intero più vicino
  const avgSRI = Math.round(weightedSRI / totalValue);
  
  // Assicurati che il risultato sia nell'intervallo 1-7
  return Math.max(1, Math.min(7, avgSRI));
}

/**
 * Determina l'orizzonte temporale medio ponderato del portafoglio in anni
 * utilizzando direttamente i valori numerici da recommendedHoldingPeriod
 */
export function calculatePortfolioHorizon(assets: AssetMetrics[]): number | null {
  if (!assets || assets.length === 0) return null;
  
  let totalValue = 0;
  let weightedHoldingPeriod = 0;
  let validAssetCount = 0;
  
  assets.forEach(asset => {
    const value = asset.value || 0;
    if (value <= 0 || !asset.recommendedHoldingPeriod) return;
    
    totalValue += value;
    weightedHoldingPeriod += asset.recommendedHoldingPeriod * value;
    validAssetCount++;
  });
  
  if (validAssetCount === 0 || totalValue === 0) return null;
  
  // Calcola e restituisce direttamente la media ponderata dei periodi di detenzione in anni
  return weightedHoldingPeriod / totalValue;
}

/**
 * Calcola tutte le metriche di portafoglio insieme
 */
export function calculateAllPortfolioMetrics(assets: AssetMetrics[]) {
  return {
    ter: calculatePortfolioTER(assets),
    sri: calculatePortfolioSRI(assets),
    horizon: calculatePortfolioHorizon(assets)
  };
} 