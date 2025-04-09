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
  // Mantenuto per retrocompatibilità
  raccomandazioni?: ProfileItem[] | OpportunitaBusiness[] | string;
  // Campo per rilevare l'ultimo aggiornamento
  lastUpdated?: string;
}

/**
 * Interfaccia per i suggerimenti generati per il consulente
 */
export interface AdvisorSuggestions {
  opportunities: {
    title: string;
    description: string;
    clientId: number;
    clientName: string;
    suggestedAction: string;
    personalizedEmail?: {
      subject: string;
      body: string;
    };
  }[];
}

/**
 * Interfaccia per i suggerimenti al consulente
 */
interface AdvisorRecommendation {
  title: string;
  description: string;
  businessReason: string;
  clientId: number;
  clientName: string;
  suggestedAction: string;
  personalizedEmail: {
    subject: string;
    body: string;
  };
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

## Interessi Specifici (da 1 a 5 dove 1 è massimo interesse)
` : ''}
`;

  // Aggiungi la cronologia delle interazioni se disponibile
  if (logs && logs.length > 0) {
    prompt += "\n# Cronologia Interazioni\n";
    logs.forEach((log, index) => {
      prompt += `\n## Interazione ${index + 1} (${log.type}) - ${new Date(log.logDate).toLocaleDateString()}\n`;
      prompt += `Titolo: ${log.title}\n`;
      prompt += `Contenuto: ${log.content}\n`;
    });
  }

