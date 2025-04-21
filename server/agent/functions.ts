import { OpenAI } from 'openai';
import { db } from '../db';
import { clients, aiProfiles, assets, mifid, recommendations, clientLogs, verifiedDocuments } from '../../shared/schema';
import { eq, desc, and, or, like } from 'drizzle-orm';
import { getCompleteClientData } from './clientDataFetcher';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Ottiene tutte le informazioni disponibili su un cliente e le fornisce come contesto per l'assistente
 * Permette risposte più naturali e contestualizzate alle domande dell'utente 
 */
export async function getClientContext(clientName: string, query: string, userId: number) {
  console.log(`[DEBUG] Inizio ricerca contesto cliente: "${clientName}"`);
  try {
    // Dividi il nome per cercare di estrarre nome e cognome
    const nameParts = clientName.trim().split(/\s+/);
    let firstName = '';
    let lastName = '';
    
    if (nameParts.length >= 2) {
      // Se ci sono almeno due parti, assume che la prima sia il nome e l'ultima il cognome
      firstName = nameParts[0];
      lastName = nameParts[nameParts.length - 1];
    } else if (nameParts.length === 1) {
      // Se c'è solo una parte, cerca di abbinare con nome o cognome
      firstName = nameParts[0];
      lastName = nameParts[0];
    }
    
    console.log(`[DEBUG] Ricerca cliente - Nome: "${firstName}", Cognome: "${lastName}"`);
    
    // Utilizziamo la nuova funzione per ottenere i dati completi del cliente
    const result = await getCompleteClientData(firstName, lastName);
    
    if (!result.success || !result.clientData) {
      return {
        success: false,
        error: result.error || `Cliente "${clientName}" non trovato o dati incompleti.`,
        query: query
      };
    }
    
    // Adattiamo i dati ottenuti per mantenere compatibilità con il formato esistente
    const clientData = result.clientData;
    
    // Assicuriamoci che le informazioni di base esistano
    if (!clientData.personalInformation || !clientData.personalInformation.data) {
      return {
        success: false,
        error: `Dati del cliente "${clientName}" incompleti o non disponibili.`,
        query: query
      };
    }
    
    const personalInfo = clientData.personalInformation.data;
    const client = {
      id: personalInfo.id?.value || 0,
      firstName: personalInfo.firstName?.value || firstName,
      lastName: personalInfo.lastName?.value || lastName
    };
    
    return {
      success: true,
      clientInfo: clientData,
      dataCompleteness: clientData.metadata?.dataCompleteness || {},
      query: query,
      message: `Ho trovato informazioni su ${client.firstName} ${client.lastName}.`
    };
    
  } catch (error) {
    console.error("Errore nel recupero del contesto del cliente:", error);
    return {
      success: false,
      error: "Errore nel recupero delle informazioni sul cliente: " + (error instanceof Error ? error.message : "Errore sconosciuto"),
      query: query
    };
  }
}

// Funzione helper per estrarre i principali obiettivi d'investimento
function getTopInvestmentGoals(mifidData: any) {
  const goals = [
    { name: "Pensione", value: mifidData.retirementInterest },
    { name: "Crescita del patrimonio", value: mifidData.wealthGrowthInterest },
    { name: "Generazione di reddito", value: mifidData.incomeGenerationInterest },
    { name: "Preservazione del capitale", value: mifidData.capitalPreservationInterest },
    { name: "Pianificazione successoria", value: mifidData.estatePlanningInterest }
  ];
  
  return goals
    .sort((a, b) => a.value - b.value)
    .slice(0, 3)
    .map(g => `${g.name} (${g.value}/5, priorità massima = 1)`)
    .join(", ");
}

// Helper per formattare le date
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
