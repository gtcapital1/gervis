/**
 * OpenAI Service
 * 
 * Questo modulo fornisce un'interfaccia per interagire con l'API di OpenAI.
 * Utilizzato per generare il profilo arricchito del cliente basato su dati esistenti.
 */

import { Client, ClientLog } from '@shared/schema';
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
 * @param logs I log delle interazioni con il cliente
 * @returns Profilo arricchito con approfondimenti e suggerimenti
 */
export async function generateClientProfile(
  client: Client, 
  logs: ClientLog[]
): Promise<AiClientProfile> {
  // Verifica se la chiave API OpenAI è impostata
  if (!OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY not found in environment variables");
    throw new Error("OpenAI API key not configured");
  }

  try {
    // Crea un prompt dettagliato per GPT-4 utilizzando i dati del cliente e i log
    const prompt = createClientProfilePrompt(client, logs);
    
    // Chiama l'API OpenAI
    const completionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
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
      })
    });

    if (!completionResponse.ok) {
      const errorData = await completionResponse.json() as any;
      console.error("OpenAI API error:", errorData);
      
      // Verifica se si tratta di un errore di quota/credito
      if (errorData.error && (
        errorData.error.code === 'insufficient_quota' || 
        errorData.error.message?.includes('quota') ||
        errorData.error.message?.includes('billing')
      )) {
        throw new Error("Credito OpenAI esaurito o quota insufficiente. Controlla il tuo account OpenAI.");
      }
      
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const responseData = await completionResponse.json() as any;
    const content = responseData.choices?.[0]?.message?.content;
    
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
    
    // Gestisci sia il nuovo formato che quello vecchio per retrocompatibilità
    
    // Se i dati sono nel nuovo formato (raccomandazioni)
    if (parsedData.raccomandazioni) {
      return {
        raccomandazioni: parsedData.raccomandazioni
      };
    }
    
    // Se i dati sono nel vecchio formato, convertili nel nuovo formato
    if (parsedData.approfondimenti || parsedData.suggerimenti) {
      // Convertili nel nuovo formato per retrocompatibilità
      return {
        raccomandazioni: parsedData.raccomandazioni || [],
        approfondimenti: parsedData.approfondimenti || '',
        suggerimenti: parsedData.suggerimenti || ''
      };
    }
    
    // Fallback: restituisci un oggetto vuoto
    return {
      raccomandazioni: [],
      approfondimenti: '',
      suggerimenti: ''
    };
  } catch (error) {
    console.error("Error generating client profile:", error);
    throw error;
  }
}

/**
 * Crea un prompt dettagliato per GPT-4 utilizzando i dati del cliente e i log
 */
function createClientProfilePrompt(client: Client, logs: ClientLog[]): string {
  // Formatta i dati del cliente in un prompt strutturato
  let prompt = `
# Profilo Cliente
- Nome: ${client.name || "Non specificato"}
- Email: ${client.email || "Non specificata"}
- Profilo di rischio: ${client.riskProfile || "Non specificato"}
- Esperienza di investimento: ${client.investmentExperience || "Non specificata"}
- Orizzonte di investimento: ${client.investmentHorizon || "Non specificato"}
- Obiettivi di investimento: ${Array.isArray(client.investmentGoals) ? client.investmentGoals.join(", ") : "Non specificati"}
${client.annualIncome ? `- Reddito annuale: €${client.annualIncome}` : ''}
${client.netWorth ? `- Patrimonio netto: €${client.netWorth}` : ''}
${client.monthlyExpenses ? `- Spese mensili: €${client.monthlyExpenses}` : ''}
${client.dependents ? `- Dipendenti: ${client.dependents}` : ''}
${client.employmentStatus ? `- Stato occupazione: ${client.employmentStatus}` : ''}
${client.personalInterests ? `- Interessi personali: ${client.personalInterests.join(", ")}` : ''}
${client.personalInterestsNotes ? `- Note sugli interessi: ${client.personalInterestsNotes}` : ''}

## Interessi Specifici (da 1 a 5 dove 5 è massimo interesse)
${client.retirementInterest ? `- Pensionamento: ${client.retirementInterest}` : ''}
${client.wealthGrowthInterest ? `- Crescita patrimoniale: ${client.wealthGrowthInterest}` : ''}
${client.incomeGenerationInterest ? `- Generazione di reddito: ${client.incomeGenerationInterest}` : ''}
${client.capitalPreservationInterest ? `- Conservazione del capitale: ${client.capitalPreservationInterest}` : ''}
${client.estatePlanningInterest ? `- Pianificazione patrimoniale: ${client.estatePlanningInterest}` : ''}
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

  return prompt;
}