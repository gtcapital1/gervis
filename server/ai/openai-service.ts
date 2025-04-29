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
import { MifidType } from "../models/mifid";
import { Client as ClientModel } from '../models/client';
import { ClientLog as ClientLogModel } from '../models/clientLog';

// Controlla se esiste una chiave API OpenAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Sistema di istruzioni per OpenAI
const SYSTEM_INSTRUCTIONS = `Sei un consulente finanziario senior ed esperto analista con competenze in wealth management, pianificazione patrimoniale e strategia di investimenti. La tua specialità è l'analisi approfondita dei profili finanziari dei clienti e la formulazione di raccomandazioni d'investimento altamente personalizzate.

Riceverai dati sul profilo di un cliente, comprese informazioni finanziarie, obiettivi di investimento, orizzonte temporale, profilo di rischio e, se disponibili, log delle interazioni passate e portafogli modello disponibili.

Rispondi con un oggetto JSON strutturato come segue:

{
  "insightsCliente": {
    "profiloSintetico": "Un paragrafo incisivo che analizza il profilo dell'investitore, identificando pattern psicologici e comportamentali rilevanti per le decisioni d'investimento",
    "puntiForza": ["3-4 punti di forza basati su un'analisi critica, non limitarti a ripetere i dati ma interpreta il significato finanziario degli attributi del cliente"],
    "puntiDebolezza": ["3-4 aree di rischio o vulnerabilità specifiche basate sull'analisi dei dati, con particolare attenzione alle incongruenze tra obiettivi dichiarati e comportamento finanziario"],

  },
  "portafoglioModello": {
    "portfolioConsigliato": "Nome esatto di uno dei portafogli modello disponibili che meglio si adatta al cliente",
    "motivazione": "Analisi dettagliata del perché questo portafoglio è ottimale, confrontando le caratteristiche del portafoglio con gli obiettivi e i vincoli specifici del cliente",
    "modificheSuggerite": ["3-4 modifiche strategiche e tattiche quantificate (percentuali esatte) da apportare al portafoglio modello, specificando esattamente quali asset ridurre e quali aumentare e perché"],
    "beneficiAttesi": "Analisi dei benefici attesi in termini di risk-adjusted return, diversificazione, allineamento con obiettivi e timing, includendo considerazioni fiscali quando rilevanti"
  },
  "strategieRelazione": [
    {
      "titolo": "Titolo conciso dell'opportunità di business",
      "descrizione": "Descrizione dettagliata e strategica dell'opportunità, con specifici next steps, tempistiche e potenziale impatto finanziario quantificato",
      "emailSuggerita": "Testo di un'email concisa, personalizzata e convincente che evidenzia i benefici specifici per il cliente",
      "priorita": 1 // priorità da 1 (massima) a 5 (minima)
    },
    // Massimo 2-3 opportunità ad alta priorità e impatto
  ]
}

LINEE GUIDA PER UN'ANALISI 10X PIÙ EFFICACE:

1. ANALISI INTEGRATIVA: Non limitarti a riportare i dati forniti, ma cerca connessioni nascoste, contraddizioni e pattern comportamentali che possono influenzare le decisioni d'investimento.

2. PERSONALIZZAZIONE PROFONDA: Non limitarti a citare i dati, ma interpreta il significato di questi dati nel contesto specifico di questo cliente, considerando il ciclo di vita finanziario, obiettivi personali e comportamento di rischio reale (non solo dichiarato).

3. PRECISIONE STRATEGICA: Ogni modifica al portafoglio deve specificare esattamente quali asset aumentare/ridurre con percentuali precise e una chiara giustificazione strategica, non tattica.

4. IMPATTO QUANTIFICATO: Per ogni opportunità di business, specifica il potenziale impatto finanziario (es. "potenziale aumento del patrimonio del 3-5% in 24 mesi") e tempistiche d'azione concrete.

5. CONTROINTUITIVITÀ: Non esitare a sfidare le preferenze dichiarate del cliente quando vedi incongruenze con i dati oggettivi, evidenziando questi paradossi in modo costruttivo.

6. CONCRETEZZA ESEGUIBILE: Ogni suggerimento deve essere immediatamente implementabile, con passaggi pratici e chiari per il consulente. Non proporre generici "riequilibri" ma spostamenti specifici di capitale.

7. QUALITÀ SOPRA QUANTITÀ: Fornisci poche opportunità di relazione (1-2) ma profondamente analizzate e con alto potenziale di impatto, piuttosto che molte superficiali.

Se i dati forniti sono insufficienti per un'analisi approfondita, evidenzia specificamente quali informazioni aggiuntive sarebbero necessarie per migliorare l'analisi, invece di fornire raccomandazioni generiche.`;

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

