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
}

interface AiClientProfile {
  approfondimenti: ProfileItem[] | string; // Preferibilmente array di oggetti, stringa per retrocompatibilità
  suggerimenti: ProfileItem[] | string; // Preferibilmente array di oggetti, stringa per retrocompatibilità
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
            content: `Sei un esperto consulente finanziario. Analizza i dati del cliente e genera un profilo arricchito con approfondimenti e suggerimenti.
            
Rispondi in italiano, in formato JSON con due campi principali:
- "approfondimenti": un array di oggetti con campi "title" e "description"
- "suggerimenti": un array di oggetti con campi "title" e "description"

IMPORTANTE: Le interazioni del cliente sono ordinate dalla più recente alla meno recente. Quando trovi informazioni contrastanti o cambiamenti nelle preferenze del cliente nel tempo, dai sempre priorità alle informazioni più recenti, in quanto rappresentano l'evoluzione più attuale delle preferenze e della situazione del cliente.

Esempio di formato di risposta:
{
  "approfondimenti": [
    { "title": "Profilo di Rischio Aggressivo", "description": "Il cliente mostra una forte propensione al rischio come evidenziato dalle sue scelte di investimento..." },
    { "title": "Focus sulla Pianificazione Patrimoniale", "description": "L'interesse principale del cliente è la pianificazione patrimoniale (punteggio 5/5)..." }
  ],
  "suggerimenti": [
    { "title": "Diversificazione del Portafoglio", "description": "Considerando l'alta concentrazione in azioni tech e immobili, suggerirei di..." },
    { "title": "Strategie di Pianificazione Fiscale", "description": "Dato il focus sulla pianificazione patrimoniale, sarebbe utile esplorare..." }
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
      const sections = content.split(/\n\s*#{1,3}\s*Suggerimenti/i);
      
      // Crea array di oggetti con title/description
      const formatTextToObjects = (text: string) => {
        const lines = text.split(/\n+/).filter(line => line.trim());
        const result = [];
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          // Se la riga sembra un titolo
          if (line.startsWith('- ') || line.startsWith('* ') || /^\d+\./.test(line)) {
            const title = line.replace(/^[-*\d.]\s+/, '');
            let description = '';
            
            // Se c'è una riga successiva, usala come descrizione
            if (i + 1 < lines.length && !lines[i+1].startsWith('- ') && !lines[i+1].startsWith('* ') && !/^\d+\./.test(lines[i+1])) {
              description = lines[i+1].trim();
              i++; // Salta la prossima riga
            }
            
            result.push({ title, description });
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
      
      const approfondimentiText = sections[0].replace(/\s*#{1,3}\s*Approfondimenti\s*/i, '').trim();
      const suggerimentiText = sections.length > 1 ? sections[1].trim() : 'Nessun suggerimento disponibile.';
      
      parsedData = {
        approfondimenti: formatTextToObjects(approfondimentiText),
        suggerimenti: formatTextToObjects(suggerimentiText)
      };
    }
    
    // Conserva il tipo originale della risposta senza forzare la conversione a stringa
    return {
      approfondimenti: parsedData.approfondimenti || '',
      suggerimenti: parsedData.suggerimenti || ''
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
Analizza il profilo del cliente e la cronologia delle interazioni per creare:

1. APPROFONDIMENTI: Una comprensione approfondita delle esigenze, degli obiettivi e del comportamento finanziario del cliente.
2. SUGGERIMENTI: Proposte concrete per migliorare la consulenza finanziaria per questo cliente.

Rispondi in italiano usando un formato JSON con due campi principali:
- "approfondimenti": un array di oggetti con campi "title" e "description"
- "suggerimenti": un array di oggetti con campi "title" e "description"

IMPORTANTE: Le interazioni sono ordinate dalla più recente alla meno recente. Dai priorità alle informazioni contenute nelle interazioni più recenti quando ci sono informazioni contrastanti o evoluzione nelle preferenze del cliente.

Evita di replicare i dati del profilo. Invece, fornisci insight che non siano immediatamente evidenti dai dati.
Identifica almeno 3-4 approfondimenti e 3-4 suggerimenti significativi.
`;

  return prompt;
}