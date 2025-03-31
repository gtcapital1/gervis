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

interface AiClientProfile {
  raccomandazioni: ProfileItem[] | string; // Nuovo formato unificato che include sia insight che azioni
  
  // Campi legacy per retrocompatibilità
  approfondimenti?: ProfileItem[] | string;
  suggerimenti?: ProfileItem[] | string;
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
    console.error("OPENAI_API_KEY not found in environment variables");
    throw new Error("OpenAI API key not configured");
  }

  // Debug: stampa i valori importanti di mifid
  console.log("[DEBUG] VALORI MIFID IMPORTANTI:");
  if (mifid) {
    console.log({
      riskProfile: mifid.riskProfile,
      investmentExperience: mifid.investmentExperience,
      investmentHorizon: mifid.investmentHorizon,
      wealthGrowthInterest: mifid.wealthGrowthInterest,
      incomeGenerationInterest: mifid.incomeGenerationInterest,
      capitalPreservationInterest: mifid.capitalPreservationInterest,
      estatePlanningInterest: mifid.estatePlanningInterest,
      retirementInterest: mifid.retirementInterest
    });
  } else {
    console.log("MIFID è null");
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
          content: `Sei un esperto consulente finanziario. Analizza i dati del cliente e genera raccomandazioni finanziarie utili.

Rispondi in italiano, in formato JSON con un campo principale:
- "raccomandazioni": un array di oggetti con campi "title", "description" e "actions"

Ogni raccomandazione deve contenere:
1. Un titolo chiaro che identifica un aspetto importante del profilo del cliente o un'opportunità
2. Una descrizione approfondita che spiega il razionale e il contesto
3. Un array "actions" con 2-3 azioni specifiche e concrete che il consulente dovrebbe intraprendere

IMPORTANTE: Le interazioni del cliente sono ordinate dalla più recente alla meno recente. Quando trovi informazioni contrastanti o cambiamenti nelle preferenze del cliente nel tempo, dai sempre priorità alle informazioni più recenti.

Ogni raccomandazione deve essere autosufficiente e completa. Non dividere le informazioni in "approfondimenti" e "suggerimenti" separati, ma integra l'analisi e le azioni consigliate in un'unica raccomandazione coerente.

Le azioni devono essere:
- Specifiche e pratiche (es. "Organizzare una sessione per discutere specifiche opzioni di diversificazione in ETF con esposizione ai mercati emergenti")
- Realizzabili (con dettagli concreti)
- Rilevanti per il cliente in questione
- Tempestive (quando possibile, indicare una sequenza o priorità)

Esempio di formato di risposta:
{
  "raccomandazioni": [
    {
      "title": "Ottimizzazione del portafoglio ad alto rischio",
      "description": "Il cliente presenta un profilo di rischio aggressivo e attualmente ha una forte concentrazione in azioni tecnologiche USA (50.000€) e un immobile a Milano (120.000€). Questa allocazione mostra uno sbilanciamento geografico e settoriale che aumenta la volatilità senza necessariamente migliorare i rendimenti attesi.",
      "actions": [
        "Proporre l'introduzione di ETF su mercati emergenti per un 15% del portafoglio azionario, mantenendo l'esposizione al rischio ma migliorando la diversificazione geografica",
        "Analizzare la possibilità di ridurre l'esposizione immobiliare diretta a favore di REIT globali per migliorare la liquidità e diversificazione del patrimonio reale",
        "Presentare un'analisi di scenario che mostri la performance storica del portafoglio attuale vs. quello diversificato proposto"
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
      max_tokens: 1000 // Limita la lunghezza della risposta
    });

    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in OpenAI response");
    }
    
    // Estrai il JSON dalla risposta (potrebbe essere avvolto in backtick o solo testo)
    let parsedData: AiClientProfile;
    try {
      // Prima prova a estrarre il JSON se è avvolto in backtick
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      
      if (jsonMatch && jsonMatch[1]) {
        parsedData = JSON.parse(jsonMatch[1]);
      } else {
        // Altrimenti prova a parsare l'intero contenuto come JSON
        parsedData = JSON.parse(content);
      }
    } catch (error) {
      console.error("Error parsing OpenAI response:", error);
      console.log("Raw response:", content);
      
      // Se non riesci a parsare il JSON, crea un oggetto formattato manualmente
      // cercando di separare gli approfondimenti dai suggerimenti nel testo
      const sections = content.split(/\n\s*#{1,3}\s*Suggerimenti|Raccomandazioni|Azioni/i);
      
      // Crea array di oggetti con title/description e actions
      const formatTextToObjects = (text: string) => {
        const lines = text.split(/\n+/).filter(line => line.trim());
        const result = [];
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          // Se la riga sembra un titolo
          if (line.startsWith('- ') || line.startsWith('* ') || /^\d+\./.test(line)) {
            const title = line.replace(/^[-*\d.]\s+/, '');
            let description = '';
            let actions: string[] = [];
            
            // Raccogliamo le righe successive che sembrano essere descrizioni o azioni
            let j = i + 1;
            while (j < lines.length) {
              const nextLine = lines[j].trim();
              
              // Se la linea inizia con un nuovo punto, abbiamo raggiunto un nuovo elemento
              if (nextLine.startsWith('- ') || nextLine.startsWith('* ') || /^\d+\./.test(nextLine)) {
                break;
              }
              
              // Se la linea contiene "Azione:" o "Action:" o inizia con "→", la trattiamo come un'azione
              if (nextLine.includes("Azione:") || nextLine.includes("Action:") || nextLine.startsWith("→") || nextLine.startsWith("->")) {
                actions.push(nextLine.replace(/^(→|->|Azione:|Action:)\s*/, '').trim());
              } else {
                // Altrimenti, aggiungiamola alla descrizione
                if (description) description += ' '; // Spazio tra paragrafi
                description += nextLine;
              }
              
              j++;
            }
            
            // Aggiorniamo i per saltare le righe che abbiamo già analizzato
            i = j - 1;
            
            result.push({ 
              title, 
              description,
              actions: actions.length > 0 ? actions : undefined
            });
          }
        }
        
        // Se non abbiamo trovato nulla con la struttura attesa, crea un elemento con tutto il testo
        if (result.length === 0 && text.trim()) {
          result.push({ 
            title: "Informazione",
            description: text.trim()
          });
        }
        
        return result;
      };
      
      // Estrai il testo per le raccomandazioni/approfondimenti
      const mainText = sections[0].replace(/\s*#{1,3}\s*(Approfondimenti|Raccomandazioni)\s*/i, '').trim();
      
      // Crea il nuovo formato unificato
      parsedData = {
        raccomandazioni: formatTextToObjects(mainText),
        
        // Manteniamo anche i vecchi campi per retrocompatibilità
        approfondimenti: formatTextToObjects(mainText),
        suggerimenti: sections.length > 1 
          ? formatTextToObjects(sections[1].trim()) 
          : [{ title: "Nota", description: "Nessun suggerimento specifico disponibile." }]
      };
    }
    
    // Usa solo il nuovo formato unificato (raccomandazioni)
    
    // Se i dati hanno raccomandazioni, usa solo quelle
    if (parsedData.raccomandazioni) {
      return {
        raccomandazioni: parsedData.raccomandazioni
      };
    }
    
    // Se i dati hanno approfondimenti/suggerimenti, crea delle raccomandazioni
    // combinando gli approfondimenti e i suggerimenti
    if (parsedData.approfondimenti || parsedData.suggerimenti) {
      // Converte i vecchi dati in un formato più semplice
      const approfondimenti = Array.isArray(parsedData.approfondimenti) ? parsedData.approfondimenti : [];
      const suggerimenti = Array.isArray(parsedData.suggerimenti) ? parsedData.suggerimenti : [];
      
      // Crea raccomandazioni dalla combinazione di approfondimenti e suggerimenti
      const raccomandazioni = approfondimenti.map((item, index) => {
        const suggerimento = suggerimenti[index % suggerimenti.length];
        return {
          title: item.title || "Raccomandazione",
          description: item.description || "",
          actions: suggerimento ? 
            [(suggerimento.description || "").startsWith("Suggerisco di") ? 
              (suggerimento.description || "") : 
              `Suggerisco di ${suggerimento.description || ""}`] : 
            undefined
        };
      });
      
      return {
        raccomandazioni: raccomandazioni.length > 0 ? raccomandazioni : [
          {
            title: "Analisi profilo cliente",
            description: "Genera un nuovo profilo utilizzando il pulsante 'Aggiorna' per ottenere raccomandazioni nel nuovo formato.",
            actions: ["Clicca sul pulsante 'Aggiorna' in alto a destra per generare raccomandazioni nel nuovo formato."]
          }
        ]
      };
    }
    
    // Fallback: restituisci un oggetto con una singola raccomandazione vuota
    return {
      raccomandazioni: [
        {
          title: "Dati insufficienti",
          description: "Non ci sono abbastanza dati per generare raccomandazioni complete. Prova ad aggiornare il profilo.",
          actions: ["Clicca sul pulsante 'Aggiorna' in alto a destra per generare nuove raccomandazioni."]
        }
      ]
    };
  } catch (error) {
    console.error("Error generating client profile:", error);
    throw error;
  }
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
- Esperienza di investimento: ${formatValue(mifid.investmentExperience)}
- Orizzonte di investimento: ${formatValue(mifid.investmentHorizon)}
- Reddito annuale: ${formatValue(mifid.annualIncome, 'money')}
- Spese mensili: ${formatValue(mifid.monthlyExpenses, 'money')}
- Debiti: ${formatValue(mifid.debts, 'money')}
- Dipendenti: ${formatValue(mifid.dependents)}
- Stato occupazione: ${formatValue(mifid.employmentStatus)}

## Interessi Specifici (da 1 a 5 dove 1 è massimo interesse)
- Crescita patrimoniale: ${formatValue(mifid.wealthGrowthInterest)}
- Generazione di reddito: ${formatValue(mifid.incomeGenerationInterest)}
- Conservazione del capitale: ${formatValue(mifid.capitalPreservationInterest)}
- Pianificazione patrimoniale: ${formatValue(mifid.estatePlanningInterest)}
- Pensionamento: ${formatValue(mifid.retirementInterest)}
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
Analizza il profilo del cliente e la cronologia delle interazioni per creare delle raccomandazioni personalizzate.

Ogni raccomandazione deve:
1. Identificare un aspetto rilevante del profilo finanziario del cliente
2. Fornire una spiegazione contestualizzata che mostri comprensione della situazione
3. Proporre 2-3 azioni concrete e specifiche che il consulente dovrebbe intraprendere

Rispondi in italiano usando un formato JSON con un campo principale:
- "raccomandazioni": un array di oggetti con campi "title", "description" e "actions"

IMPORTANTE:
- Le interazioni sono ordinate dalla più recente alla meno recente. Dai priorità alle informazioni più recenti.
- Non separare approfondimenti e suggerimenti, ma integra analisi e azioni in un'unica raccomandazione.
- Le azioni devono essere specifiche, realizzabili e rilevanti per questo cliente specifico.
- Identifica 3-5 raccomandazioni significative.

Esempio di formato:
{
  "raccomandazioni": [
    {
      "title": "Ottimizzazione del portafoglio ad alto rischio",
      "description": "Il cliente presenta un profilo di rischio aggressivo con concentrazione in azioni tech e immobili che aumenta la volatilità senza necessariamente migliorare i rendimenti attesi.",
      "actions": [
        "Proporre l'introduzione di ETF su mercati emergenti per un 15% del portafoglio azionario",
        "Analizzare la possibilità di ridurre l'esposizione immobiliare diretta a favore di REIT globali",
        "Presentare un'analisi di scenario comparativa tra portafoglio attuale e proposta diversificata"
      ]
    }
  ]
}
`;

  // Debug: stampa il prompt completo
  console.log("[DEBUG] PROMPT COMPLETO PER OPENAI:");
  console.log("---------------------------------------");
  console.log(prompt);
  console.log("---------------------------------------");

  return prompt;
}