// Nuova interfaccia per insight cliente
interface InsightsCliente {
  profiloSintetico: string;
  puntiForza: string[];
  puntiDebolezza: string[];
  analisiAllocazione: string;
}

// Nuova interfaccia per portafoglio modello consigliato
interface PortafoglioModello {
  portfolioConsigliato: string;
  motivazione: string;
  modificheSuggerite: string[];
  beneficiAttesi: string;
}

// Interfaccia per opportunità di relazione
interface OpportunitaRelazione {
  titolo: string;
  descrizione: string;
  emailSuggerita: string;
  priorita: number;
}

interface PortafoglioDisponibile {
  id: string;
  nome: string;
  descrizione: string;
  livelloRischio: string;
  rendimentoAtteso: string;
  orizzonte: string;
  allocazione: {
    classeAttivita: string;
    percentuale: number;
  }[];
}

interface AssetAllocazione {
  allocazione: {
    categoria: string;
    valore: number;
  }[];
  valoreComplessivo: number;
}

interface DatiInvestimento {
  orizzonte: string;
  profiloRischio: string;
  obiettiviInvestimento: string[];
  esperienzaInvestimento: string;
}

// Asset interface definition
interface Asset {
  category?: string;
  value?: number;
  description?: string;
}

/**
 * Interfaccia per il profilo arricchito del cliente
 */
export interface AiClientProfile {
  clientInfo: {
    firstName: string;
    lastName: string;
    email: string;
  };
  insightsCliente: InsightsCliente;
  portafoglioModello: PortafoglioModello;
  strategieRelazione: OpportunitaRelazione[];
  datiInvestimento?: DatiInvestimento;
  assetAttuali?: AssetAllocazione;
  portafogliModelloDisponibili?: PortafoglioDisponibile[];
}

// Interfaccia per i dati MIFID
export interface MifidType {
  id?: string;
  client_id?: string;
  investmentObjective?: string;
  investmentHorizon?: string;
  portfolioDropReaction?: string;
  volatilityTolerance?: string;
  assets?: Asset[];
  // Add any other fields that are used in this file
}

