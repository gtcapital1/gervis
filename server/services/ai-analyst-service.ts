/**
 * Servizio per l'analisi delle notizie finanziarie tramite AI
 * Questo modulo gestisce:
 * 1. Integrazione con OpenAI per analizzare le notizie
 * 2. Matching tra notizie e interessi dei clienti
 * 3. Generazione di email personalizzate
 */

import OpenAI from 'openai';
import { log } from '../vite';
import { FinancialNews } from './financial-news-service';
import { Client } from '../../shared/schema';

// Inizializzazione del client OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Definizione della struttura dei risultati di analisi
export interface NewsAnalysisResult {
  summary: string;
  keyTopics: string[];
  relevantInvestmentCategories: string[];
  marketImpact: 'positive' | 'negative' | 'neutral';
  confidenceScore: number; // 0-100
  actionRecommendation: string;
}

// Definizione della struttura dei consigli per i clienti
export interface ClientRecommendation {
  clientId: number;
  clientName: string;
  clientEmail: string;
  relevanceScore: number; // 0-100
  newsId: string;
  newsTitle: string;
  analysisResult: NewsAnalysisResult;
  emailContent: string;
}

/**
 * Analizza una notizia finanziaria per estrarne informazioni chiave
 */
export async function analyzeFinancialNews(news: FinancialNews): Promise<NewsAnalysisResult> {
  try {
    log(`Analisi della notizia: ${news.title}`, 'ai-analyst');
    
    const prompt = `
    Sei un consulente finanziario esperto. Analizza questa notizia finanziaria e fornisci informazioni strategiche:

    Titolo: ${news.title}
    Descrizione: ${news.description}
    Fonte: ${news.source}
    Data: ${news.publishedAt.toISOString()}
    URL: ${news.url}
    Contenuto: ${news.content || 'Non disponibile'}

    Fornisci la tua analisi in formato JSON con i seguenti campi:
    - summary: un riassunto conciso della notizia (max 150 parole)
    - keyTopics: un array di 3-5 parole chiave o argomenti principali
    - relevantInvestmentCategories: un array con le categorie di investimento più rilevanti tra queste opzioni: ["retirement", "wealth_growth", "income_generation", "capital_preservation", "estate_planning"]
    - marketImpact: l'impatto potenziale sul mercato ("positive", "negative", o "neutral")
    - confidenceScore: un punteggio di affidabilità dell'analisi da 0 a 100
    - actionRecommendation: un suggerimento concreto per un consulente finanziario (max 100 parole)
    
    Rispondi solo con il JSON, senza altri testi.
    `;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "Sei un analista finanziario esperto che fornisce analisi concise in formato JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2, // Valore basso per ottenere risposte più coerenti
      response_format: { type: "json_object" } // Forza l'output in formato JSON
    });
    
    const responseText = completion.choices[0].message.content || '{}';
    
    try {
      const result = JSON.parse(responseText) as NewsAnalysisResult;
      log(`Analisi completata per "${news.title}" con score di affidabilità ${result.confidenceScore}`, 'ai-analyst');
      return result;
    } catch (parseError) {
      log(`Errore di parsing JSON nella risposta di OpenAI: ${parseError}`, 'ai-analyst');
      return {
        summary: "Impossibile analizzare questa notizia",
        keyTopics: [],
        relevantInvestmentCategories: [],
        marketImpact: "neutral",
        confidenceScore: 0,
        actionRecommendation: "Non sono disponibili raccomandazioni"
      };
    }
  } catch (error) {
    log(`Errore nell'analisi AI della notizia: ${error}`, 'ai-analyst');
    return {
      summary: "Errore durante l'analisi della notizia",
      keyTopics: [],
      relevantInvestmentCategories: [],
      marketImpact: "neutral",
      confidenceScore: 0,
      actionRecommendation: "Si è verificato un errore durante l'analisi"
    };
  }
}

/**
 * Calcola un punteggio di rilevanza tra una notizia analizzata e un cliente
 * basato sui suoi interessi e profilo di investimento
 */
export function calculateRelevanceScore(analysis: NewsAnalysisResult, client: Client): number {
  // Recupera gli interessi del cliente (usa valori predefiniti se non definiti)
  const clientInterests = {
    retirement: client.retirementInterest || 0,
    wealthGrowth: client.wealthGrowthInterest || 0,
    incomeGeneration: client.incomeGenerationInterest || 0,
    capitalPreservation: client.capitalPreservationInterest || 0,
    estatePlanning: client.estatePlanningInterest || 0
  };
  
  // Mappa di conversione per le categorie
  const categoryMap: Record<string, keyof typeof clientInterests> = {
    'retirement': 'retirement',
    'wealth_growth': 'wealthGrowth',
    'income_generation': 'incomeGeneration',
    'capital_preservation': 'capitalPreservation',
    'estate_planning': 'estatePlanning'
  };
  
  // Calcola il punteggio base sulla corrispondenza degli interessi
  let score = 0;
  let matchedCategories = 0;
  
  analysis.relevantInvestmentCategories.forEach(category => {
    const clientCategory = categoryMap[category];
    if (clientCategory && clientInterests[clientCategory] > 0) {
      // Più alto è l'interesse del cliente in questa categoria, più alto è il punteggio
      score += clientInterests[clientCategory] * 10; // Scala 1-5 diventa 10-50 punti
      matchedCategories++;
    }
  });
  
  // Considera anche il punteggio di confidenza dell'analisi
  const confidenceMultiplier = analysis.confidenceScore / 100; // Valore tra 0 e 1
  score = score * confidenceMultiplier;
  
  // Adattamento del punteggio in base al profilo di rischio
  // Se l'impatto di mercato è negativo, potrebbe essere più rilevante per profili conservativi
  const riskBonus = analysis.marketImpact === 'negative' && 
                   (client.riskProfile === 'conservative' || client.riskProfile === 'moderate') ? 15 : 0;
  
  // Se l'impatto è positivo, potrebbe essere più rilevante per profili aggressivi
  const opportunityBonus = analysis.marketImpact === 'positive' && 
                          (client.riskProfile === 'aggressive' || client.riskProfile === 'growth') ? 15 : 0;
  
  score += riskBonus + opportunityBonus;
  
  // Se non ci sono categorie corrispondenti, il punteggio dovrebbe essere molto basso
  if (matchedCategories === 0) {
    score = Math.min(score, 20); // Limita il punteggio se non ci sono categorie corrispondenti
  }
  
  // Normalizza il punteggio finale su scala 0-100
  return Math.min(Math.max(Math.round(score), 0), 100);
}

