/**
 * Servizi di intelligenza artificiale per l'arricchimento dei profili clienti
 * Utilizza OpenAI GPT-4 per generare approfondimenti e suggerimenti basati sui log
 * e sui dati del cliente.
 */
import { OpenAI } from 'openai';
import { Client, ClientLog } from '@shared/schema';

// Inizializza il client OpenAI con la chiave API dall'ambiente
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Temperatura più bassa per risultati più deterministici e coerenti
const DEFAULT_TEMPERATURE = 0.3;

export interface ProfileEnrichment {
  approfondimenti: string;
  suggerimenti: string;
}

/**
 * Verifica che la configurazione OpenAI sia valida
 * @returns true se la configurazione è valida, false altrimenti
 */
export async function verifyOpenAIConfiguration(): Promise<boolean> {
  try {
    // Effettua una semplice chiamata per verificare la validità della chiave API
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "Questo è un test di verifica della configurazione OpenAI." },
        { role: "user", content: "Rispondi solo con 'OK' per confermare che la configurazione funziona." }
      ],
      temperature: 0.1,
      max_tokens: 5
    });
    
    const responseText = response.choices[0]?.message?.content || '';
    return responseText.includes("OK");
  } catch (error) {
    console.error("Errore durante la verifica della configurazione OpenAI:", error);
    return false;
  }
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
  try {
    // Formatta i dati del cliente e i log per il prompt
    const clientInfo = formatClientInfo(client);
    const logsInfo = formatLogsInfo(logs);
    
    // Costruisci il prompt per OpenAI
    const systemPrompt = `
Sei un assistente specializzato in consulenza finanziaria e wealth management.
Il tuo compito è analizzare i dati di un cliente e la cronologia delle interazioni per generare:
1. APPROFONDIMENTI: Analisi approfondita del profilo del cliente, obiettivi finanziari, comportamenti, preferenze e potenziali esigenze non espresse.
2. SUGGERIMENTI: Consigli pratici per il consulente su come migliorare la relazione, opportunità di cross-selling, e argomenti da discutere nei prossimi incontri.

Rispondi in italiano con uno stile professionale ma accessibile.
Genera una risposta in formato JSON con due campi:
{
  "approfondimenti": "testo dettagliato con analisi e approfondimenti...",
  "suggerimenti": "elenco puntato di suggerimenti pratici..."
}
`;

    const userPrompt = `
DATI DEL CLIENTE:
${clientInfo}

CRONOLOGIA INTERAZIONI:
${logsInfo}

Analizza queste informazioni e genera approfondimenti e suggerimenti personalizzati per questo cliente.
`;

    // Chiamata a OpenAI GPT-4
    const response = await openai.chat.completions.create({
      model: "gpt-4", // Utilizziamo GPT-4 per analisi complesse
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: DEFAULT_TEMPERATURE,
      max_tokens: 1000, // Limita la lunghezza della risposta
      response_format: { type: "json_object" } // Richiedi una risposta in formato JSON
    });
    
    // Estrai e analizza la risposta JSON
    const responseText = response.choices[0]?.message?.content || '';
    
    try {
      const jsonResponse = JSON.parse(responseText) as ProfileEnrichment;
      return {
        approfondimenti: jsonResponse.approfondimenti || "Nessun approfondimento disponibile.",
        suggerimenti: jsonResponse.suggerimenti || "Nessun suggerimento disponibile."
      };
    } catch (parseError) {
      console.error("Errore nel parsing della risposta JSON:", parseError);
      // Fallback in caso di errore nel parsing JSON
      return {
        approfondimenti: "Si è verificato un errore nell'analisi dei dati. Riprova più tardi.",
        suggerimenti: "Si è verificato un errore nella generazione dei suggerimenti. Riprova più tardi."
      };
    }
  } catch (error) {
    console.error("Errore durante la generazione del profilo arricchito:", error);
    throw new Error("Impossibile generare il profilo arricchito. Verifica la configurazione OpenAI.");
  }
}

/**
 * Formatta le informazioni del cliente per il prompt
 */
function formatClientInfo(client: Client): string {
  const personalInterests = client.personalInterests 
    ? `- Interessi personali: ${client.personalInterests.join(', ')}`
    : '';
  
  return `
- Nome: ${client.firstName} ${client.lastName}
- Email: ${client.email}
- Telefono: ${client.phone || 'Non specificato'}
- Indirizzo: ${client.address || 'Non specificato'}
- Codice fiscale: ${client.taxCode || 'Non specificato'}
- Stato occupazione: ${client.employmentStatus || 'Non specificato'}
- Familiari a carico: ${client.dependents !== undefined ? client.dependents : 'Non specificato'}
- Reddito annuale: ${client.annualIncome !== null && client.annualIncome !== undefined ? '€' + client.annualIncome.toLocaleString() : 'Non specificato'}
- Spese mensili: ${client.monthlyExpenses !== null && client.monthlyExpenses !== undefined ? '€' + client.monthlyExpenses.toLocaleString() : 'Non specificato'}
- Patrimonio netto: ${client.netWorth !== null && client.netWorth !== undefined ? '€' + client.netWorth.toLocaleString() : 'Non specificato'}
- Profilo di rischio: ${client.riskProfile || 'Non specificato'}
- Esperienza di investimento: ${client.investmentExperience || 'Non specificato'}
- Orizzonte temporale: ${client.investmentHorizon || 'Non specificato'}
${personalInterests}
- Interesse per pensionamento: ${client.retirementInterest !== undefined ? `${client.retirementInterest}/5` : 'Non specificato'}
- Interesse per crescita patrimoniale: ${client.wealthGrowthInterest !== undefined ? `${client.wealthGrowthInterest}/5` : 'Non specificato'}
- Interesse per generazione reddito: ${client.incomeGenerationInterest !== undefined ? `${client.incomeGenerationInterest}/5` : 'Non specificato'}
- Interesse per preservazione capitale: ${client.capitalPreservationInterest !== undefined ? `${client.capitalPreservationInterest}/5` : 'Non specificato'}
- Interesse per pianificazione ereditaria: ${client.estatePlanningInterest !== undefined ? `${client.estatePlanningInterest}/5` : 'Non specificato'}
`;
}

/**
 * Formatta i log delle interazioni per il prompt
 */
function formatLogsInfo(logs: ClientLog[]): string {
  if (!logs || logs.length === 0) {
    return "Nessuna interazione registrata.";
  }
  
  // Ordina i log per data (dal più recente al più vecchio)
  const sortedLogs = [...logs].sort((a, b) => 
    new Date(b.logDate).getTime() - new Date(a.logDate).getTime()
  );
  
  // Formatta ogni log
  return sortedLogs.map(log => {
    const date = new Date(log.logDate).toLocaleDateString('it-IT');
    let details = '';
    
    if (log.type === 'email' && log.emailSubject) {
      details = `Oggetto: ${log.emailSubject}`;
    }
    
    return `[${date}] ${log.type.toUpperCase()}: ${log.title}
${details}
${log.content}
`;
  }).join('\n---\n');
}