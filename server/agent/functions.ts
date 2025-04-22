import { OpenAI } from 'openai';
import { db } from '../db';
import { clients, aiProfiles, assets, mifid, recommendations, clientLogs, verifiedDocuments, meetings } from '../../shared/schema';
import { eq, desc, and, or, like, gte, lte, between } from 'drizzle-orm';
import { getCompleteClientData } from './clientDataFetcher';
import { format, parse, parseISO, isValid, addDays, startOfDay, endOfDay, formatISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { findClientByName } from '../services/clientProfileService';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
/**
 * Cerca appuntamenti in un intervallo di date
 * @param dateRange Intervallo di date in formato {"startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD"}
 * @param userId ID dell'utente (advisor) attualmente autenticato
 * @returns Lista di appuntamenti nel periodo specificato
 */
export async function getMeetingsByDateRange(dateRange: { startDate: string; endDate: string }, userId: number) {
  try {
    console.log(`[DEBUG] Ricerca appuntamenti tra ${dateRange.startDate} e ${dateRange.endDate}`);
    
    // Converti le date in oggetti Date
    const startDate = parseISO(dateRange.startDate);
    const endDate = parseISO(dateRange.endDate);
    
    // Verifica che le date siano valide
    if (!isValid(startDate) || !isValid(endDate)) {
      return {
        success: false,
        error: "Formato date non valido. Utilizza il formato YYYY-MM-DD."
      };
    }
    
    // Assicurati che la data di inizio sia l'inizio della giornata e la data di fine sia la fine della giornata
    const startDateTime = startOfDay(startDate);
    const endDateTime = endOfDay(endDate);
    
    // Recupera gli appuntamenti dal database
    const meetingsList = await db.select()
      .from(meetings)
      .where(
        and(
          eq(meetings.advisorId, userId),
          gte(meetings.dateTime, startDateTime),
          lte(meetings.dateTime, endDateTime)
        )
      )
      .orderBy(meetings.dateTime);
    
    // Formatta i dati per la risposta
    const formattedMeetings = meetingsList.map(meeting => ({
      id: meeting.id,
      clientId: meeting.clientId,
      subject: meeting.subject,
      dateTime: formatISO(meeting.dateTime),
      duration: meeting.duration,
      location: meeting.location,
      notes: meeting.notes,
      formattedDate: format(meeting.dateTime, 'dd/MM/yyyy', { locale: it }),
      formattedTime: format(meeting.dateTime, 'HH:mm', { locale: it })
    }));
    
    // Cerca i nomi dei clienti per gli appuntamenti trovati
    const clientIds = formattedMeetings
      .map(m => m.clientId)
      .filter((id): id is number => id !== null && id !== undefined)
      .filter((id, index, array) => array.indexOf(id) === index);
    
    // Se non ci sono clientIds, restituisci subito
    if (clientIds.length === 0) {
      return {
        success: true,
        meetings: [],
        count: 0,
        period: {
          start: dateRange.startDate,
          end: dateRange.endDate
        }
      };
    }
    
    // Costruisci la condizione OR per ciascun ID cliente
    const clientsData = await db.select({
      id: clients.id,
      firstName: clients.firstName, 
      lastName: clients.lastName
    })
    .from(clients)
    .where(
      or(...clientIds.map(id => eq(clients.id, id)))
    );
    
    // Crea una mappa per lookup veloce
    const clientsMap = new Map();
    clientsData.forEach(client => {
      clientsMap.set(client.id, `${client.firstName} ${client.lastName}`);
    });
    
    // Aggiungi i nomi dei clienti ai meeting
    const meetingsWithClientNames = formattedMeetings.map(meeting => ({
      ...meeting,
      clientName: clientsMap.get(meeting.clientId) || "Cliente sconosciuto"
    }));
    
    return {
      success: true,
      meetings: meetingsWithClientNames,
      count: meetingsWithClientNames.length,
      period: {
        start: dateRange.startDate,
        end: dateRange.endDate
      }
    };
  } catch (error) {
    console.error("Errore nella ricerca appuntamenti per data:", error);
    return {
      success: false,
      error: "Errore nel recupero degli appuntamenti: " + (error instanceof Error ? error.message : "Errore sconosciuto")
    };
  }
}

/**
 * Cerca appuntamenti per un cliente specifico
 * @param clientName Nome del cliente (intero o parziale)
 * @param userId ID dell'utente (advisor) attualmente autenticato
 * @returns Lista di appuntamenti per il cliente specificato
 */
export async function getMeetingsByClientName(clientName: string, userId: number) {
  try {
    console.log(`[DEBUG] Ricerca appuntamenti per cliente: "${clientName}"`);
    
    // Utilizza la funzione helper findClientByName per trovare l'ID cliente
    const clientId = await findClientByName(clientName, undefined, false);
    
    if (!clientId) {
      return {
        success: false,
        error: `Nessun cliente trovato con il nome "${clientName}".`
      };
    }
    
    // Verifica che il cliente appartenga all'advisor corrente
    const clientInfo = await db.select()
      .from(clients)
      .where(
        and(
          eq(clients.id, clientId),
          eq(clients.advisorId, userId)
        )
      );
    
    if (clientInfo.length === 0) {
      return {
        success: false,
        error: `Cliente trovato ma non appartiene all'advisor corrente.`
      };
    }
    
    // Cerca gli appuntamenti per questo cliente
    const meetingsList = await db.select()
      .from(meetings)
      .where(
        and(
          eq(meetings.advisorId, userId),
          eq(meetings.clientId, clientId)
        )
      )
      .orderBy(meetings.dateTime);
    
    // Formatta i dati per la risposta
    const formattedMeetings = meetingsList.map(meeting => ({
      id: meeting.id,
      clientId: meeting.clientId,
      subject: meeting.subject,
      dateTime: formatISO(meeting.dateTime),
      duration: meeting.duration,
      location: meeting.location,
      notes: meeting.notes,
      formattedDate: format(meeting.dateTime, 'dd/MM/yyyy', { locale: it }),
      formattedTime: format(meeting.dateTime, 'HH:mm', { locale: it })
    }));
    
    // Crea il nome cliente
    const client = clientInfo[0];
    const clientFullName = `${client.firstName} ${client.lastName}`;
    
    // Aggiungi i nomi dei clienti ai meeting
    const meetingsWithClientNames = formattedMeetings.map(meeting => ({
      ...meeting,
      clientName: clientFullName
    }));
    
    return {
      success: true,
      meetings: meetingsWithClientNames,
      count: meetingsWithClientNames.length,
      clients: [{
        id: clientId,
        name: clientFullName
      }]
    };
  } catch (error) {
    console.error("Errore nella ricerca appuntamenti per cliente:", error);
    return {
      success: false,
      error: "Errore nel recupero degli appuntamenti: " + (error instanceof Error ? error.message : "Errore sconosciuto")
    };
  }
}

/**
 * Prepara i dati per la creazione o modifica di un appuntamento
 * @param meetingData Dati dell'appuntamento (clientId, subject, dateTime, duration, location, notes)
 * @param userId ID dell'utente (advisor) attualmente autenticato
 * @returns Dati dell'appuntamento formattati correttamente per il dialog di creazione/modifica
 */
export async function prepareMeetingData(meetingData: {
  clientId: number | string;
  clientName?: string;
  subject?: string;
  dateTime?: string;
  duration?: number | string;
  location?: string;
  notes?: string;
}, userId: number) {
  try {
    console.log(`[DEBUG] Preparazione dati appuntamento`);
    
    // Cerca il cliente nel database per confermare che esista e appartiene all'advisor
    let clientId: number;
    let clientObj;
    
    if ((typeof meetingData.clientId === 'string' && isNaN(parseInt(meetingData.clientId))) || meetingData.clientName) {
      // Utilizza il nome cliente fornito, dando priorità a clientName se entrambi sono disponibili
      const clientNameToSearch = meetingData.clientName || meetingData.clientId.toString();
      
      console.log(`[DEBUG] Ricerca cliente per nome: "${clientNameToSearch}"`);
      
      // Usa la funzione findClientByName per trovare l'ID cliente
      const foundClientId = await findClientByName(clientNameToSearch, undefined, false);
      
      if (!foundClientId) {
        return {
          success: false,
          error: `Nessun cliente trovato con il nome "${clientNameToSearch}".`
        };
      }
      
      // Poi recupera i dettagli completi del cliente
      const matchingClient = await db.select()
        .from(clients)
        .where(
          and(
            eq(clients.id, foundClientId),
            eq(clients.advisorId, userId)
          )
        )
        .limit(1);
      
      if (matchingClient.length === 0) {
        return {
          success: false,
          error: `Cliente trovato ma non appartiene all'advisor corrente.`
        };
      }
      
      clientObj = matchingClient[0];
      clientId = clientObj.id;
    } else {
      // Altrimenti usa l'ID cliente fornito
      clientId = typeof meetingData.clientId === 'string' ? parseInt(meetingData.clientId) : meetingData.clientId;
      
      if (isNaN(clientId)) {
        return {
          success: false,
          error: "ID cliente non valido."
        };
      }
      
      const matchingClient = await db.select()
        .from(clients)
        .where(
          and(
            eq(clients.id, clientId),
            eq(clients.advisorId, userId)
          )
        )
        .limit(1);
      
      if (matchingClient.length === 0) {
        return {
          success: false,
          error: `Nessun cliente trovato con ID ${clientId}.`
        };
      }
      
      clientObj = matchingClient[0];
    }
    
    // Formatta la data e l'ora se specificati
    let formattedDateTime = new Date();
    let extractedHours = -1;
    let extractedMinutes = -1;
    
    if (meetingData.dateTime) {
      console.log(`[DEBUG] Ricevuto dateTime: ${meetingData.dateTime}`);
      
      // Verifica se l'input è un'espressione testuale come "domani alle 15" o "oggi alle 10:30"
      const timeRegex = /alle\s+(\d{1,2})(?::(\d{1,2}))?/i;
      const timeMatch = meetingData.dateTime.match(timeRegex);
      
      if (timeMatch) {
        // Abbiamo trovato un'espressione "alle XX:YY"
        extractedHours = parseInt(timeMatch[1]);
        extractedMinutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        
        console.log(`[DEBUG] Estratta ora: ${extractedHours}:${extractedMinutes} dall'espressione testuale`);
        
        // Mantieni la data attuale ma imposta l'ora specificata
        formattedDateTime.setHours(extractedHours);
        formattedDateTime.setMinutes(extractedMinutes);
        formattedDateTime.setSeconds(0);
        formattedDateTime.setMilliseconds(0);
        
        // Gestisci espressioni come "domani" o "dopodomani"
        if (meetingData.dateTime.toLowerCase().includes('domani')) {
          formattedDateTime.setDate(formattedDateTime.getDate() + 1);
          console.log(`[DEBUG] Impostata data a domani: ${formattedDateTime}`);
        } else if (meetingData.dateTime.toLowerCase().includes('dopodomani')) {
          formattedDateTime.setDate(formattedDateTime.getDate() + 2);
          console.log(`[DEBUG] Impostata data a dopodomani: ${formattedDateTime}`);
        }
      } else {
        // Prova a parsare come data ISO
        const parsedDate = parseISO(meetingData.dateTime);
        if (isValid(parsedDate)) {
          console.log(`[DEBUG] Parsata data ISO: ${parsedDate}`);
          formattedDateTime = parsedDate;
          // Estrai anche l'ora dalla data parsata (per essere coerenti)
          extractedHours = parsedDate.getHours();
          extractedMinutes = parsedDate.getMinutes();
        } else {
          console.log(`[DEBUG] Impossibile parsare la data, uso la data corrente`);
        }
      }
    }
    
    console.log(`[DEBUG] Data finale impostata: ${formattedDateTime}`);
    console.log(`[DEBUG] Ore estratte: ${extractedHours}:${extractedMinutes}`);
    
    // Prepara la durata
    const duration = typeof meetingData.duration === 'string' ? parseInt(meetingData.duration) : (meetingData.duration || 60);
    
    // Prepara i dati formattati per il dialog
    const preparedData = {
      clientId: clientObj.id,
      clientName: `${clientObj.firstName} ${clientObj.lastName}`,
      subject: meetingData.subject || "",
      dateTime: formatISO(formattedDateTime),
      formattedDate: format(formattedDateTime, 'dd/MM/yyyy', { locale: it }),
      // Override esplicito dell'ora formattata per evitare qualsiasi problema di fuso orario
      formattedTime: extractedHours >= 0 ? 
        `${extractedHours.toString().padStart(2, '0')}:${extractedMinutes.toString().padStart(2, '0')}` :
        format(formattedDateTime, 'HH:mm', { locale: it }),
      duration: isNaN(duration) ? 60 : duration,
      location: meetingData.location || "zoom",
      notes: meetingData.notes || ""
    };
    
    // Prepara un testo di risposta suggerita per l'AI
    const locationText = preparedData.location === "zoom" ? "via Zoom" : 
                     preparedData.location === "office" ? "in ufficio" :
                     preparedData.location === "client_office" ? "presso l'ufficio del cliente" :
                     preparedData.location === "phone" ? "telefonicamente" : 
                     preparedData.location;
    
    const suggestedResponse = `Rivedi e conferma dettagli meeting per favore.`;
    
    return {
      success: true,
      meetingData: preparedData,
      suggestedResponse: suggestedResponse
    };
  } catch (error) {
    console.error("Errore nella preparazione dei dati dell'appuntamento:", error);
    return {
      success: false,
      error: "Errore nella preparazione dei dati: " + (error instanceof Error ? error.message : "Errore sconosciuto")
    };
  }
}

/**
 * Prepara i dati per la modifica di un appuntamento esistente
 * @param searchParams Parametri per identificare l'appuntamento (id, clientName, date)
 * @param userId ID dell'utente (advisor) attualmente autenticato
 * @returns Dati dell'appuntamento da modificare, formattati per il dialog
 */
export async function prepareEditMeeting(searchParams: {
  meetingId?: number | string;
  clientName?: string;
  date?: string;
  time?: string;
  newDate?: string;     // Nuova data per l'aggiornamento
  newTime?: string;     // Nuova ora per l'aggiornamento
  newLocation?: string; // Nuova location per l'aggiornamento
  newDuration?: number | string; // Nuova durata per l'aggiornamento
  newNotes?: string;    // Nuove note per l'aggiornamento
}, userId: number) {
  try {
    console.log(`[DEBUG] Preparazione dati per modifica appuntamento`);
    
    let meetingToEdit;
    
    // Caso 1: Abbiamo l'ID del meeting - metodo più diretto
    if (searchParams.meetingId) {
      const meetingId = typeof searchParams.meetingId === 'string' 
        ? parseInt(searchParams.meetingId) 
        : searchParams.meetingId;
      
      if (isNaN(meetingId)) {
        return {
          success: false,
          error: "ID appuntamento non valido."
        };
      }
      
      meetingToEdit = await db.select()
        .from(meetings)
        .where(
          and(
            eq(meetings.id, meetingId),
            eq(meetings.advisorId, userId)
          )
        )
        .limit(1);
    }
    // Caso 2: Abbiamo nome cliente e data - dobbiamo cercare
    else if (searchParams.clientName && (searchParams.date || searchParams.time)) {
      // Trova l'ID cliente dal nome
      const clientId = await findClientByName(searchParams.clientName, undefined, false);
      
      if (!clientId) {
        return {
          success: false,
          error: `Nessun cliente trovato con il nome "${searchParams.clientName}".`
        };
      }
      
      // Costruisci la query base
      let query = db
        .select()
        .from(meetings)
        .where(
          and(
            eq(meetings.advisorId, userId),
            eq(meetings.clientId, clientId)
          )
        );
      
      // Se abbiamo una data, aggiungiamo un filtro per la data
      if (searchParams.date) {
        try {
          // Analizza la data nel formato italiano
          const dateParts = searchParams.date.split("/");
          if (dateParts.length === 3) {
            const [day, month, year] = dateParts;
            const parsedDate = new Date(`${year}-${month}-${day}`);
            
            if (isValid(parsedDate)) {
              const startOfSearchDay = startOfDay(parsedDate);
              const endOfSearchDay = endOfDay(parsedDate);
              
              query = query.where(
                and(
                  gte(meetings.dateTime, startOfSearchDay),
                  lte(meetings.dateTime, endOfSearchDay)
                )
              );
            }
          }
        } catch (error) {
          console.warn("Errore nell'analisi della data:", error);
          // Continuiamo comunque, magari troveremo il meeting in base ad altri criteri
        }
      }
      
      // Ordinamento per data (più recente prima)
      query = query.orderBy(desc(meetings.dateTime));
      
      // Esegui la query
      const foundMeetings = await query.limit(5);
      
      // Se abbiamo anche l'ora, filtriamo ulteriormente
      if (searchParams.time && foundMeetings.length > 1) {
        // Formatta l'ora per confrontarla
        const timeToFind = searchParams.time.trim();
        
        // Cerca il meeting che corrisponde all'ora specificata
        for (const meeting of foundMeetings) {
          const meetingTime = format(meeting.dateTime, 'HH:mm');
          if (meetingTime === timeToFind) {
            meetingToEdit = [meeting];
            break;
          }
        }
      } else if (foundMeetings.length > 0) {
        // Prendiamo il meeting più recente
        meetingToEdit = [foundMeetings[0]];
      }
    }
    
    // Verifica se abbiamo trovato un meeting
    if (!meetingToEdit || meetingToEdit.length === 0) {
      return {
        success: false,
        error: "Nessun appuntamento trovato con i criteri specificati."
      };
    }
    
    // Ottieni i dettagli del cliente
    const meeting = meetingToEdit[0];
    const clientInfo = await db.select()
      .from(clients)
      .where(eq(clients.id, meeting.clientId))
      .limit(1);
    
    if (clientInfo.length === 0) {
      return {
        success: false,
        error: "Cliente non trovato per questo appuntamento."
      };
    }
    
    const client = clientInfo[0];
    
    // Prepara i dati per il dialog di modifica
    let formattedDateTime = new Date(meeting.dateTime);
    
    // Applica le nuove informazioni se specificate
    if (searchParams.newDate || searchParams.newTime) {
      // Se abbiamo una nuova data, la analizziamo e aggiorniamo
      if (searchParams.newDate) {
        try {
          // Controllo se il formato è DD/MM/YYYY
          if (searchParams.newDate.includes('/')) {
            const [day, month, year] = searchParams.newDate.split('/').map(Number);
            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
              // Aggiorna la data mantenendo l'ora attuale
              formattedDateTime.setFullYear(year);
              formattedDateTime.setMonth(month - 1); // Mesi in JavaScript partono da 0
              formattedDateTime.setDate(day);
            }
          } else {
            // Prova a interpretare come data ISO
            const parsedDate = parseISO(searchParams.newDate);
            if (isValid(parsedDate)) {
              // Mantieni l'ora attuale ma aggiorna la data
              formattedDateTime.setFullYear(parsedDate.getFullYear());
              formattedDateTime.setMonth(parsedDate.getMonth());
              formattedDateTime.setDate(parsedDate.getDate());
            }
          }
        } catch (error) {
          console.warn("Errore nell'analisi della nuova data:", error);
        }
      }
      
      // Se abbiamo una nuova ora, la analizziamo e aggiorniamo
      if (searchParams.newTime) {
        try {
          // Formato standard HH:MM
          const [hours, minutes] = searchParams.newTime.split(':').map(Number);
          if (!isNaN(hours) && !isNaN(minutes)) {
            formattedDateTime.setHours(hours);
            formattedDateTime.setMinutes(minutes);
          }
        } catch (error) {
          console.warn("Errore nell'analisi della nuova ora:", error);
        }
      }
    }
    
    // Prepara la durata (originale o nuova se specificata)
    const duration = typeof searchParams.newDuration === 'string' 
      ? parseInt(searchParams.newDuration) 
      : (searchParams.newDuration || meeting.duration || 60);
    
    const preparedData = {
      id: meeting.id,
      clientId: client.id,
      clientName: `${client.firstName} ${client.lastName}`,
      subject: meeting.subject || "",
      dateTime: formatISO(formattedDateTime),
      formattedDate: format(formattedDateTime, 'dd/MM/yyyy', { locale: it }),
      formattedTime: format(formattedDateTime, 'HH:mm', { locale: it }),
      duration: isNaN(duration) ? meeting.duration || 60 : duration,
      location: searchParams.newLocation || meeting.location || "zoom",
      notes: searchParams.newNotes || meeting.notes || ""
    };
    
    // Prepara un testo di risposta breve per l'AI
    const suggestedResponse = `Rivedi e conferma modifiche al meeting per favore.`;
    
    return {
      success: true,
      meetingData: preparedData,
      isEdit: true,  // Flag per indicare che è una modifica
      suggestedResponse: suggestedResponse
    };
  } catch (error) {
    console.error("Errore nella preparazione dati per modifica appuntamento:", error);
    return {
      success: false,
      error: "Errore nella preparazione dati: " + (error instanceof Error ? error.message : "Errore sconosciuto")
    };
  }
}

