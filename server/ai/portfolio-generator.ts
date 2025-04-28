/**
 * Portfolio Generator Service
 * 
 * Questo modulo fornisce un'interfaccia per generare portafogli di investimento utilizzando l'AI.
 * Utilizza OpenAI per creare portafogli ottimizzati in base al profilo del cliente e ai suoi obiettivi.
 */

import OpenAI from 'openai';
import { db } from '../db.js';
import { portfolioProducts, userProducts } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

// Controlla se esiste una chiave API OpenAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Interfaccia per il prodotto di portafoglio
interface PortfolioProduct {
  id: number;
  isin: string;
  name: string;
  category: string;
  description?: string;
  benchmark?: string;
  dividend_policy?: string;
  currency?: string;
  sri_risk?: number;
  entry_cost: string;
  exit_cost: string;
  ongoing_cost: string;
  transaction_cost?: string;
  performance_fee?: string;
  recommended_holding_period?: string;
  target_market?: string;
}

// Interfaccia per l'allocazione del portafoglio
interface PortfolioAllocation { // Campo legacy, mantenuto per compatibilità
  productId: number; // Campo principale da usare
  isin: string;
  name: string;
  category: string;
  percentage: number;
}

// Interfaccia per il risultato della generazione del portafoglio
export interface GeneratedPortfolio {
  name: string;
  description: string;
  clientProfile: string;
  riskLevel: string;
  investmentHorizon: string;
  allocation: PortfolioAllocation[];
  generationLogic: string;
  averageRisk: number;
  averageDuration: number | null;
  totalExpenseRatio: number;
  entryCost: number;
  exitCost: number;
  ongoingCost: number;
  transactionCost: number;
  assetAllocation: Array<{category: string, percentage: number}>; // Distribuzione per categorie di asset
}

/**
 * Genera un portafoglio di investimento utilizzando OpenAI
 * 
 * @param userId ID dell'utente per cui generare il portafoglio
 * @param portfolioDescription Descrizione del portafoglio da generare
 * @param clientProfile Profilo del cliente per cui è destinato il portafoglio
 * @param riskLevel Livello di rischio desiderato per il portafoglio
 * @param investmentHorizon Orizzonte temporale degli investimenti
 * @param objectives Obiettivi di investimento (array di stringhe)
 * @param productInstructions Istruzioni specifiche per i prodotti
 * @returns Portafoglio generato con allocazioni e logica di costruzione
 */
