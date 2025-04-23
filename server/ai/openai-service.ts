/**
 * OpenAI Service
 * 
 * Questo modulo fornisce un'interfaccia per interagire con l'API di OpenAI.
 * Utilizzato per generare il profilo arricchito del cliente basato su dati esistenti.
 */

import { Client, ClientLog } from '@shared/schema';
import OpenAI from 'openai';
import fetch from 'node-fetch';
import { storage } from '../storage';

// Controlla se esiste una chiave API OpenAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Istruzioni di sistema per l'AI
const SYSTEM_INSTRUCTIONS = `Sei un esperto consulente finanziario. Analizza i dati del cliente e genera un profilo sintetico e opportunità di business concrete.

Rispondi in italiano, in formato JSON con due campi principali:
- "profiloCliente": un oggetto con un campo "descrizione" contenente un riassunto completo del profilo del cliente
- "opportunitaBusiness": un array di opportunità di business rilevabili

Il profiloCliente deve avere:
- descrizione: un unico paragrafo descrittivo che sintetizzi le caratteristiche rilevanti del cliente, includendo profilo di rischio, obiettivi, comportamento decisionale e conoscenze finanziarie

Ogni opportunità di business deve contenere:
- titolo: nome chiaro dell'opportunità
- descrizione: spiegazione dettagliata che motiva l'opportunità
- azioni: array di 2-3 azioni concrete e specifiche che il consulente può intraprendere
- priorita: numero da 1 a 5 dove:
  1 = MASSIMA priorità (opportunità molto tangibile e urgente, da eseguire immediatamente)
  2 = Alta priorità (opportunità concreta con buon potenziale immediato)
  3 = Media priorità (opportunità valida ma non urgente)
  4 = Bassa priorità (opportunità da valutare in futuro)
  5 = Minima priorità (opportunità da tenere in considerazione ma non immediata)
- email: oggetto contenente:
  - oggetto: oggetto dell'email personalizzato e accattivante
  - corpo: testo dell'email personalizzato che segue questa struttura:
    1. Saluto cordiale con nome del cliente
    2. Presentazione chiara e diretta dell'opportunità
    3. Motivazione specifica per il cliente
    4. Richiesta di incontro/chiamata
    5. Saluti cordiali (senza firma)

IMPORTANTE per la generazione delle opportunità:
- PRIVILEGIA opportunità di business TANGIBILI e CONCRETE che possano generare investimenti immediati
- Assegna priorità 1 o 2 SOLO a opportunità veramente concrete e urgenti
- Focalizzati su opportunità di INVESTIMENTO e su nuovi prodotti o servizi finanziari adatti al cliente
- Evita di menzionare debito, entrate o uscite a meno che non siano STRETTAMENTE rilevanti
- Concentrati su opportunità che generano valore per il cliente e commissioni per il consulente

Le email devono:
- Essere COMPLETAMENTE PERSONALIZZATE per ogni opportunità
- Avere corretti spazi tra paragrafi
- Fare riferimento specifico all'opportunità e alle caratteristiche del cliente
- Mantenere un tono professionale ma cordiale
- Essere concise e orientate ai risultati
- Includere dettagli specifici del cliente
- Essere pronte all'uso

Le interazioni del cliente sono ordinate dalla più recente alla meno recente. Quando trovi informazioni contrastanti, dai priorità alle informazioni più recenti.`;

interface ProfileItem {
  title: string;
  description: string;
  actions?: string[]; // Azioni specifiche che il consulente può intraprendere
}

// Nuova interfaccia per il profilo cliente arricchito
interface ClienteProfilo {
  descrizione: string;  // Campo unico con riassunto completo
}

// Nuova interfaccia per opportunità di business
interface OpportunitaBusiness {
  titolo: string;
  descrizione: string;
  azioni: string[];
  priorita: number;  // Da 1 a 5, dove 1 è massima priorità
  email?: {
    oggetto: string;
    corpo: string;
  };
}