/**
 * Genera una email personalizzata per un cliente in base all'analisi di una notizia
 */
export async function generatePersonalizedEmail(
  client: Client, 
  news: FinancialNews, 
  analysis: NewsAnalysisResult,
  advisorName: string,
  advisorEmail: string,
  advisorPhone?: string
): Promise<string> {
  try {
    const prompt = `
    Sei un consulente finanziario che comunica con i propri clienti. Scrivi un'email professionale ma cordiale al cliente ${client.firstName} ${client.lastName} riguardo a una notizia finanziaria rilevante. 
    
    Dettagli cliente:
    - Nome: ${client.firstName} ${client.lastName}
    - Profilo di rischio: ${client.riskProfile || 'non specificato'}
    - Orizzonte di investimento: ${client.investmentHorizon || 'non specificato'}
    - Esperienza di investimento: ${client.investmentExperience || 'non specificato'}
    - Obiettivi primari: ${client.investmentGoals?.join(', ') || 'non specificati'}
    
    Dettagli della notizia:
    - Titolo: ${news.title}
    - Fonte: ${news.source}
    - Link: ${news.url}
    
    Analisi della notizia:
    - Riassunto: ${analysis.summary}
    - Impatto di mercato: ${analysis.marketImpact}
    - Argomenti chiave: ${analysis.keyTopics.join(', ')}
    - Raccomandazione: ${analysis.actionRecommendation}
    
    L'email deve:
    1. Iniziare con un saluto formale
    2. Introdurre brevemente il motivo del contatto
    3. Descrivere la notizia e perché è rilevante specificamente per questo cliente e i suoi obiettivi di investimento
    4. Proporre concretamente di fissare una chiamata o un incontro per discutere di potenziali aggiustamenti alla strategia di investimento
    5. Includere i contatti (email: ${advisorEmail}, telefono: ${advisorPhone || 'da concordare'})
    6. Chiudere con una formula di cortesia e firma del consulente ${advisorName}
    
    L'email deve essere in lingua italiana, professionale ma amichevole, lunga circa 250-300 parole.
    Non includere "Oggetto:" nell'email, solo il corpo del messaggio.
    `;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "Sei un consulente finanziario professionale che scrive email personalizzate ai clienti." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7, // Valore più alto per email più naturali e variegate
    });
    
    const emailContent = completion.choices[0].message.content || '';
    return emailContent;
  } catch (error) {
    log(`Errore nella generazione dell'email: ${error}`, 'ai-analyst');
    return `
    Gentile ${client.firstName} ${client.lastName},
    
    Ho notato una notizia finanziaria che potrebbe essere di suo interesse riguardo a ${news.title}.
    
    Mi piacerebbe discuterne insieme per valutare eventuali implicazioni per la sua strategia di investimento.
    
    Mi contatti pure all'indirizzo ${advisorEmail} o al numero ${advisorPhone || 'da concordare'} per fissare un appuntamento.
    
    Cordiali saluti,
    ${advisorName}
    `;
  }
}

/**
 * Trova i clienti più rilevanti per una specifica notizia finanziaria
 */
export async function findRelevantClientsForNews(
  news: FinancialNews, 
  clients: Client[], 
  advisorName: string,
  advisorEmail: string,
  advisorPhone?: string,
  minimumRelevanceScore: number = 50 // Punteggio minimo di rilevanza (0-100)
): Promise<ClientRecommendation[]> {
  try {
    // Analizza la notizia
    const analysis = await analyzeFinancialNews(news);
    
    // Calcola il punteggio di rilevanza per ogni cliente
    const clientScores = clients.map(client => {
      const relevanceScore = calculateRelevanceScore(analysis, client);
      return { client, relevanceScore };
    });
    
    // Filtra per punteggio minimo e ordina per rilevanza decrescente
    const relevantClients = clientScores
      .filter(item => item.relevanceScore >= minimumRelevanceScore)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Genera email personalizzate per i clienti rilevanti
    const recommendations = await Promise.all(
      relevantClients.map(async ({ client, relevanceScore }) => {
        const emailContent = await generatePersonalizedEmail(
          client, 
          news, 
          analysis, 
          advisorName, 
          advisorEmail, 
          advisorPhone
        );
        
        return {
          clientId: client.id,
          clientName: `${client.firstName} ${client.lastName}`,
          clientEmail: client.email,
          relevanceScore,
          newsId: news.id,
          newsTitle: news.title,
          analysisResult: analysis,
          emailContent
        };
      })
    );
    
    return recommendations;
  } catch (error) {
    log(`Errore nel trovare clienti rilevanti per la notizia: ${error}`, 'ai-analyst');
    return [];
  }
}