export async function generatePortfolio(
  userId: number,
  portfolioDescription: string,
  clientProfile: string,
  riskLevel: string = 'balanced',
  investmentHorizon: string = 'medium_term',
  objectives: string[] = ['growth'],
  productInstructions: string = ''
): Promise<GeneratedPortfolio> {
  // Verifica se la chiave API OpenAI è impostata
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  try {
    // Ottieni i prodotti disponibili per l'utente
    const userProductRows = await db.select({
      productId: userProducts.productId
    })
    .from(userProducts)
    .where(eq(userProducts.userId, userId));
    
    const userProductIds = userProductRows.map(row => row.productId);
    
    if (userProductIds.length === 0) {
      throw new Error("No products available for user portfolio");
    }
    
    // Ottieni dettagli completi dei prodotti
    const availableProducts: PortfolioProduct[] = [];
    
    for (const productId of userProductIds) {
      const productRows = await db.select()
        .from(portfolioProducts)
        .where(eq(portfolioProducts.id, productId));
      
      if (productRows.length > 0) {
        availableProducts.push(productRows[0] as unknown as PortfolioProduct);
      }
    }
    
    if (availableProducts.length === 0) {
      throw new Error("No products found for user portfolio");
    }

    // Crea un prompt dettagliato per OpenAI
    const prompt = createPortfolioPrompt(
      portfolioDescription,
      clientProfile,
      riskLevel,
      investmentHorizon,
      objectives,
      availableProducts,
      productInstructions
    );
    
    // Inizializza OpenAI
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY
    });
    
    // Chiama l'API OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1', // Utilizziamo GPT-4 per risultati migliori
      messages: [
        {
          role: 'system',
          content: `Sei un consulente finanziario esperto specializzato nella creazione di portafogli di investimento. 
                    Il tuo compito è creare un portafoglio diversificato ottimale utilizzando solo i prodotti disponibili per il cliente.
                    IMPORTANTE: Calcola TUTTI i valori ponderati per i pesi di allocazione, in particolare:
                    - Calcola il rischio medio ponderato basato sui valori sri_risk dei prodotti
                    - Calcola la duration media ponderata basata sui recommended_holding_period
                    - Calcola il Total Expense Ratio (TER) con la formula: (entry_cost + exit_cost) / holding_period + ongoing_cost + transaction_cost
                    Assicurati che il portafoglio sia coerente con il livello di rischio, l'orizzonte temporale e gli obiettivi specificati.
                    Devi fornire una risposta in formato JSON con le allocazioni percentuali e la logica di costruzione.
                    La risposta DEVE avere il seguente formato JSON:
                    {
                      "name": "Nome del portafoglio",
                      "description": "Breve descrizione del portafoglio",
                      "clientProfile": "Profilo cliente target",
                      "riskLevel": "Livello di rischio (1-7)",
                      "investmentHorizon": "Orizzonte temporale consigliato",
                      "allocation": [
                        {
                          "productId": 123,
                          "isin": "CODICE_ISIN",
                          "name": "Nome prodotto",
                          "category": "Categoria asset class",
                          "percentage": 20.5
                        },
                        // altri prodotti...
                      ],
                      "generationLogic": "Spiegazione dettagliata della logica di costruzione",
                      "averageRisk": 3.2,
                      "averageDuration": 4.5,
                      "totalExpenseRatio": 1.2,
                      "entryCost": 1.0,
                      "exitCost": 0.5,
                      "ongoingCost": 0.85,
                      "transactionCost": 0.15
                    }`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 3000
    });

    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in OpenAI response");
    }
    
    // Stampa la risposta raw di OpenAI
    console.log('\n==== RISPOSTA RAW OPENAI PER GENERAZIONE PORTFOLIO ====\n');
    console.log(content);
    console.log('\n================================================\n');
    
    // Estrai il JSON dalla risposta
    try {
      const portfolioData = JSON.parse(content);
      
      // Costruisci l'oggetto GeneratedPortfolio
      const result: GeneratedPortfolio = {
        name: portfolioData.name || `Portafoglio ${riskLevel} - ${investmentHorizon}`,
        description: portfolioData.description || portfolioDescription,
        clientProfile: portfolioData.clientProfile || clientProfile,
        riskLevel: portfolioData.riskLevel || riskLevel,
        investmentHorizon: portfolioData.investmentHorizon || investmentHorizon,
        allocation: portfolioData.allocation || [],
        generationLogic: portfolioData.generationLogic || "Portafoglio generato automaticamente",
        averageRisk: portfolioData.averageRisk || 0,
        averageDuration: portfolioData.averageDuration,
        totalExpenseRatio: portfolioData.totalExpenseRatio || 0,
        entryCost: portfolioData.entryCost || 0,
        exitCost: portfolioData.exitCost || 0,
        ongoingCost: portfolioData.ongoingCost || 0,
        transactionCost: portfolioData.transactionCost || 0,
        assetAllocation: portfolioData.assetAllocation || []
      };
      
      // Verifica che le percentuali sommino a 100%
      const totalPercentage = result.allocation.reduce((sum, item) => sum + item.percentage, 0);
      if (Math.abs(totalPercentage - 100) > 0.1) {
        // Normalizza le percentuali se necessario
        result.allocation.forEach(item => {
          item.percentage = (item.percentage / totalPercentage) * 100;
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error parsing OpenAI response:', error, content);
      throw new Error('Failed to parse OpenAI response');
    }
  } catch (error) {
    console.error('Error in generatePortfolio:', error);
    throw error;
  }
}

/**
 * Crea un prompt dettagliato per OpenAI per la generazione del portafoglio
 */
function createPortfolioPrompt(
  portfolioDescription: string,
  clientProfile: string,
  riskLevel: string,
  investmentHorizon: string,
  objectives: string[],
  availableProducts: PortfolioProduct[],
  productInstructions: string = ''
): string {
  // Mappa i livelli di rischio e orizzonti temporali a descrizioni più dettagliate
  const riskLevelMap: Record<string, string> = {
    'conservative': 'Basso rischio, focus su preservazione del capitale con crescita limitata',
    'moderate': 'Rischio moderato, bilanciamento tra crescita e preservazione',
    'balanced': 'Rischio medio, equilibrio tra crescita e sicurezza',
    'growth': 'Rischio medio-alto, focus sulla crescita con volatilità accettabile',
    'aggressive': 'Alto rischio, massima crescita con alta volatilità'
  };
  
  const investmentHorizonMap: Record<string, string> = {
    'short_term': 'Breve termine (1-3 anni)',
    'medium_term': 'Medio termine (3-7 anni)',
    'long_term': 'Lungo termine (7+ anni)'
  };
  
  // Mappa gli obiettivi a descrizioni più dettagliate
  const objectivesMap: Record<string, string> = {
    'growth': 'Crescita del capitale',
    'income': 'Generazione di reddito',
    'preservation': 'Preservazione del capitale',
    'tax_efficiency': 'Efficienza fiscale',
    'liquidity': 'Liquidità',
    'sustainability': 'Investimenti sostenibili/ESG'
  };

  // Formatta i prodotti disponibili per il prompt
  const formattedProducts = availableProducts.map(product => {
    return {
      id: product.id,
      isin: product.isin,
      name: product.name,
      category: product.category,
      description: product.description || 'Nessuna descrizione disponibile',
      benchmark: product.benchmark || null,
      dividend_policy: product.dividend_policy || null,
      currency: product.currency || null,
      sri_risk: product.sri_risk || null,
      entry_cost: product.entry_cost,
      exit_cost: product.exit_cost,
      ongoing_cost: product.ongoing_cost,
      recommended_holding_period: product.recommended_holding_period || null
    };
  });

  // Costruisci il prompt
  return `
# Richiesta di Generazione Portafoglio

## Descrizione Portafoglio
${portfolioDescription}

## Profilo Cliente
${clientProfile}

## Parametri di Investimento
- Livello di Rischio: ${riskLevelMap[riskLevel] || riskLevel}
- Orizzonte di Investimento: ${investmentHorizonMap[investmentHorizon] || investmentHorizon}
- Obiettivi di Investimento: ${objectives.map(obj => objectivesMap[obj] || obj).join(', ')}

## Prodotti Disponibili
${JSON.stringify(formattedProducts, null, 2)}

## Istruzioni
Crea un portafoglio di investimento diversificato utilizzando SOLO i prodotti elencati sopra.
- Assegna percentuali appropriate a ciascun prodotto selezionato
- La somma delle percentuali deve essere 100%
- Calcola il rischio medio del portafoglio (basato sui valori sri_risk dei prodotti)
- Calcola la duration media del portafoglio (basata su recommended_holding_period)
- Assicurati che il portafoglio sia coerente con il livello di rischio, l'orizzonte temporale e gli obiettivi specificati
- Fornisci una spiegazione dettagliata della logica di costruzione del portafoglio

## Formato Risposta
Restituisci un oggetto JSON con i seguenti campi:
- name: nome appropriato per il portafoglio
- description: descrizione del portafoglio basata sugli obiettivi e le caratteristiche
- clientProfile: sintesi del profilo cliente a cui è adatto questo portafoglio
- riskLevel: livello di rischio effettivo del portafoglio
- investmentHorizon: orizzonte di investimento consigliato
- allocation: array di oggetti con i campi productId, isin, name, category e percentage
- generationLogic: spiegazione dettagliata della logica di costruzione del portafoglio
- averageRisk: rischio medio ponderato del portafoglio (1-7 scala)
- averageDuration: duration media ponderata del portafoglio in anni (null se non disponibile)
`;
} 