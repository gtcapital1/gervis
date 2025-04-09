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
- Abitudini di investimento deducibili
- Preoccupazioni principali o punti di interesse
- Obiettivi finanziari a breve, medio e lungo termine
- Pattern comportamentali nelle decisioni finanziarie
- Livello di conoscenza finanziaria ed eventuali bias cognitivi
Non spacchettare in campi separati ma crea un riassunto narrativo completo e coeso.

## Per le Opportunità di Business:
Identifica 3-5 opportunità concrete basate sul profilo del cliente e sui log, ciascuna con:
- Un titolo chiaro e specifico
- Una descrizione dettagliata che spiega perché questa è un'opportunità
- 2-3 azioni pratiche che il consulente potrebbe intraprendere

Nella generazione delle opportunità:
- Privilegia SEMPRE opportunità di business TANGIBILI, CONCRETE e REALI che possono portare a investimenti immediati
- NON proporre opportunità relative a gestione del debito o ristrutturazione del debito, A MENO CHE il debito del cliente non sia superiore al 30% degli asset under management (AUM)
- Dai priorità a opportunità che generano commissioni o aumenti di AUM a breve termine
- Focalizzati su opportunità che richiedono azioni concrete e immediate da parte del cliente
- Preferisci opportunità relative a investimenti, prodotti o servizi piuttosto che a ristrutturazioni o risparmi

IMPORTANTE:
- Le interazioni sono ordinate dalla più recente alla meno recente. Dai priorità alle informazioni più recenti.
- Ogni opportunità deve essere specifica, realizzabile e rilevante per questo cliente specifico.
- Basa le tue analisi SOLO sulle informazioni fornite, senza inventare dati.
- NON includere alcun campo "valorePotenziale" o "valore" nelle opportunità.