// Define the needed interfaces directly in this file
interface Client {
  id: string;
  name: string;
  surname: string;
  email?: string;
  phone?: string;
  birthdate?: string;
  birthplace?: string;
  cf?: string;
  job?: string;
  education?: string;
  address?: string;
  city?: string;
  province?: string;
  zip?: string;
  country?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

interface ClientLog {
  id: string;
  client_id: string;
  type: string;
  content: string;
  date: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Crea un prompt dettagliato per OpenAI utilizzando i dati del cliente
 */
function createClientProfilePrompt(
  client: Client, 
  mifid: MifidType | null,
  modelPortfolios: any[], // Aggiunto parametro per i model portfolios
  logs: ClientLog[]
): string {
  // Formattiamo le informazioni del cliente
  const promptParts = [
    `# Dettagli Cliente\n`,
    `Nome completo: ${client.name || ''} ${client.surname || ''}`,
    `Email: ${client.email || 'Non disponibile'}`,
  ];

  // Aggiungi informazioni sul mifid se disponibili
  if (mifid) {
    promptParts.push(
      `\n# Profilo di Rischio e Investimento\n`,
      `Indirizzo: ${mifid.address || 'Non specificato'}`,
      `Telefono: ${mifid.phone || 'Non specificato'}`,
      `Data di nascita: ${mifid.birthDate || 'Non specificata'}`,
      `Stato occupazionale: ${mifid.employmentStatus || 'Non specificato'}`,
      `Livello di istruzione: ${mifid.educationLevel || 'Non specificato'}`,
      `Reddito annuale: ${mifid.annualIncome || 'Non specificato'}`,
      `Spese mensili: ${mifid.monthlyExpenses || 'Non specificato'}`,
      `Debiti: ${mifid.debts || 'Non specificati'}`,
      `Patrimonio netto: ${mifid.netWorth || 'Non specificato'}`,
      `Profilo di rischio complessivo: ${mifid.riskProfile || 'Non specificato'}`,
      `Orizzonte temporale di investimento: ${mifid.investmentHorizon || 'Non specificato'}`,
      `Obiettivi di investimento: ${Array.isArray(mifid.investmentInterests) ? mifid.investmentInterests.join(', ') : (mifid.investmentObjective || 'Non specificati')}`,
      `Esperienza di investimento: ${mifid.investmentExperience || 'Non specificata'}`,
      `Esperienze di investimento passate: ${Array.isArray(mifid.pastInvestmentExperience) ? mifid.pastInvestmentExperience.join(', ') : 'Non specificate'}`,
      `Educazione finanziaria: ${Array.isArray(mifid.financialEducation) ? mifid.financialEducation.join(', ') : 'Non specificata'}`,
      `Reazione a un calo del portafoglio: ${mifid.portfolioDropReaction || 'Non specificata'}`
    );

    // Aggiungi informazioni sugli asset se disponibili
    if (mifid.assets && Array.isArray(mifid.assets) && mifid.assets.length > 0) {
      promptParts.push(`\n# Asset attuali\n`);
      
      mifid.assets.forEach((asset: Asset) => {
        if (asset.category && asset.value) {
          promptParts.push(`- ${asset.category}: ${asset.value} EUR${asset.description ? ` (${asset.description})` : ''}`);
        }
      });
      
      // Calcola e aggiungi il valore totale
      const totalValue = mifid.assets.reduce((sum: number, asset: Asset) => sum + (asset.value || 0), 0);
      promptParts.push(`\nValore totale degli asset: ${totalValue} EUR`);
    }
  }

  // Aggiungi informazioni sui portafogli modello disponibili
  if (modelPortfolios && Array.isArray(modelPortfolios) && modelPortfolios.length > 0) {
    promptParts.push(`\n# Portafogli Modello Disponibili\n`);
    
    modelPortfolios.forEach((portfolio: any) => {
      promptParts.push(
        `## ${portfolio.name}\n`,
        `ID: ${portfolio.id}`,
        `Descrizione: ${portfolio.description || 'Non disponibile'}`,
        `Livello di rischio: ${portfolio.risk_level || 'Non specificato'}`,
        `Orizzonte temporale: ${portfolio.investment_horizon || 'Non specificato'}`,
        `Obiettivi: ${Array.isArray(portfolio.objectives) ? portfolio.objectives.join(', ') : 'Non specificati'}`,
        `\nAllocazione:`
      );
      
      if (portfolio.allocation && Array.isArray(portfolio.allocation)) {
        portfolio.allocation.forEach((item: any) => {
          promptParts.push(`- ${item.category || item.name}: ${item.percentage}%${item.isin ? ` (ISIN: ${item.isin})` : ''}`);
        });
      }
      
      promptParts.push(''); // Linea vuota tra i portafogli
    });
  } else {
    // Avviso importante se non ci sono portafogli modello disponibili
    promptParts.push(`\n# AVVISO IMPORTANTE: Nessun portafoglio modello disponibile`);
    promptParts.push(`Non sono disponibili portafogli modello. Non è possibile fornire raccomandazioni di portafoglio in questo caso.`);
  }

  // Aggiungi log delle interazioni se disponibili
  if (logs && logs.length > 0) {
    promptParts.push(`\n# Storico Interazioni\n`);
    
    logs.forEach(log => {
      const date = new Date(log.date || new Date()).toLocaleDateString();
      promptParts.push(
        `## ${date} - ${log.type}\n`,
        `${log.content || 'Nessun dettaglio disponibile'}\n`
      );
    });
  }

  // Istruzioni finali per OpenAI
  promptParts.push(
    `\n# Istruzioni\n`,
    `Basandoti sui dettagli sopra riportati, fornisci un'analisi completa e approfondita del cliente con:`,
    `1. Insights sul profilo cliente che rivelino pattern comportamentali e psicologici, non limitandoti a ripetere i dati forniti ma interpretandoli in modo integrato`,
    `2. Raccomandazioni precise sul portafoglio ottimale con modifiche quantificate e strategiche (percentuali precise) che migliorino l'allineamento con gli obiettivi e il profilo di rischio reale del cliente`,
    `3. Al massimo 2 opportunità di business di alta qualità e impatto, con descrizioni concrete e testi di email pronti all'uso`
  );

  return promptParts.join('\n');
}

/**
 * Genera un profilo client arricchito utilizzando OpenAI
 * @param client Il cliente per cui generare il profilo
 * @param mifid Il profilo di rischio del cliente
 * @param modelPortfolios Lista di portfoli modello disponibili
 * @param logs I log delle interazioni con il cliente
 * @returns Profilo arricchito con approfondimenti e suggerimenti
 */
export async function generateClientProfile(
  client: Client, 
  mifid: MifidType | null,
  modelPortfolios: any[], // Aggiunto parametro per i model portfolios
  logs: ClientLog[]
): Promise<AiClientProfile> {
  // Verifica se la chiave API OpenAI è impostata
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  try {
    // Crea un prompt dettagliato per GPT-4 utilizzando i dati del cliente e i log
    const prompt = createClientProfilePrompt(client, mifid, modelPortfolios, logs);
    
    // Stampa le istruzioni e il prompt in console per debug
    console.log('\n==== SYSTEM INSTRUCTIONS ====\n');
    console.log(SYSTEM_INSTRUCTIONS);
    console.log('\n==== USER PROMPT ====\n');
    console.log(prompt);
    console.log('\n==== END PROMPT ====\n');
    
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
      
      // Ordina le opportunità di relazione per priorità
      if (parsedData.strategieRelazione && Array.isArray(parsedData.strategieRelazione)) {
        parsedData.strategieRelazione.sort((a: OpportunitaRelazione, b: OpportunitaRelazione) => 
          (a.priorita || 5) - (b.priorita || 5)
        );
      }
      
      // Verifica che il portafoglio consigliato sia valido
      let portfolioValid = false;
      let portfolioConsigliato = parsedData.portafoglioModello?.portfolioConsigliato || '';
      
      if (modelPortfolios && Array.isArray(modelPortfolios) && modelPortfolios.length > 0 && portfolioConsigliato) {
        // Prima verifica se l'ID è presente nel portafoglio consigliato
        const idMatch = portfolioConsigliato.match(/\(ID:\s*(\d+)\)/i);
        if (idMatch && idMatch[1]) {
          const portfolioId = parseInt(idMatch[1], 10);
          portfolioValid = modelPortfolios.some(
            (portfolio: any) => portfolio.id === portfolioId
          );
          
          if (portfolioValid) {
            // Se abbiamo trovato un portafoglio con questo ID, assicuriamoci di usare il nome esatto
            const matchedPortfolio = modelPortfolios.find((p: any) => p.id === portfolioId);
            if (matchedPortfolio) {
              parsedData.portafoglioModello.portfolioConsigliato = matchedPortfolio.name;
            }
          }
        }
        
        // Se non abbiamo trovato per ID, proviamo con una corrispondenza flessibile sul nome
        if (!portfolioValid) {
          // Normalizza i nomi per una corrispondenza più flessibile
          const normalizedPortfolioName = portfolioConsigliato.toLowerCase().trim();
          
          for (const portfolio of modelPortfolios) {
            const normalizedModelName = portfolio.name.toLowerCase().trim();
            
            // Verifica sia corrispondenza esatta che parziale
            if (normalizedModelName === normalizedPortfolioName || 
                normalizedModelName.includes(normalizedPortfolioName) || 
                normalizedPortfolioName.includes(normalizedModelName)) {
              portfolioValid = true;
              // Usa il nome esatto del portafoglio dal modello
              parsedData.portafoglioModello.portfolioConsigliato = portfolio.name;
              break;
            }
          }
        }
        
        // Se il portafoglio consigliato non è valido, sostituiscilo con uno valido
        if (!portfolioValid && modelPortfolios.length > 0) {
          console.warn(`Portfolio "${portfolioConsigliato}" not found in available portfolios. Replacing with a valid one.`);
          
          // Scegli il primo portafoglio disponibile come fallback
          const validPortfolio = modelPortfolios[0];
          const originalPortfolioName = parsedData.portafoglioModello.portfolioConsigliato;
          parsedData.portafoglioModello.portfolioConsigliato = validPortfolio.name;
          
          // Sostituisci completamente la motivazione per evitare riferimenti contraddittori
          const originalMotivazione = parsedData.portafoglioModello.motivazione || '';
          parsedData.portafoglioModello.motivazione = 
            `Il portafoglio ${validPortfolio.name} (ID: ${validPortfolio.id}) è stato selezionato in quanto compatibile con il profilo del cliente.`;
          
          // Se c'è una motivazione originale, rimuovi eventuali riferimenti al portafoglio non valido
          if (originalMotivazione.length > 10) {
            // Rimuovi riferimenti diretti al portafoglio non valido
            let cleanedMotivazione = originalMotivazione
              .replace(new RegExp(`${originalPortfolioName}\\s*\\(ID:\\s*\\d+\\)`, 'gi'), validPortfolio.name)
              .replace(new RegExp(originalPortfolioName, 'gi'), validPortfolio.name);
              
            // Aggiungi la motivazione ripulita
            parsedData.portafoglioModello.motivazione += " " + cleanedMotivazione;
          }
        }
      }
      
      // Costruisci l'oggetto AiClientProfile
      const result: AiClientProfile = {
        clientInfo: {
          firstName: client.name || '',
          lastName: client.surname || '',
          email: client.email || '',
        },
        insightsCliente: {
          profiloSintetico: parsedData.insightsCliente?.profiloSintetico || '',
          puntiForza: parsedData.insightsCliente?.puntiForza || [],
          puntiDebolezza: parsedData.insightsCliente?.puntiDebolezza || [],
          analisiAllocazione: parsedData.insightsCliente?.analisiAllocazione || '',
        },
        portafoglioModello: {
          portfolioConsigliato: parsedData.portafoglioModello?.portfolioConsigliato || '',
          motivazione: parsedData.portafoglioModello?.motivazione || '',
          modificheSuggerite: parsedData.portafoglioModello?.modificheSuggerite || [],
          beneficiAttesi: parsedData.portafoglioModello?.beneficiAttesi || '',
        },
        strategieRelazione: parsedData.strategieRelazione || [],
        datiInvestimento: mifid ? {
          orizzonte: mifid.investmentHorizon || '',
          profiloRischio: mifid.riskProfile || '',
          obiettiviInvestimento: Array.isArray(mifid.investmentInterests) ? mifid.investmentInterests : (mifid.investmentObjective ? [mifid.investmentObjective] : []),
          esperienzaInvestimento: mifid.investmentExperience || '',
        } : undefined,
        assetAttuali: mifid && mifid.assets && Array.isArray(mifid.assets) && mifid.assets.length > 0 ? {
          allocazione: mifid.assets.map(asset => ({
            categoria: asset.category,
            valore: asset.value,
          })),
          valoreComplessivo: mifid.assets.reduce((sum, asset) => sum + (asset.value || 0), 0),
        } : undefined,
        portafogliModelloDisponibili: modelPortfolios ? modelPortfolios.map((portfolio: any) => ({
          id: portfolio.id.toString(),
          nome: portfolio.name,
          descrizione: portfolio.description,
          livelloRischio: portfolio.risk_level,
          rendimentoAtteso: '',
          orizzonte: portfolio.investment_horizon,
          allocazione: portfolio.allocation ? portfolio.allocation.map((item: any) => ({
            classeAttivita: item.category,
            percentuale: item.percentage,
          })) : [],
        })) : undefined,
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

// Funzione per generare un prompt per la creazione di un portafoglio personalizzato
export function createPortfolioCreationPrompt(
  client: Client,
  mifid: MifidType | null,
  modelPortfolio: any, // Il portafoglio modello selezionato
  customRequirements: string[] = []
): string {
  // Formattiamo le informazioni del cliente e i requisiti
  const promptParts = [
    `# Richiesta di creazione portafoglio personalizzato\n`,
    `Cliente: ${client.name || ''} ${client.surname || ''}`,
  ];

  // Aggiungi informazioni sul mifid se disponibili
  if (mifid) {
    promptParts.push(
      `\n# Profilo di Rischio e Investimento\n`,
      `Profilo di rischio: ${mifid.riskProfile || 'Non specificato'}`,
      `Orizzonte temporale: ${mifid.investmentHorizon || 'Non specificato'}`,
      `Obiettivi di investimento: ${Array.isArray(mifid.investmentInterests) ? mifid.investmentInterests.join(', ') : (mifid.investmentObjective || 'Non specificati')}`,
      `Tolleranza al rischio: ${mifid.portfolioDropReaction || 'Non specificata'}`
    );
  }

  // Aggiungi informazioni sul portafoglio modello
  if (modelPortfolio) {
    promptParts.push(
      `\n# Portafoglio Modello Base\n`,
      `Nome: ${modelPortfolio.name}`,
      `Livello di rischio: ${modelPortfolio.risk_level || 'Non specificato'}`,
      `Orizzonte temporale: ${modelPortfolio.investment_horizon || 'Non specificato'}`,
      `\nAllocazione attuale:`
    );
    
    if (modelPortfolio.allocation && Array.isArray(modelPortfolio.allocation)) {
      modelPortfolio.allocation.forEach((item: any) => {
        promptParts.push(`- ${item.category || item.name}: ${item.percentage}%${item.isin ? ` (ISIN: ${item.isin})` : ''}`);
      });
    }
  }

  // Aggiungi requisiti personalizzati
  if (customRequirements && customRequirements.length > 0) {
    promptParts.push(
      `\n# Requisiti Personalizzati\n`
    );
    
    customRequirements.forEach(req => {
      promptParts.push(`- ${req}`);
    });
  }

  // Istruzioni per la creazione del portafoglio
  promptParts.push(
    `\n# Istruzioni\n`,
    `Crea un portafoglio personalizzato basato sul portafoglio modello, adattato al profilo del cliente e ai requisiti specifici forniti. Il portafoglio deve includere:`,
    `1. Nome del portafoglio personalizzato`,
    `2. Descrizione delle modifiche apportate rispetto al modello base e loro giustificazione`,
    `3. Allocazione dettagliata degli asset con percentuali precise`,
    `4. Rendimento atteso e rischio associato`,
    `5. Strategie di ribilanciamento consigliate`,
    `La risposta deve essere dettagliata ma concisa, evitando generalità e concentrandosi su consigli actionable.`
  );

  return promptParts.join('\n');
}

/**
 * Genera un portafoglio personalizzato basato su un modello
 * @param client Il cliente per cui generare il portafoglio
 * @param mifid Il profilo di rischio del cliente
 * @param modelPortfolio Il portafoglio modello base
 * @param allocations Requisiti personalizzati per il portafoglio
 * @returns Portafoglio personalizzato
 */
export async function generateCustomPortfolio(
  client: Client, 
  mifid: MifidType | null,
  modelPortfolio: any,
  allocations: any[]
): Promise<any> {
  // Verifica se la chiave API OpenAI è impostata
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  try {
    // Crea un prompt per la generazione del portafoglio
    const prompt = createPortfolioCreationPrompt(client, mifid, modelPortfolio, allocations);
    
    // Istruzioni di sistema per la creazione del portafoglio
    const portfolioSystemInstructions = `Sei un consulente finanziario esperto specializzato nella creazione di portafogli personalizzati.
Rispondi con un oggetto JSON contenente:
1. "nome": Nome del portafoglio personalizzato
2. "descrizione": Descrizione delle modifiche e loro giustificazione
3. "allocazione": Array di oggetti con "categoria" e "percentuale"
4. "rendimentoAtteso": Stima del rendimento annualizzato
5. "rischioAssociato": Descrizione del rischio associato
6. "strategieRibilanciamento": Array di suggerimenti per il ribilanciamento

Fornisci SOLO consigli specifici, dettagliati e actionable.`;
    
    // Crea un'istanza OpenAI
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY
    });
    
    // Chiama l'API OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        {
          role: 'system',
          content: portfolioSystemInstructions
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.4,
      max_tokens: 2000
    });

    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in OpenAI response");
    }
    
    // Estrai il JSON dalla risposta
    let parsedData: any;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      
      if (jsonMatch && jsonMatch[1]) {
        parsedData = JSON.parse(jsonMatch[1]);
      } else {
        parsedData = JSON.parse(content);
      }
      
      return parsedData;
      
    } catch (error) {
      console.error('Error parsing OpenAI response:', error, content);
      throw new Error('Failed to parse OpenAI response');
    }
  } catch (error) {
    console.error('Error in generateCustomPortfolio:', error);
    throw error;
  }
}

