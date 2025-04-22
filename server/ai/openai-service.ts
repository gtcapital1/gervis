/**
 * OpenAI Service
 * 
 * Questo modulo fornisce un'interfaccia per interagire con l'API di OpenAI.
 * Utilizzato per generare il profilo arricchito del cliente basato su dati esistenti.
 */

import { Client, ClientLog, MifidType } from '@shared/schema';
import OpenAI from 'openai';
import fetch from 'node-fetch';

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

/**
 * Genera un profilo client arricchito utilizzando OpenAI
 * Utilizza esclusivamente il nuovo formato completo da getCompleteClientData
 * @param client Il cliente per cui generare il profilo
 * @param completeClientData L'oggetto completo restituito da getCompleteClientData
 * @returns Profilo arricchito con approfondimenti e suggerimenti
 */
export async function generateClientProfile(
  client: Client, 
  completeClientData: any
): Promise<AiClientProfile> {
  // Verifica se la chiave API OpenAI è impostata
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  try {
    // Crea un prompt utilizzando i dati completi del cliente
    const prompt = createClientProfileFromComplete(client, completeClientData);
    
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

/**
 * Crea un prompt dettagliato per GPT-4 utilizzando i dati completi del cliente da getCompleteClientData
 */
function createClientProfileFromComplete(client: Client, completeClientData: any): string {
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
  
  const clientData = completeClientData.clientData;
  if (!clientData) {
    throw new Error("Invalid complete client data format");
  }
  
  // Estrai i dati personali
  const personalInfo = clientData.personalInformation?.data || {};
  // Estrai i dati finanziari
  const financialInfo = clientData.financialOverview?.data || {};
  // Estrai i dati del profilo di investimento
  const investmentProfile = clientData.investmentProfile?.data || {};
  // Estrai gli asset
  const assets = clientData.assetDetails?.data || [];
  // Estrai le attività recenti
  const recentActivities = clientData.recentActivities?.data || [];
  
  // Costruisci il prompt con i dati estratti
  let prompt = `
# Profilo Cliente
- Nome: ${formatValue(personalInfo.firstName?.value)} ${formatValue(personalInfo.lastName?.value)}
- Email: ${formatValue(personalInfo.email?.value)}
- Data di nascita: ${formatValue(personalInfo.birthDate?.value)}
- Telefono: ${formatValue(personalInfo.phone?.value)}
- Indirizzo: ${formatValue(personalInfo.address?.value)}
- Segmento cliente: ${formatValue(personalInfo.clientSegment?.value)}

# Informazioni Finanziarie
- Patrimonio netto: ${formatValue(financialInfo.netWorth?.value, 'money')}
- Asset totali: ${formatValue(financialInfo.totalAssets?.value, 'money')}
- Reddito annuale: ${formatValue(financialInfo.annualIncome?.value, 'money')}
- Spese mensili: ${formatValue(financialInfo.monthlyExpenses?.value, 'money')}
- Debiti: ${formatValue(financialInfo.debts?.value, 'money')}

# Profilo di Investimento
- Profilo di rischio: ${formatValue(investmentProfile.riskProfile?.value)}
- Orizzonte temporale: ${formatValue(investmentProfile.investmentHorizon?.value)}
- Esperienza di investimento: ${formatValue(investmentProfile.investmentExperience?.value)}
- Obiettivi di investimento: ${formatValue(investmentProfile.investmentGoals?.value)}

# Interessi Specifici (da 1 a 5 dove 1 è massimo interesse)
- Pensione: ${formatValue(investmentProfile.retirementInterest?.value)}
- Crescita del patrimonio: ${formatValue(investmentProfile.wealthGrowthInterest?.value)}
- Generazione di reddito: ${formatValue(investmentProfile.incomeGenerationInterest?.value)}
- Preservazione del capitale: ${formatValue(investmentProfile.capitalPreservationInterest?.value)}
- Pianificazione patrimoniale: ${formatValue(investmentProfile.estatePlanningInterest?.value)}

# Tolleranza al Rischio
- Reazione al calo del portafoglio: ${formatValue(investmentProfile.portfolioDropReaction?.value)}
- Tolleranza alla volatilità: ${formatValue(investmentProfile.volatilityTolerance?.value)}
`;

  // Aggiungi asset
  if (assets && assets.length > 0) {
    prompt += "\n# Asset Attuali\n";
    assets.forEach((asset: any) => {
      prompt += `- ${formatValue(asset.category?.value)}: ${formatValue(asset.value?.value, 'money')}${asset.description?.value ? ` (${asset.description.value})` : ''}\n`;
    });
  }

  // Aggiungi la cronologia delle interazioni
  if (recentActivities && recentActivities.length > 0) {
    prompt += "\n# Cronologia Interazioni\n";
    recentActivities.forEach((log: any, index: number) => {
      prompt += `\n## Interazione ${index + 1} (${log.type?.value}) - ${log.date?.value ? new Date(log.date.value).toLocaleDateString() : 'Data non specificata'}\n`;
      prompt += `Titolo: ${formatValue(log.title?.value)}\n`;
      prompt += `Contenuto: ${formatValue(log.content?.value)}\n`;
    });
  }

  return prompt;
}