/**
 * Interfaccia per il profilo arricchito del cliente
 */
export interface AiClientProfile {
  clientId: number;
  clientName: string;
  // Nuovo formato con profilo cliente e opportunità
  profiloCliente?: ClienteProfilo;
  opportunitaBusiness?: OpportunitaBusiness[];
  lastUpdated?: string;
}

// Interfaccia per i dati MIFID
export interface MifidType {
  id?: number;
  clientId?: number;
  riskProfile?: string;
  investmentHorizon?: string;
  investmentExperience?: string;
  yearsOfExperience?: number;
  investmentFrequency?: string;
  advisorUsage?: string;
  monitoringTime?: string;
  pastInvestmentExperience?: string[] | string;
  financialEducation?: string[] | string;
  portfolioDropReaction?: string;
  volatilityTolerance?: string;
  retirementInterest?: number;
  wealthGrowthInterest?: number;
  incomeGenerationInterest?: number;
  capitalPreservationInterest?: number;
  estatePlanningInterest?: number;
  annualIncome?: number;
  monthlyExpenses?: number;
  debts?: number;
  dependents?: number;
  employmentStatus?: string;
  birthDate?: string;
  educationLevel?: string;
  assets?: Array<{category: string, value: number, description?: string}>;
}

/**
 * Crea un prompt dettagliato per GPT-4 utilizzando i dati del cliente e i log
 */
function createClientProfilePrompt(client: Client, mifid: MifidType | null, logs: ClientLog[]): string {
  // Funzione helper per controllare e formattare i valori
  const formatValue = (value: any, type = 'string') => {
    if (value === null || value === undefined || value === '') {
      return "Non specificato";
    }
    
    if (type === 'money' && typeof value === 'number') {
      return `€${value.toLocaleString()}`;
    }
    
    return value;
  };

  // Formatta i dati del cliente in un prompt strutturato
  let prompt = `
# Profilo Cliente
- Nome: ${formatValue(client.name)}
- Email: ${formatValue(client.email)}
${mifid ? `
- Profilo di rischio: ${formatValue(mifid.riskProfile)}
- Reddito annuale: ${formatValue(mifid.annualIncome, 'money')}
- Spese mensili: ${formatValue(mifid.monthlyExpenses, 'money')}
- Debiti: ${formatValue(mifid.debts, 'money')}
- Dipendenti: ${formatValue(mifid.dependents)}
- Stato occupazione: ${formatValue(mifid.employmentStatus)}
- Data di nascita: ${formatValue(mifid.birthDate)}
- Livello di istruzione: ${formatValue(mifid.educationLevel)}

## Profilo di Investimento
- Orizzonte temporale: ${formatValue(mifid.investmentHorizon)}
- Esperienza di investimento: ${formatValue(mifid.investmentExperience)}
- Anni di esperienza: ${formatValue(mifid.yearsOfExperience)}
- Frequenza di investimento: ${formatValue(mifid.investmentFrequency)}
- Utilizzo consulente: ${formatValue(mifid.advisorUsage)}
- Tempo dedicato al monitoraggio: ${formatValue(mifid.monitoringTime)}

## Esperienza Passata e Formazione
- Esperienze di investimento passate: ${formatValue(Array.isArray(mifid.pastInvestmentExperience) ? mifid.pastInvestmentExperience.join(', ') : mifid.pastInvestmentExperience)}
- Educazione finanziaria: ${formatValue(Array.isArray(mifid.financialEducation) ? mifid.financialEducation.join(', ') : mifid.financialEducation)}

## Tolleranza al Rischio
- Reazione al calo del portafoglio: ${formatValue(mifid.portfolioDropReaction)}
- Tolleranza alla volatilità: ${formatValue(mifid.volatilityTolerance)}

## Interessi Specifici (da 1 a 5 dove 1 è massimo interesse)
- Pensione: ${formatValue(mifid.retirementInterest)}
- Crescita del patrimonio: ${formatValue(mifid.wealthGrowthInterest)}
- Generazione di reddito: ${formatValue(mifid.incomeGenerationInterest)}
- Preservazione del capitale: ${formatValue(mifid.capitalPreservationInterest)}
- Pianificazione patrimoniale: ${formatValue(mifid.estatePlanningInterest)}

## Asset Attuali
${mifid.assets && Array.isArray(mifid.assets) ? mifid.assets.map(asset => 
  `- ${asset.category}: ${formatValue(asset.value, 'money')}${asset.description ? ` (${asset.description})` : ''}`
).join('\n') : 'Nessun asset registrato'}
` : ''}`;

  // Aggiungi la cronologia delle interazioni se disponibile
  if (logs && logs.length > 0) {
    prompt += "\n# Cronologia Interazioni\n";
    logs.forEach((log, index) => {
      prompt += `\n## Interazione ${index + 1} (${log.type}) - ${new Date(log.logDate).toLocaleDateString()}\n`;
      prompt += `Titolo: ${log.title}\n`;
      prompt += `Contenuto: ${log.content}\n`;
    });
  }

  return prompt;
}