  // Aggiungi istruzioni specifiche per l'AI
  prompt += `
# Istruzioni
Analizza il profilo del cliente e la cronologia delle interazioni per creare DUE output distinti:
1. Un profilo cliente sintetico basato sui dati forniti
2. Una lista di opportunità di business deducibili dal profilo e dai log

Rispondi in italiano usando un formato JSON con due campi principali:
- "profiloCliente": un oggetto con un campo "descrizione" contenente un riassunto completo del profilo del cliente
- "opportunitaBusiness": un array di opportunità di business rilevabili

## Per il Profilo Cliente:
Sintetizza tutte le informazioni da MIFID e interazioni nei log in UN UNICO PARAGRAFO DESCRITTIVO che catturi:
- Caratteristiche psicologiche/comportamentali verso il rischio finanziario
- Tendenze cognitive e bias decisionali 
- Atteggiamento emotivo verso il denaro e gli investimenti
- Modelli comportamentali ricorrenti nelle decisioni finanziarie
- Motivazioni profonde e valori che guidano le scelte finanziarie
- Punti di tensione o preoccupazioni implicite non dichiarate apertamente
Non spacchettare in campi separati ma crea un riassunto narrativo completo e coeso che si concentri principalmente sugli aspetti psicologici e comportamentali.

## Per le Opportunità di Business:
Identifica 3-5 opportunità basate sul profilo psicologico del cliente e sui pattern comportamentali, ciascuna con:
- Un titolo chiaro e specifico
- Una descrizione dettagliata che spiega l'insight psicologico non immediatamente visibile
- 2-3 azioni pratiche che il consulente potrebbe intraprendere

Nella generazione delle opportunità:
- Concentrati su INSIGHT PSICOLOGICI NON OVVI e opportunità basate sulla comprensione del profilo comportamentale
- NON proporre MAI opportunità relative alla gestione del debito o alla ristrutturazione finanziaria
- NON menzionare debiti, entrate o uscite a meno che non sia strettamente rilevante per un insight psicologico importante
- Evita completamente di focalizzarti su aspetti puramente finanziari come rendimenti, allocazioni, ribilanciamenti
- Concentrati invece su aspetti come: educazione finanziaria, supporto decisionale, gestione dell'ansia da investimento, fiducia nella relazione consulente-cliente
- Le opportunità dovrebbero riguardare più la relazione consulente-cliente e la comprensione psicologica che i prodotti finanziari specifici

IMPORTANTE:
- Le interazioni sono ordinate dalla più recente alla meno recente. Dai priorità alle informazioni più recenti.
- Ogni opportunità deve essere basata su un insight psicologico non immediatamente visibile.
- Basa le tue analisi SOLO sulle informazioni fornite, senza inventare dati.
- NON includere alcun campo "valorePotenziale" o "valore" nelle opportunità.
- EVITA COMPLETAMENTE qualsiasi riferimento a ristrutturazione del debito.

Esempio di formato:
{
  "profiloCliente": {
    "descrizione": "Il cliente mostra una marcata avversione al rischio che sembra radicata in esperienze passate non esplicitate. Sebbene affermi di comprendere la necessità di diversificazione, le sue scelte rivelano un forte bias di ancoraggio verso investimenti familiari. La sua relazione con il denaro è permeata da un conflitto tra il desiderio di sicurezza e il timore di perdere opportunità, creando una tensione decisionale che si manifesta in lunghi periodi di indecisione seguiti da scelte impulsive quando si sente sotto pressione. Nelle interazioni, emerge un pattern di ricerca costante di rassicurazione e la tendenza a rimandare decisioni significative."
  },
  "opportunitaBusiness": [
    {
      "titolo": "Superamento dell'avversione emotiva al rischio",
      "descrizione": "Il cliente presenta un pattern di rifiuto emotivo verso il rischio che non è allineato con i suoi obiettivi dichiarati. Questo non deriva da una valutazione razionale ma da un meccanismo di protezione emotiva che limita la sua capacità di prendere decisioni equilibrate.",
      "azioni": [
        "Proporre un esercizio di visualizzazione guidata con scenari ipotetici per separare le reazioni emotive dalle valutazioni razionali",
        "Creare un piano educativo personalizzato sulla relazione rischio-rendimento con esempi storici concreti",
        "Programmare incontri più frequenti ma brevi per costruire fiducia e ridurre l'ansia decisionale"
      ]
    }
  ]
}
`;

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
      model: 'gpt-4', // Utilizziamo GPT-4 per risultati migliori
      messages: [
        {
          role: 'system',
          content: `Sei un esperto consulente finanziario con specializzazione in psicologia comportamentale. Analizza i dati del cliente e genera un profilo psicologico approfondito e insight comportamentali non ovvi.

Rispondi in italiano, in formato JSON con due campi principali:
- "profiloCliente": un oggetto con un campo "descrizione" contenente un'analisi psicologica e comportamentale del cliente
- "opportunitaBusiness": un array di opportunità basate su insight psicologici

Il profiloCliente deve concentrarsi principalmente su:
- Caratteristiche psicologiche e comportamentali verso il rischio e gli investimenti
- Bias cognitivi e pattern decisionali ricorrenti
- Motivazioni profonde e valori che guidano le scelte finanziarie
- Tensioni emotive e preoccupazioni implicite non dichiarate apertamente

Ogni opportunità di business deve contenere:
- titolo: nome chiaro dell'opportunità basata su un insight psicologico
- descrizione: spiegazione dell'insight psicologico non immediatamente visibile
- azioni: array di 2-3 azioni concrete che il consulente può intraprendere

IMPORTANTE:
- CONCENTRATI ESCLUSIVAMENTE sugli aspetti psicologici e comportamentali, non su prodotti finanziari
- NON MENZIONARE MAI il debito, la sua ristrutturazione o gestione in nessuna circostanza
- EVITA di focalizzarti su dati finanziari come rendimenti, allocazioni, ribilanciamenti
- NON PARLARE di entrate, uscite o bilanci a meno che non siano strettamente rilevanti per un insight psicologico
- Le opportunità dovrebbero riguardare: educazione finanziaria, supporto decisionale, gestione dell'ansia da investimento, fiducia nella relazione

Le interazioni del cliente sono ordinate dalla più recente alla meno recente. Quando trovi informazioni contrastanti, dai sempre priorità alle informazioni più recenti.

NON includere campi di valutazione come "valore" o "valorePotenziale" nelle opportunità di business.

Le azioni suggerite devono:
- Focalizzarsi sulla relazione consulente-cliente più che su prodotti finanziari specifici
- Aiutare il cliente a superare bias cognitivi o blocchi psicologici
- Migliorare la comprensione e la fiducia nel processo decisionale finanziario

Esempio di formato di risposta:
{
  "profiloCliente": {
    "descrizione": "Il cliente mostra una marcata avversione al rischio che sembra radicata in esperienze passate non esplicitate. Sebbene affermi di comprendere la necessità di diversificazione, le sue scelte rivelano un forte bias di ancoraggio verso investimenti familiari. La sua relazione con il denaro è permeata da un conflitto tra il desiderio di sicurezza e il timore di perdere opportunità, creando una tensione decisionale che si manifesta in lunghi periodi di indecisione seguiti da scelte impulsive quando si sente sotto pressione. Nelle interazioni, emerge un pattern di ricerca costante di rassicurazione e la tendenza a rimandare decisioni significative."
  },
  "opportunitaBusiness": [
    {
      "titolo": "Superamento dell'avversione emotiva al rischio",
      "descrizione": "Il cliente presenta un pattern di rifiuto emotivo verso il rischio che non è allineato con i suoi obiettivi dichiarati. Questo non deriva da una valutazione razionale ma da un meccanismo di protezione emotiva che limita la sua capacità di prendere decisioni equilibrate.",
      "azioni": [
        "Proporre un esercizio di visualizzazione guidata con scenari ipotetici per separare le reazioni emotive dalle valutazioni razionali",
        "Creare un piano educativo personalizzato sulla relazione rischio-rendimento con esempi storici concreti",
        "Programmare incontri più frequenti ma brevi per costruire fiducia e ridurre l'ansia decisionale"
      ]
    }
  ]
}`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3, // Bassa temperatura per risultati più prevedibili
      max_tokens: 1200 // Aumentato limite per contenere entrambe le sezioni
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
      
      // Costruisci l'oggetto AiClientProfile
      const result: AiClientProfile = {
        clientId: client.id,
        clientName: `${client.firstName} ${client.lastName}`,
        // Usa i nuovi campi se disponibili, altrimenti crea oggetti vuoti correttamente tipizzati
        profiloCliente: parsedData.profiloCliente as ClienteProfilo || undefined,
        opportunitaBusiness: parsedData.opportunitaBusiness as OpportunitaBusiness[] || [],
        // Manteniamo retrocompatibilità con il vecchio formato
        raccomandazioni: parsedData.opportunitaBusiness as OpportunitaBusiness[] || [],
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
 * Crea un prompt per generare suggerimenti per il consulente
 */
function createAdvisorSuggestionsPrompt(aiProfiles: AiClientProfile[]): string {
  // Formatta i profili per includere le informazioni del cliente e le opportunità già generate
  const formattedProfiles = aiProfiles.map(profile => ({
    clientId: profile.clientId,
    clientName: profile.clientName,
    profiloCliente: profile.profiloCliente,
    opportunitaBusiness: profile.opportunitaBusiness || []
  }));

  // Estrai gli ID e i nomi dei clienti reali per riferimento esplicito
  const realClientIds = aiProfiles.map(profile => profile.clientId);
  const realClientNames = aiProfiles.map(profile => profile.clientName);

  return `
# Selezione e Prioritizzazione degli Insight Psicologici per Consulente Finanziario

Analizzerai le opportunità basate su insight psicologici già individuate nei profili dei clienti per selezionare quelle più rilevanti.

## Obiettivo
Selezionare gli insight psicologici più SIGNIFICATIVI e PROFONDI già identificati nei profili dei clienti e creare email personalizzate che sfruttino questi insight per rafforzare la relazione consulente-cliente.

## Profili e Opportunità Esistenti dei Clienti

${JSON.stringify(formattedProfiles, null, 2)}

## IDs e Nomi dei Clienti Reali Disponibili

IDs: ${JSON.stringify(realClientIds)}
Nomi: ${JSON.stringify(realClientNames)}

## Formato di Risposta

Rispondi con un oggetto JSON strutturato come nel formato seguente:
{
  "opportunities": [
    {
      "title": "Superamento dell'avversione emotiva al rischio",
      "description": "Il cliente presenta un pattern di rifiuto emotivo verso il rischio che non è allineato con i suoi obiettivi dichiarati. Questo sembra derivare da esperienze negative passate che hanno creato blocchi psicologici.",
      "clientId": 123,
      "clientName": "Marco Rossi",
      "suggestedAction": "Proporre un esercizio di visualizzazione guidata con scenari ipotetici per separare le reazioni emotive dalle valutazioni razionali",
      "personalizedEmail": {
        "subject": "Un approccio personalizzato per allineare le tue decisioni ai tuoi obiettivi reali",
        "body": "Analizzando le nostre conversazioni recenti, ho notato come le decisioni di investimento sembrano essere influenzate più da reazioni emotive al rischio che dai tuoi obiettivi a lungo termine.\\n\\nPer aiutarti a separare queste reazioni emotive dalle valutazioni razionali, ho sviluppato un breve esercizio di visualizzazione che potremmo svolgere insieme nel nostro prossimo incontro.\\n\\nQuesto approccio ha aiutato molti dei miei clienti a prendere decisioni più allineate con i loro veri obiettivi, superando i blocchi emotivi che spesso ostacolano scelte finanziarie equilibrate.\\n\\nQuando saresti disponibile per un incontro di 30 minuti per esplorare insieme questo metodo?"
      }
    }
  ]
}

## Istruzioni Dettagliate

1. SELEZIONE DEGLI INSIGHT:
   - NON GENERARE nuovi insight, ma SELEZIONA e MIGLIORA quelli già presenti nei profili dei clienti
   - Seleziona le opportunità basate su INSIGHT PSICOLOGICI PIÙ PROFONDI e meno ovvi
   - NON selezionare MAI opportunità relative a prodotti finanziari specifici, debito, o ribilanciamenti
   - Prioritizza opportunità che migliorano la comprensione del cliente, la fiducia nella relazione, e il processo decisionale
   - Scegli 3-5 insight più significativi che rivelano aspetti non evidenti del comportamento finanziario dei clienti
   - Adatta e arricchisci la descrizione dell'insight per renderla più profonda e illuminante
   - Mantieni l'essenza dell'opportunità originale ma approfondisci l'analisi psicologica

2. SUGGESTED ACTION:
   - Seleziona l'azione più efficace tra quelle suggerite nell'opportunità originale che lavori sull'aspetto psicologico
   - Migliorala e rendila più specifica e orientata a superare blocchi psicologici o bias cognitivi
   - L'azione deve essere formulata come un'iniziativa che migliora la comprensione o il processo decisionale
   - EVITA COMPLETAMENTE azioni relative a prodotti finanziari, investimenti o ribilanciamenti

3. PERSONALIZED EMAIL:
   - Crea una email COMPLETAMENTE PERSONALIZZATA per ogni insight psicologico selezionato
   - L'email deve rispecchiare una profonda comprensione psicologica del cliente
   - Inizia riconoscendo il pattern psicologico identificato, poi spiega come può essere affrontato
   - Non includere introduzioni formali, vai dritto al punto
   - NON includere la firma o formule di chiusura come "Cordiali saluti", "A presto", ecc.
   - Utilizza un tono empatico, comprensivo e non giudicante
   - EVITA di menzionare specifici prodotti finanziari, rendimenti o allocazioni
   - Focalizzati sul migliorare la consapevolezza del cliente e il suo processo decisionale
   - L'email deve mostrare che hai compreso aspetti della personalità del cliente che forse lui stesso non riconosce
   - Concludi chiedendo al cliente di farti sapere le sue disponibilità per una chiamata

IMPORTANTE:
- Seleziona SOLO opportunità basate su insight psicologici profondi
- Ogni opportunità deve fare riferimento a un cliente reale specifico con ID e nome corretti
- Ordinale in base alla profondità dell'insight e al potenziale impatto sulla relazione consulente-cliente
- EVITA COMPLETAMENTE qualsiasi menzione di debito, rendimenti, allocazioni o prodotti specifici
- Ogni opportunità DEVE includere una email personalizzata che dimostri una comprensione psicologica profonda
- Concentrati sulla qualità degli insight selezionati piuttosto che sulla quantità
`;
}

/**
 * Genera suggerimenti per il consulente basati sui profili dei clienti
 * @param aiProfiles - Array di profili AI dei clienti
 * @returns Oggetto con suggerimenti categorizzati
 */
export async function generateAdvisorSuggestions(
  aiProfiles: AiClientProfile[]
): Promise<AdvisorSuggestions> {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }
  
  try {
    // Crea il prompt
    const prompt = createAdvisorSuggestionsPrompt(aiProfiles);
    
    // Inizializza OpenAI
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY
    });
    
    // Chiama l'API OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-16k',
      messages: [
        {
          role: 'system',
          content: `Sei un esperto consulente finanziario con specializzazione in psicologia comportamentale e finanza comportamentale.
          Il tuo compito è selezionare gli insight psicologici più profondi e significativi già identificati nei profili dei clienti.
          NON devi MAI menzionare debito, ristrutturazione del debito, entrate, uscite o prodotti finanziari specifici.
          Focalizzati esclusivamente sugli aspetti psicologici, bias cognitivi e pattern comportamentali.
          Per ogni insight selezionato, dovrai creare un'email personalizzata che mostri una profonda comprensione psicologica.
          Rispondi SOLO con un oggetto JSON valido nel formato richiesto, senza ulteriori spiegazioni o markdown.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 4000
    });
    
    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in OpenAI response");
    }
    
    // Parsing della risposta
    try {
      return JSON.parse(content) as AdvisorSuggestions;
    } catch (error) {
      console.error("Error parsing OpenAI JSON response:", error);
      // Restituisci un oggetto vuoto se ci sono problemi
      return {
        opportunities: []
      };
    }
  } catch (error) {
    console.error("Error generating advisor suggestions:", error);
    throw error;
  }
}