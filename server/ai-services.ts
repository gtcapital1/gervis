/**
 * Servizi di intelligenza artificiale per l'arricchimento dei profili clienti
 * Utilizza OpenAI GPT-4 per generare approfondimenti e suggerimenti basati sui log
 * e sui dati del cliente.
 */

import { Client, ClientLog } from "../shared/schema";
import OpenAI from "openai";

// Verifica che la chiave API sia disponibile
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("ERRORE: Chiave API OpenAI non trovata nelle variabili d'ambiente.");
  console.error("Assicurati di aggiungere OPENAI_API_KEY=sk-... nel file .env");
}

// Inizializza il client OpenAI solo se la chiave API è disponibile
const openai = apiKey ? new OpenAI({ apiKey }) : null;

export interface ProfileEnrichment {
  approfondimenti: string;
  suggerimenti: string;
}

/**
 * Genera un profilo arricchito del cliente utilizzando OpenAI GPT-4
 * @param client Dati del cliente dal questionario
 * @param logs Log delle interazioni con il cliente
 * @returns Profilo arricchito con approfondimenti e suggerimenti
 */
export async function generateEnrichedProfile(
  client: Client,
  logs: ClientLog[]
): Promise<ProfileEnrichment> {
  // Verifica che il client OpenAI sia inizializzato
  if (!openai) {
    throw new Error(
      "Client OpenAI non inizializzato. Verifica la tua chiave API."
    );
  }

  try {
    // Formatta i dati del cliente per il prompt
    const clientInfo = formatClientInfo(client);
    
    // Formatta i log delle interazioni per il prompt
    const logsInfo = formatLogsInfo(logs);
    
    // Crea il prompt di sistema
    const systemPrompt = `
    Sei un consulente finanziario esperto che analizza dati di clienti per fornire approfondimenti e suggerimenti.
    Rispondi in italiano.
    Genera una risposta in formato JSON con due sezioni: "approfondimenti" e "suggerimenti".
    Gli approfondimenti devono evidenziare caratteristiche della personalità, preferenze finanziarie e comportamenti del cliente.
    I suggerimenti devono essere azioni concrete che il consulente può intraprendere per migliorare la relazione e le strategie finanziarie.
    `;
    
    // Crea il prompt utente
    const userPrompt = `
    Informazioni cliente:
    ${clientInfo}
    
    Log delle interazioni:
    ${logsInfo}
    
    Analizza queste informazioni e genera:
    1. Approfondimenti sulla personalità, preferenze e comportamenti finanziari del cliente.
    2. Suggerimenti su come migliorare la relazione e le strategie di investimento.
    `;
    
    // Chiama l'API OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });
    
    // Estrai il contenuto della risposta
    const responseContent = response.choices[0].message.content;
    
    // Parsa il JSON
    if (!responseContent) {
      throw new Error("Risposta vuota dall'API OpenAI");
    }
    
    const parsedResponse = JSON.parse(responseContent);
    
    // Verifica che contenga i campi necessari
    if (!parsedResponse.approfondimenti || !parsedResponse.suggerimenti) {
      throw new Error("Formato risposta non valido dall'API OpenAI");
    }
    
    return {
      approfondimenti: parsedResponse.approfondimenti,
      suggerimenti: parsedResponse.suggerimenti
    };
    
  } catch (error: any) {
    console.error("Errore durante la generazione del profilo arricchito:", error);
    
    // Gestione più dettagliata degli errori
    if (error.response) {
      console.error(`Stato: ${error.response.status}`);
      console.error(`Messaggio: ${error.response.data.error.message}`);
    }
    
    // Restituisci un messaggio di fallback
    return {
      approfondimenti: "Non è stato possibile generare approfondimenti. Si prega di riprovare più tardi.",
      suggerimenti: "Non è stato possibile generare suggerimenti. Si prega di riprovare più tardi."
    };
  }
}

/**
 * Formatta le informazioni del cliente per il prompt
 */
function formatClientInfo(client: Client): string {
  const interests = client.personalInterests 
    ? `Interessi personali: ${client.personalInterests.join(', ')}`
    : 'Interessi personali: Non specificati';
  
  const goals = client.investmentGoals && client.investmentGoals.length > 0
    ? `Obiettivi di investimento: ${client.investmentGoals.join(', ')}`
    : 'Obiettivi di investimento: Non specificati';
  
  return `
Nome: ${client.firstName} ${client.lastName}
Email: ${client.email}
Profilo di rischio: ${client.riskProfile}
Esperienza di investimento: ${client.investmentExperience}
${goals}
Orizzonte temporale: ${client.investmentHorizon}
${interests}
Note sugli interessi: ${client.personalInterestsNotes || 'Nessuna nota'}
Interesse pensionamento: ${client.retirementInterest || 'Non specificato'}/5
Interesse crescita patrimoniale: ${client.wealthGrowthInterest || 'Non specificato'}/5
Interesse generazione reddito: ${client.incomeGenerationInterest || 'Non specificato'}/5
Interesse preservazione capitale: ${client.capitalPreservationInterest || 'Non specificato'}/5
Interesse pianificazione successoria: ${client.estatePlanningInterest || 'Non specificato'}/5
Reddito annuale: ${client.annualIncome || 'Non specificato'}
Patrimonio netto: ${client.netWorth || 'Non specificato'}
Spese mensili: ${client.monthlyExpenses || 'Non specificato'}
Persone a carico: ${client.dependents || 'Non specificato'}
Stato occupazionale: ${client.employmentStatus || 'Non specificato'}
  `;
}

/**
 * Formatta i log delle interazioni per il prompt
 */
function formatLogsInfo(logs: ClientLog[]): string {
  if (!logs || logs.length === 0) {
    return "Nessun log di interazione disponibile.";
  }
  
  return logs.map(log => {
    const date = new Date(log.logDate).toLocaleDateString('it-IT');
    let content = `[${date}] [${log.type}] ${log.title}:\n${log.content}`;
    
    if (log.type === 'email' && log.emailSubject) {
      content = `[${date}] [Email] ${log.emailSubject}:\n${log.content}`;
    }
    
    return content;
  }).join('\n\n');
}