/**
 * Retrieves documentation about site functionality
 * @returns Documentation text about the Gervis platform functionality
 */
export const getSiteDocumentation = async () => {
  try {
    // Log current working directory for debugging
    const cwd = process.cwd();
    console.log('[DEBUG] Current working directory:', cwd);
    
    // Try several possible locations for the documentation file
    const possiblePaths = [
      './server/docs/site-documentation.md',
      '../docs/site-documentation.md',
      'server/docs/site-documentation.md',
      `${cwd}/server/docs/site-documentation.md`,
      '/Users/gianmarcotrapasso/Documents/GitHub/gervis/server/docs/site-documentation.md' // Absolute path as last resort
    ];
    
    let docFilePath = '';
    for (const path of possiblePaths) {
      console.log('[DEBUG] Checking path:', path);
      if (fs.existsSync(path)) {
        docFilePath = path;
        console.log('[DEBUG] Found documentation file at:', path);
        break;
      }
    }
    
    if (!docFilePath) {
      console.error('[DEBUG] Documentation file not found in any of the checked locations');
      return {
        success: false,
        error: 'Documentation file not found in any of the expected locations'
      };
    }
    
    // Read file content
    const documentationContent = fs.readFileSync(docFilePath, 'utf8');
    console.log('[DEBUG] Successfully read documentation file, length:', documentationContent.length);
    
    return {
      success: true,
      documentation: documentationContent
    };
  } catch (error: unknown) {
    console.error('Error retrieving site documentation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Error retrieving site documentation: ${errorMessage}`
    };
  }
};