/**
 * Genera un profilo client arricchito utilizzando OpenAI
 * @param client Il cliente per cui generare il profilo
 * @param mifid Il profilo di rischio del cliente
 * @param logs I log delle interazioni con il cliente
 * @returns Profilo arricchito con approfondimenti e suggerimenti
 */
export async function generateClientProfile(
  client: Client, 
  mifid: MifidType | null,
  logs: ClientLog[]
): Promise<AiClientProfile> {
  // Verifica se la chiave API OpenAI è impostata
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  try {
    // Crea un prompt dettagliato per GPT-4 utilizzando i dati del cliente e i log
    const prompt = createClientProfilePrompt(client, mifid, logs);
    
    // Crea un'istanza OpenAI
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY
    });
    
    // Chiama l'API OpenAI usando la nuova sintassi
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1', // Utilizziamo GPT-4 per risultati migliori
      messages: [
        {
          role: 'system',
          content: SYSTEM_INSTRUCTIONS
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3, // Bassa temperatura per risultati più prevedibili
      max_tokens: 2500 // Aumentato limite per contenere anche le email
    });

    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in OpenAI response");
    }
    
    // Estrai il JSON dalla risposta (potrebbe essere avvolto in backtick o solo testo)
    let parsedData: any;
    try {
      // Prima prova a estrarre il JSON se è avvolto in backtick
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      
      if (jsonMatch && jsonMatch[1]) {
        parsedData = JSON.parse(jsonMatch[1]);
      } else {
        // Altrimenti prova a parsare l'intero contenuto come JSON
        parsedData = JSON.parse(content);
      }
      
      // Ordina le opportunità per priorità
      if (parsedData.opportunitaBusiness) {
        parsedData.opportunitaBusiness.sort((a: OpportunitaBusiness, b: OpportunitaBusiness) => 
          (a.priorita || 5) - (b.priorita || 5)
        );
      }
      
      // Costruisci l'oggetto AiClientProfile
      const result: AiClientProfile = {
        clientId: client.id,
        clientName: `${client.firstName} ${client.lastName}`,
        profiloCliente: parsedData.profiloCliente as ClienteProfilo || undefined,
        opportunitaBusiness: parsedData.opportunitaBusiness as OpportunitaBusiness[] || [],
        lastUpdated: new Date().toISOString()
      };
      
      return result;
    } catch (error) {
      // Se non riesci a parsare il JSON, lancia un errore
      console.error('Error parsing OpenAI response:', error, content);
      throw new Error('Failed to parse OpenAI response');
    }
  } catch (error) {
    console.error('Error in generateClientProfile:', error);
    throw error;
  }
}