Esempio di formato:
{
  "profiloCliente": {
    "descrizione": "Cliente con profilo di rischio moderato ma con interesse crescente verso investimenti più aggressivi. Mostra preoccupazione per la pianificazione pensionistica e la protezione del capitale a lungo termine. Preferisce un approccio cauto ma è aperto a considerare nuove opzioni se ben spiegate e supportate da dati. Ha una conoscenza base dei prodotti finanziari tradizionali ma una limitata comprensione di strumenti complessi. Tende a richiedere tempo per riflettere sulle decisioni importanti e mostra segni di ansia quando si discute di volatilità."
  },
  "opportunitaBusiness": [
    {
      "titolo": "Ottimizzazione del portafoglio per combinare sicurezza e crescita",
      "descrizione": "Il cliente ha espresso preoccupazione per la crescita del capitale mantenendo sicurezza. L'attuale allocazione è troppo conservativa rispetto agli obiettivi dichiarati.",
      "azioni": [
        "Presentare uno scenario di ribilanciamento con allocazione 60% sicurezza / 40% crescita",
        "Proporre un piano di investimento graduale per la liquidità in eccesso (€50.000)",
        "Organizzare un incontro per discutere strategie di protezione del capitale con potenziale di crescita"
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
          content: `Sei un esperto consulente finanziario. Analizza i dati del cliente e genera un profilo sintetico e opportunità di business concrete.

Rispondi in italiano, in formato JSON con due campi principali:
- "profiloCliente": un oggetto con un campo "descrizione" contenente un riassunto completo del profilo del cliente
- "opportunitaBusiness": un array di opportunità di business rilevabili

Il profiloCliente deve avere:
- descrizione: un unico paragrafo descrittivo che sintetizzi tutte le caratteristiche rilevanti del cliente, includendo profilo di rischio, obiettivi, comportamento decisionale, conoscenze finanziarie e note psicologiche

Ogni opportunità di business deve contenere:
- titolo: nome chiaro dell'opportunità
- descrizione: spiegazione dettagliata che motiva l'opportunità
- azioni: array di 2-3 azioni concrete e specifiche che il consulente può intraprendere

IMPORTANTE per la generazione delle opportunità:
- PRIVILEGIA opportunità di business TANGIBILI e CONCRETE che portano a investimenti immediati
- NON generare opportunità relative al debito, a meno che il debito del cliente non sia >30% degli asset under management (AUM)
- Dai priorità a opportunità che generano commissioni o aumenti di AUM a breve termine
- Focalizzati su azioni immediate e concrete che il cliente può intraprendere
- Preferisci opportunità relative a investimenti, prodotti o servizi piuttosto che a ristrutturazioni

Le interazioni del cliente sono ordinate dalla più recente alla meno recente. Quando trovi informazioni contrastanti o cambiamenti nelle preferenze, dai sempre priorità alle informazioni più recenti.

NON includere campi di valutazione come "valore" o "valorePotenziale" nelle opportunità di business.

Le azioni devono essere:
- Specifiche e pratiche (es. "Organizzare una sessione per discutere specifiche opzioni di diversificazione in ETF")
- Realizzabili (con dettagli concreti)
- Rilevanti per il cliente in questione
- Tempestive (quando possibile, indicare una sequenza o priorità)

Esempio di formato di risposta:
{
  "profiloCliente": {
    "descrizione": "Cliente con profilo di rischio moderato ma con interesse crescente verso investimenti più aggressivi. Mostra preoccupazione per la pianificazione pensionistica. Preferisce un approccio cauto ma aperto a nuove opzioni se ben spiegate. Ha conoscenza base dei prodotti finanziari tradizionali ma limitata comprensione di strumenti complessi. Tende a richiedere tempo per riflettere e mostra segni di ansia quando si discute di volatilità."
  },
  "opportunitaBusiness": [
    {
      "titolo": "Ottimizzazione del portafoglio per combinare sicurezza e crescita",
      "descrizione": "Il cliente ha espresso preoccupazione per la crescita del capitale mantenendo sicurezza. L'attuale allocazione è troppo conservativa.",
      "azioni": [
        "Presentare uno scenario di ribilanciamento con allocazione 60% sicurezza / 40% crescita",
        "Proporre un piano di investimento graduale per la liquidità in eccesso (€50.000)"
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
# Selezione e Prioritizzazione delle Opportunità di Business per Consulente Finanziario

Analizzerai le opportunità di business già individuate nei profili dei clienti per selezionare quelle più rilevanti e prioritarie.

## Obiettivo
Selezionare le opportunità di business più TANGIBILI e con POTENZIALE DI INVESTIMENTO IMMEDIATO già identificate nei profili dei clienti, arricchirle e creare email personalizzate specifiche.

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
      "title": "Ottimizzazione portafoglio con rendimento maggiore",
      "description": "Il cliente ha espresso insoddisfazione per il rendimento attuale e dispone di liquidità non investita",
      "clientId": 123,
      "clientName": "Marco Rossi",
      "suggestedAction": "Presentare una proposta di ribilanciamento con focus su ETF settoriali tecnologici e healthcare",
      "personalizedEmail": {
        "subject": "Proposta specifica per ottimizzare i rendimenti del tuo portafoglio",
        "body": "Ho preparato una strategia di ribilanciamento che include ETF settoriali tecnologici e healthcare che potrebbero offrire rendimenti superiori pur mantenendo un profilo di rischio in linea con le tue preferenze.\\n\\nDall'analisi del tuo portafoglio, ho notato che la liquidità di circa €150.000 che hai accumulato negli ultimi mesi potrebbe essere messa a frutto in modo più efficace.\\n\\nVorresti fissare un incontro il prossimo martedì alle 15:00 per discuterne i dettagli? Ti mostrerò alcune simulazioni comparative con il tuo attuale portafoglio."
      }
    }
  ]
}

## Istruzioni Dettagliate

1. SELEZIONE DELLE OPPORTUNITÀ:
   - NON GENERARE nuove opportunità, ma SELEZIONA e MIGLIORA quelle già presenti nei profili dei clienti
   - Seleziona le opportunità più TANGIBILI e CONCRETE che offrono un POTENZIALE DI INVESTIMENTO IMMEDIATO
   - NON selezionare opportunità relative al debito, a meno che il debito del cliente non sia >30% degli asset under management (AUM)
   - Prioritizza opportunità che permettono al cliente di fare azioni concrete a breve termine e che generano commissioni o aumenti di AUM
   - Scegli le 3-5 opportunità più rilevanti e promettenti tra tutte quelle disponibili nei profili
   - Adatta e arricchisci la descrizione dell'opportunità per renderla più chiara e convincente
   - Mantieni intatta l'essenza dell'opportunità originale

2. SUGGESTED ACTION:
   - Seleziona l'azione più efficace tra quelle suggerite nell'opportunità originale
   - Migliorala e rendila ancora più specifica e immediatamente attuabile
   - L'azione deve essere formulata come un'iniziativa proattiva del consulente
   - Concentrati su azioni che portano a investimenti concreti o ribilanciamenti immediati

3. PERSONALIZED EMAIL:
   - Crea una email COMPLETAMENTE PERSONALIZZATA per ogni opportunità selezionata
   - L'email deve fare riferimento specifico all'opportunità e alle caratteristiche del cliente
   - Inizia DIRETTAMENTE con la PROPOSTA SPECIFICA, poi spiega perché si adatta al cliente
   - Non includere introduzioni formali, vai dritto al punto
   - NON includere la firma o formule di chiusura come "Cordiali saluti", "A presto", ecc.
   - Utilizza un tono professionale, autorevole e diretto che rifletta l'esperienza di un consulente senior
   - EVITA frasi troppo entusiaste come "Sono entusiasta di", "Non vedo l'ora di", o linguaggio emotivo
   - Utilizza uno stile di comunicazione conciso, pragmatico e orientato ai risultati
   - Includi dettagli specifici tratti dai dati del cliente che dimostrano un'analisi approfondita
   - L'email deve essere pronta all'uso, come se fosse scritta direttamente dal consulente
   - Concludi chiedendo al cliente di farti sapere le sue disponibilità per una chiamata

IMPORTANTE:
- Seleziona SOLO le opportunità più rilevanti tra quelle già esistenti nei profili
- Ogni opportunità deve fare riferimento a un cliente reale specifico con ID e nome corretti
- Ordinale in base a quanto sono tangibili e immediate in termini di potenziale di investimento
- Dai priorità assoluta alle opportunità che prevedono un'azione immediata del cliente con potenziale investimento
- Ogni opportunità DEVE includere una email completamente personalizzata e specifica
- Concentrati sulla qualità delle opportunità selezionate piuttosto che sulla quantità
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
          content: `Sei un esperto consulente finanziario specializzato nell'analisi e nella prioritizzazione delle opportunità di business. 
          Il tuo compito è selezionare le opportunità più tangibili e con potenziale di investimento immediato già identificate nei profili dei clienti.
          NON selezionare opportunità relative al debito, a meno che il debito del cliente non sia >30% degli asset under management (AUM).
          Prioritizza opportunità che generano commissioni o aumenti di AUM a breve termine.
          Per ogni opportunità selezionata, dovrai creare un'email personalizzata pronta all'uso.
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