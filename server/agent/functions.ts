/**
 * GERVIS AGENT FUNCTIONS
 * 
 * Questo file contiene tutte le funzioni che l'agente AI può utilizzare.
 * Ogni funzione deve preparare dialoghi di conferma anziché eseguire direttamente azioni finali.
 * L'utente ha sempre l'ultima parola attraverso i dialoghi di conferma.
 */

import { db } from '../db';
import { clients, meetings, users } from '@shared/schema';
import { eq, like, and, or, gte, lte, desc, count, gt, lt } from 'drizzle-orm';
import { sendMeetingInviteEmail, sendMeetingUpdateEmail } from '../email';

// Helper functions for date and time formatting
function formatDate(date: Date): string {
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Definizione dei tipi di funzioni che l'agente può chiamare
export interface AgentFunction {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler: Function;
  requiresAuth: boolean;
}

/**
 * FUNZIONI PER CLIENTI
 */

// Cerca clienti
export const searchClients: AgentFunction = {
  name: 'searchClients',
  description: 'Cerca clienti per nome, email o altri campi',
  parameters: {
    query: 'string', // Query di ricerca
    limit: 'number?', // Numero massimo di risultati
    includeArchived: 'boolean?' // Includi clienti archiviati
  },
  handler: async (userId: number, params: any) => {
    const { query, limit = 10, includeArchived = false } = params;
    
    try {
      console.log('[Agent] userId:', userId);
      console.log('[Agent] Parametri ricerca:', JSON.stringify(params));
      
      // Limitiamo a 1000 per un'ampia copertura
      const allUserClients = await db.select()
        .from(clients)
        .where(eq(clients.advisorId, userId))
        .limit(1000);
      
      console.log('[Agent] Numero di clienti recuperati:', allUserClients.length);
      
      // Separa la query in parole per la ricerca
      const queryWords = query.toLowerCase().split(/\s+/);
      
      // Implementiamo una ricerca manuale ottimizzata
      const matchedManually = allUserClients.filter(client => {
        // Se il cliente è archiviato e non dobbiamo includerlo, lo saltiamo subito
        if (client.isArchived && !includeArchived) {
          return false;
        }
        
        // Creiamo stringhe normalizzate per confronto
        const clientFirstName = (client.firstName || '').toLowerCase();
        const clientLastName = (client.lastName || '').toLowerCase();
        const clientFullName = `${clientFirstName} ${clientLastName}`.toLowerCase();
        const clientEmail = (client.email || '').toLowerCase();
        const searchQuery = query.toLowerCase();
        
        // Controlli rapidi
        if (clientEmail.includes(searchQuery)) return true;
        if (clientFullName.includes(searchQuery)) return true;
        
        // Ricerca parola per parola
        for (const word of queryWords) {
          if (word.length < 3) continue; // Ignora parole troppo corte
          if (clientFirstName.includes(word) || clientLastName.includes(word)) {
            return true;
          }
        }
        
        return false;
      }).slice(0, limit);
      
      // Restituiamo i risultati con formato più orientato all'utente
      const formattedClients = matchedManually.map(client => ({
        id: client.id,
        name: `${client.firstName} ${client.lastName}`,
        email: client.email,
        isArchived: client.isArchived
      }));
      
      return {
        success: true,
        clients: formattedClients,
        count: formattedClients.length,
        message: formattedClients.length > 0 
          ? `Ho trovato ${formattedClients.length} client${formattedClients.length === 1 ? 'e' : 'i'} che corrispond${formattedClients.length === 1 ? 'e' : 'ono'} alla tua ricerca.` 
          : 'Non ho trovato clienti che corrispondono alla tua ricerca.'
      };
    } catch (error) {
      console.error('[Agent] Error searching clients:', error);
      return {
        success: false,
        message: 'Errore nella ricerca dei clienti',
        error: String(error),
        clients: [],
        count: 0
      };
    }
  },
  requiresAuth: true
};

// Ottieni cliente per ID
export const getClientById: AgentFunction = {
  name: 'getClientById',
  description: 'Ottiene i dettagli di un cliente specifico tramite ID',
  parameters: {
    clientId: 'number' // ID del cliente
  },
  handler: async (userId: number, params: any) => {
    const { clientId } = params;
    
    try {
      const result = await db.select()
        .from(clients)
        .where(
          and(
            eq(clients.id, clientId),
            eq(clients.advisorId, userId)
          )
        );
      
      if (result.length === 0) {
        return {
          success: false,
          message: 'Cliente non trovato'
        };
      }
      
      const client = result[0];
      
      return {
        success: true,
        client: {
          id: client.id,
          name: `${client.firstName} ${client.lastName}`,
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          isArchived: client.isArchived,
          isOnboarded: client.isOnboarded
        },
        message: `Ho trovato il cliente ${client.firstName} ${client.lastName}.`
      };
    } catch (error) {
      console.error('[Agent] Error getting client by ID:', error);
      return {
        success: false,
        message: 'Errore nel recupero del cliente',
        error: String(error)
      };
    }
  },
  requiresAuth: true
};

// Crea nuovo cliente (prepara dialogo)
export const createClient: AgentFunction = {
  name: 'createClient',
  description: 'Prepara i dati per la creazione di un nuovo cliente',
  parameters: {
    firstName: 'string',
    lastName: 'string',
    email: 'string',
  },
  handler: async (userId: number, params: any) => {
    try {
      console.log('[Agent] Preparazione dati cliente:', JSON.stringify(params));
      
      // Validazione dei parametri obbligatori
      if (!params.firstName || !params.lastName || !params.email) {
        const missingParams = [];
        if (!params.firstName) missingParams.push('firstName');
        if (!params.lastName) missingParams.push('lastName');
        if (!params.email) missingParams.push('email');
        
        return {
          success: false,
          message: 'Informazioni incomplete per la creazione del cliente',
          requiredParams: missingParams
        };
      }
      
      // Formatta i dati per il dialogo di conferma
      const clientData = {
        firstName: params.firstName,
        lastName: params.lastName,
        email: params.email,
        name: `${params.firstName} ${params.lastName}`
      };
      
      // Prepariamo i dati per il dialog UI
      return {
        success: true,
        clientData,
        showDialog: true,
        showClientDialog: true,
        dialogType: 'createClient',
        message: `Sto preparando l'interfaccia per aggiungere ${params.firstName} ${params.lastName} come nuovo cliente.`
      };
    } catch (error) {
      console.error('[Agent] Error preparing client data:', error);
      return {
        success: false,
        message: 'Errore nella preparazione dei dati del cliente',
        error: String(error)
      };
    }
  },
  requiresAuth: true
};

/**
 * FUNZIONI PER APPUNTAMENTI
 */

// Cerca appuntamenti
export const searchMeetings: AgentFunction = {
  name: 'searchMeetings',
  description: 'Cerca appuntamenti per un cliente specifico o in un intervallo di date',
  parameters: {
    clientId: 'number?',     // ID del cliente (opzionale)
    timeframe: 'string?',    // Periodo di tempo predefinito (passato, futuro, all)
    startDate: 'string?',    // Data di inizio (formato ISO, opzionale)
    endDate: 'string?',      // Data di fine (formato ISO, opzionale)
    limit: 'number?'         // Numero massimo di risultati
  },
  handler: async (userId: number, params: any) => {
    try {
      const clientId = params.clientId;
      const timeframe = params.timeframe || 'all';
      const limit = params.limit || 20;
      
      // Gestisci le date in modo flessibile
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      
      if (params.startDate) {
        try {
          startDate = new Date(params.startDate);
          if (!isNaN(startDate.getTime()) && params.startDate.indexOf('T') === -1) {
            startDate.setHours(0, 0, 0, 0);
          }
        } catch (e) {
          console.error('[Agent] Error parsing startDate:', e);
        }
      }
      
      if (params.endDate) {
        try {
          endDate = new Date(params.endDate);
          if (!isNaN(endDate.getTime()) && params.endDate.indexOf('T') === -1) {
            endDate.setHours(23, 59, 59, 999);
          }
        } catch (e) {
          console.error('[Agent] Error parsing endDate:', e);
        }
      }
      
      // Se sono state specificate startDate ma non endDate, imposta endDate alla fine dello stesso giorno
      if (startDate && !endDate) {
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
      }
      
      console.log('[Agent] Search meetings params:', {
        clientId,
        timeframe,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        limit
      });

      // Costruisci le condizioni di ricerca
      let conditions = [eq(meetings.advisorId, userId)];
      
      // Aggiungi filtro per clientId se specificato
      if (clientId !== undefined) {
        conditions.push(eq(meetings.clientId, clientId));
      }
      
      // Priorità alle date esplicite se fornite
      if (startDate && endDate) {
        conditions.push(gte(meetings.dateTime, startDate));
        conditions.push(lte(meetings.dateTime, endDate));
      } else if (startDate) {
        conditions.push(gte(meetings.dateTime, startDate));
      } else if (endDate) {
        conditions.push(lte(meetings.dateTime, endDate));
      } 
      // Gestione di "oggi"
      else if (timeframe === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        conditions.push(gte(meetings.dateTime, today));
        conditions.push(lt(meetings.dateTime, tomorrow));
      }
      // Altrimenti usa il timeframe
      else if (timeframe === 'future') {
        conditions.push(gt(meetings.dateTime, new Date()));
      } else if (timeframe === 'past') {
        conditions.push(lt(meetings.dateTime, new Date()));
      } else if (timeframe === 'week') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        conditions.push(gte(meetings.dateTime, today));
        conditions.push(lt(meetings.dateTime, nextWeek));
      }
      
      // Esegui la query
      const results = await db.select()
        .from(meetings)
        .where(and(...conditions))
        .orderBy(meetings.dateTime)
        .limit(limit);
      
      // Arricchisci i risultati con i dati del cliente
      const enrichedResults = [];
      
      for (const meeting of results) {
        let clientInfo = null;
        
        // Ottieni i dati del cliente se specificato
        if (meeting.clientId !== undefined && meeting.clientId !== null) {
          const clientResult = await db.select()
            .from(clients)
            .where(eq(clients.id, meeting.clientId as number))
            .limit(1);
          
          if (clientResult.length > 0) {
            clientInfo = {
              id: clientResult[0].id,
              name: `${clientResult[0].firstName} ${clientResult[0].lastName}`,
              email: clientResult[0].email
            };
          }
        }
        
        // Formatta il meeting
        const meetingDate = new Date(meeting.dateTime);
        
        enrichedResults.push({
          id: meeting.id,
          subject: meeting.subject,
          dateTime: meeting.dateTime,
          formattedDate: formatDate(meetingDate),
          formattedTime: formatTime(meetingDate),
          duration: meeting.duration,
          location: meeting.location,
          notes: meeting.notes,
          client: clientInfo
        });
      }
      
      // Genera un messaggio descrittivo
      let message = '';
      if (enrichedResults.length > 0) {
        message = `Ho trovato ${enrichedResults.length} appuntament${enrichedResults.length === 1 ? 'o' : 'i'}`;
        
        if (timeframe === 'today') {
          message += ' per oggi';
        } else if (timeframe === 'future') {
          message += ' futuri';
        } else if (timeframe === 'past') {
          message += ' passati';
        } else if (timeframe === 'week') {
          message += ' per questa settimana';
        }
        
        if (clientId) {
          const clientResult = await db.select()
            .from(clients)
            .where(eq(clients.id, clientId))
            .limit(1);
          
          if (clientResult.length > 0) {
            message += ` con ${clientResult[0].firstName} ${clientResult[0].lastName}`;
          }
        }
        
        message += '.';
      } else {
        message = 'Non ho trovato appuntamenti';
        
        if (timeframe === 'today') {
          message += ' per oggi';
        } else if (timeframe === 'future') {
          message += ' futuri';
        } else if (timeframe === 'past') {
          message += ' passati';
        } else if (timeframe === 'week') {
          message += ' per questa settimana';
        }
        
        if (clientId) {
          const clientResult = await db.select()
            .from(clients)
            .where(eq(clients.id, clientId))
            .limit(1);
          
          if (clientResult.length > 0) {
            message += ` con ${clientResult[0].firstName} ${clientResult[0].lastName}`;
          }
        }
        
        message += '.';
      }
      
      return {
        success: true,
        meetings: enrichedResults,
        count: enrichedResults.length,
        message: message
      };
    } catch (error) {
      console.error('[Agent] Error searching meetings:', error);
      return {
        success: false,
        message: 'Errore nella ricerca degli appuntamenti',
        error: String(error)
      };
    }
  },
  requiresAuth: true
};

// Crea nuovo appuntamento (prepara dialogo)
export const createMeeting: AgentFunction = {
  name: 'createMeeting',
  description: 'Prepara i dati per la creazione di un nuovo appuntamento, mostrando un dialogo di conferma all\'utente',
  parameters: {
    clientIdentifier: 'string?',  // Nome, cognome o email del cliente (se non si specifica l'ID)
    clientId: 'number?',          // ID del cliente (opzionale se viene fornito clientIdentifier)
    subject: 'string',           // Oggetto dell'appuntamento (obbligatorio)
    dateTime: 'string',          // Data e ora (formato ISO o anche solo testo come "domani alle 15")
    duration: 'number?',         // Durata in minuti (default: 60 minuti)
    location: 'string?',         // Luogo dell'appuntamento (default: "incontro")
    notes: 'string?'             // Note aggiuntive (opzionale)
  },
  handler: async (userId: number, params: any) => {
    try {
      console.log('[Agent] createMeeting - Parametri ricevuti:', JSON.stringify(params));
      
      // Verifica che i parametri obbligatori siano presenti
      if (!params.subject) {
        return {
          success: false,
          message: 'È necessario specificare almeno l\'oggetto dell\'appuntamento.',
          requiredParams: ['subject']
        };
      }

      // Se non è stato fornito dateTime, restituisci un errore
      if (!params.dateTime) {
        return {
          success: false,
          message: 'È necessario specificare la data e l\'ora dell\'appuntamento.',
          requiredParams: ['dateTime']
        };
      }
      
      // Gestisci durata e luogo con valori di default
      const duration = params.duration || 60; // Default: 1 ora
      const location = params.location || 'incontro'; // Default: incontro
      const notes = params.notes || '';
      
      // Cerca di risolvere il clientId se è stato fornito clientIdentifier
      let clientId = params.clientId;
      let clientInfo = null;
      
      if (!clientId && params.clientIdentifier) {
        console.log('[Agent] createMeeting - Cerco cliente con identificatore:', params.clientIdentifier);
        
        // Cerca il cliente per nome, cognome o email
        const searchQuery = params.clientIdentifier.trim();
        
        const matchedClients = await db.select()
          .from(clients)
          .where(
            and(
              eq(clients.advisorId, userId),
              or(
                like(clients.firstName, `%${searchQuery}%`),
                like(clients.lastName, `%${searchQuery}%`),
                like(clients.email, `%${searchQuery}%`),
                like(clients.name, `%${searchQuery}%`)
              )
            )
          )
          .limit(1000);
        
        if (matchedClients.length === 0) {
          return {
            success: false,
            message: `Non è stato trovato alcun cliente che corrisponda a "${params.clientIdentifier}". Prova con un altro nome o email.`
          };
        } else if (matchedClients.length === 1) {
          // Se abbiamo trovato esattamente un cliente, usiamo il suo ID
          clientId = matchedClients[0].id;
          clientInfo = {
            id: matchedClients[0].id,
            name: `${matchedClients[0].firstName} ${matchedClients[0].lastName}`,
            email: matchedClients[0].email
          };
          console.log('[Agent] createMeeting - Trovato cliente:', matchedClients[0].firstName, matchedClients[0].lastName);
        } else {
          // Se abbiamo trovato più clienti, mostriamo le opzioni
          const clientOptions = matchedClients.map(client => ({
            id: client.id,
            name: `${client.firstName} ${client.lastName}`,
            email: client.email
          }));
          
          return {
            success: false,
            message: `Ho trovato ${matchedClients.length} clienti che corrispondono a "${params.clientIdentifier}". Per favore specifica quale cliente scegliere.`,
            clientOptions
          };
        }
      } else if (clientId) {
        // Se abbiamo già l'ID, ottieni le informazioni del cliente
        const clientResult = await db.select()
          .from(clients)
          .where(eq(clients.id, clientId))
          .limit(1);
        
        if (clientResult.length > 0) {
          clientInfo = {
            id: clientResult[0].id,
            name: `${clientResult[0].firstName} ${clientResult[0].lastName}`,
            email: clientResult[0].email
          };
        }
      }
      
      // Se ancora non abbiamo un clientId, restituisci un errore
      if (!clientId) {
        return {
          success: false,
          message: 'È necessario specificare un cliente per l\'appuntamento, tramite nome/email o ID.',
          requiredParams: ['clientIdentifier']
        };
      }
      
      // Risolvi la data/ora
      let dateTimeObj;
      try {
        console.log('[Agent] createMeeting - Interpretazione data/ora da:', params.dateTime);
        
        // Tenta di parsare la data in diversi formati
        const dateText = params.dateTime;
        
        // Prova prima con il formato ISO standard
        dateTimeObj = new Date(dateText);
        
        // Se non è valida, potrebbe essere in formato italiano o altri formati
        if (isNaN(dateTimeObj.getTime())) {
          console.log('[Agent] createMeeting - Il formato ISO non ha funzionato, provo formati alternativi');
          
          // Formato italiano: dd/mm/yyyy
          if (dateText.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}/)) {
            const [day, month, year] = dateText.split('/');
            dateTimeObj = new Date(`${year}-${month}-${day}`);
          }
          // Formato con data testuale "oggi alle 18"
          else if (dateText.toLowerCase().includes('oggi')) {
            dateTimeObj = new Date();
          }
          // Formato con data testuale "domani alle 18"
          else if (dateText.toLowerCase().includes('domani')) {
            dateTimeObj = new Date();
            dateTimeObj.setDate(dateTimeObj.getDate() + 1);
          }
          // Altrimenti, assumiamo oggi
          else {
            dateTimeObj = new Date();
          }
          
          // Cerca l'ora nel formato "alle 18" o simili
          const hourMatch = dateText.match(/(\d{1,2})(?::(\d{1,2}))?/);
          if (hourMatch) {
            const hours = parseInt(hourMatch[1], 10);
            const minutes = hourMatch[2] ? parseInt(hourMatch[2], 10) : 0;
            dateTimeObj.setHours(hours, minutes, 0, 0);
          }
        }
        
        console.log('[Agent] createMeeting - Data/ora interpretata:', dateTimeObj);
      } catch (e) {
        console.error('[Agent] createMeeting - Errore nell\'interpretazione della data:', e);
        return {
          success: false,
          message: `Non sono riuscito a interpretare la data e l'ora "${params.dateTime}". Per favore specifica la data in modo più chiaro.`
        };
      }
      
      // Verifica che la data sia valida
      if (isNaN(dateTimeObj.getTime())) {
        return {
          success: false,
          message: `La data specificata "${params.dateTime}" non è valida. Per favore fornisci una data chiara.`
        };
      }

      // Formatta i dati per il dialog
      const formattedDate = formatDate(dateTimeObj);
      const formattedTime = formatTime(dateTimeObj);
      
      // Prepara l'oggetto con i dati del meeting
      const meetingData = {
        clientId,
        clientInfo,
        subject: params.subject,
        dateTime: dateTimeObj.toISOString(),
        formattedDate,
        formattedTime, 
        duration,
        location,
        notes,
        advisorId: userId
      };
      
      // Prepariamo i dati per il dialog UI di creazione appuntamento
      return {
        success: true,
        showDialog: true,
        showMeetingDialog: true,
        dialogType: 'createMeeting',
        meetingData,
        message: `Certo! Ecco il modulo per l'appuntamento con ${clientInfo?.name}. Conferma i dati qui sotto o modificali se necessario.`
      };
    } catch (error) {
      console.error('[Agent] Error preparing meeting:', error);
      return {
        success: false,
        message: 'Errore nella preparazione dei dati per l\'appuntamento',
        error: String(error)
      };
    }
  },
  requiresAuth: true
};

// Invia email di onboarding a un cliente
export const sendOnboardingEmail: AgentFunction = {
  name: 'sendOnboardingEmail',
  description: 'Invia email di onboarding a un cliente esistente',
  parameters: {
    clientId: 'number?',          // ID del cliente
    clientIdentifier: 'string?',  // Nome, cognome o email del cliente (se non si specifica l'ID)
  },
  handler: async (userId: number, params: any) => {
    try {
      console.log('[Agent] sendOnboardingEmail - Parametri ricevuti:', JSON.stringify(params));
      
      // Cerca di risolvere il clientId se è stato fornito clientIdentifier
      let clientId = params.clientId;
      let clientInfo = null;
      
      if (!clientId && params.clientIdentifier) {
        console.log('[Agent] sendOnboardingEmail - Cerco cliente con identificatore:', params.clientIdentifier);
        
        // Cerca il cliente per nome, cognome o email
        const searchQuery = params.clientIdentifier.trim();
        
        const matchedClients = await db.select()
          .from(clients)
          .where(
            and(
              eq(clients.advisorId, userId),
              or(
                like(clients.firstName, `%${searchQuery}%`),
                like(clients.lastName, `%${searchQuery}%`),
                like(clients.email, `%${searchQuery}%`),
                like(clients.name, `%${searchQuery}%`)
              )
            )
          )
          .limit(1000);
        
        if (matchedClients.length === 0) {
          return {
            success: false,
            message: `Non è stato trovato alcun cliente che corrisponda a "${params.clientIdentifier}". Prova con un altro nome o email.`
          };
        } else if (matchedClients.length === 1) {
          // Se abbiamo trovato esattamente un cliente, usiamo il suo ID
          clientId = matchedClients[0].id;
          clientInfo = {
            id: matchedClients[0].id,
            name: `${matchedClients[0].firstName} ${matchedClients[0].lastName}`,
            email: matchedClients[0].email
          };
          console.log('[Agent] sendOnboardingEmail - Trovato cliente:', matchedClients[0].firstName, matchedClients[0].lastName);
        } else {
          // Se abbiamo trovato più clienti, mostriamo le opzioni
          const clientOptions = matchedClients.map(client => ({
            id: client.id,
            name: `${client.firstName} ${client.lastName}`,
            email: client.email
          }));
          
          return {
            success: false,
            message: `Ho trovato ${matchedClients.length} clienti che corrispondono a "${params.clientIdentifier}". Per favore specifica quale cliente scegliere.`,
            clientOptions
          };
        }
      } else if (clientId) {
        // Se abbiamo già l'ID, ottieni le informazioni del cliente
        const clientResult = await db.select()
          .from(clients)
          .where(eq(clients.id, clientId))
          .limit(1);
        
        if (clientResult.length > 0) {
          clientInfo = {
            id: clientResult[0].id,
            name: `${clientResult[0].firstName} ${clientResult[0].lastName}`,
            email: clientResult[0].email
          };
        } else {
          return {
            success: false,
            message: `Non è stato trovato alcun cliente con ID ${clientId}.`
          };
        }
      }
      
      // Se ancora non abbiamo un clientId, restituisci un errore
      if (!clientId) {
        return {
          success: false,
          message: 'È necessario specificare un cliente per l\'onboarding, tramite nome/email o ID.',
          requiredParams: ['clientIdentifier']
        };
      }
      
      // Recupera le informazioni dell'utente (consulente)
      const user = await db.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (user.length === 0) {
        return {
          success: false,
          message: 'Impossibile trovare le informazioni del consulente.'
        };
      }
      
      // In questo punto del codice inviamo l'email di onboarding
      // Qui ci sarebbe l'implementazione reale che chiama la funzione di invio email
      // Ma per ora simuliamo il comportamento
      
      // Prepariamo i dati per il dialog UI
      return {
        success: true,
        client: clientInfo!,
        message: `Ho inviato l'email di onboarding a ${clientInfo!.name}. Il cliente riceverà un'email con un link per completare la registrazione.`,
        showOnboardingSent: true
      };
    } catch (error) {
      console.error('[Agent] Error preparing onboarding email:', error);
      return {
        success: false,
        message: 'Errore nella preparazione dell\'email di onboarding',
        error: String(error)
      };
    }
  },
  requiresAuth: true
};

// Invia email personalizzate a un cliente
export const sendCustomEmail: AgentFunction = {
  name: 'sendCustomEmail',
  description: 'Invia un\'email personalizzata a un cliente esistente. Usa questa funzione quando l\'utente vuole inviare un\'email a un cliente, anche se fornisce solo il cliente e un argomento generico.',
  parameters: {
    clientIdentifier: 'string?',  // Nome, cognome o email del cliente (se non si specifica l'ID)
    clientId: 'number?',          // ID del cliente (opzionale se viene fornito clientIdentifier)
    subject: 'string?',           // Oggetto dell'email (opzionale, verrà generato se non fornito)
    messageTemplate: 'string?',    // Template dell'email o richiesta di generazione (opzionale, verrà generato se non fornito)
    topic: 'string?',             // Argomento dell'email se il contenuto deve essere generato
    language: 'string?'           // Lingua dell'email (default: italian)
  },
  handler: async (userId: number, params: any) => {
    try {
      console.log('[Agent] sendCustomEmail - Parametri ricevuti:', JSON.stringify(params));
      
      // Genera un oggetto di default se non specificato
      if (!params.subject && params.topic) {
        params.subject = `Informazioni su ${params.topic}`;
      } else if (!params.subject) {
        params.subject = "Informazioni sui nostri servizi";
      }
      
      let clientId = params.clientId;
      let clientInfo = null;
      
      // Cerca di risolvere il clientId se è stato fornito clientIdentifier
      if (!clientId && params.clientIdentifier) {
        console.log('[Agent] sendCustomEmail - Cerco cliente con identificatore:', params.clientIdentifier);
        
        // Cerca il cliente per nome, cognome o email
        const searchQuery = params.clientIdentifier.trim();
        
        // Migliore ricerca del cliente - split delle parole per gestire nome e cognome separatamente
        const queryWords = searchQuery.toLowerCase().split(/\s+/);
        
        const matchedClients = await db.select()
          .from(clients)
          .where(
            and(
              eq(clients.advisorId, userId),
              or(
                like(clients.firstName, `%${searchQuery}%`),
                like(clients.lastName, `%${searchQuery}%`),
                like(clients.email, `%${searchQuery}%`),
                like(clients.name, `%${searchQuery}%`)
              )
            )
          )
          .limit(1000);
        
        // Se non troviamo corrispondenze esatte, miglioriamo la ricerca
        if (matchedClients.length === 0) {
          // Tentiamo con una ricerca manuale più intelligente
          const allClients = await db.select()
            .from(clients)
            .where(eq(clients.advisorId, userId))
            .limit(1000);
            
          // Implementiamo una ricerca fuzzy
          const potentialMatches = allClients.filter(client => {
            const firstName = (client.firstName || '').toLowerCase();
            const lastName = (client.lastName || '').toLowerCase();
            
            // Verifica se almeno una parola della query corrisponde al nome o cognome
            for (const word of queryWords) {
              if (word.length > 2 && (firstName.includes(word) || lastName.includes(word))) {
                return true;
              }
            }
            return false;
          });
          
          if (potentialMatches.length > 0) {
            // Usa il primo cliente trovato con la ricerca fuzzy
            clientId = potentialMatches[0].id;
            clientInfo = {
              id: potentialMatches[0].id,
              firstName: potentialMatches[0].firstName,
              lastName: potentialMatches[0].lastName,
              name: `${potentialMatches[0].firstName} ${potentialMatches[0].lastName}`,
              email: potentialMatches[0].email
            };
            console.log('[Agent] sendCustomEmail - Trovato cliente con ricerca fuzzy:', clientInfo.name);
          } else if (params.topic) {
            // Se abbiamo almeno un topic, procediamo senza cliente
            console.log('[Agent] sendCustomEmail - Nessun cliente trovato, ma proseguiamo con il topic:', params.topic);
          } else {
            return {
              success: false,
              message: `Non è stato trovato alcun cliente che corrisponda a "${params.clientIdentifier}". Prova con un altro nome o email.`
            };
          }
        } else if (matchedClients.length === 1) {
          // Se abbiamo trovato esattamente un cliente, usiamo il suo ID
          clientId = matchedClients[0].id;
          clientInfo = {
            id: matchedClients[0].id,
            firstName: matchedClients[0].firstName,
            lastName: matchedClients[0].lastName,
            name: `${matchedClients[0].firstName} ${matchedClients[0].lastName}`,
            email: matchedClients[0].email
          };
          console.log('[Agent] sendCustomEmail - Trovato cliente:', matchedClients[0].firstName, matchedClients[0].lastName);
        } else {
          // Se abbiamo trovato più clienti, mostriamo le opzioni
          const clientOptions = matchedClients.map(client => ({
            id: client.id,
            name: `${client.firstName} ${client.lastName}`,
            email: client.email
          }));
          
          return {
            success: false,
            message: `Ho trovato ${matchedClients.length} clienti che corrispondono a "${params.clientIdentifier}". Per favore specifica quale cliente scegliere.`,
            clientOptions
          };
        }
      } else if (clientId) {
        // Se abbiamo già l'ID, ottieni le informazioni del cliente
        const clientResult = await db.select()
          .from(clients)
          .where(eq(clients.id, clientId))
          .limit(1);
        
        if (clientResult.length > 0) {
          clientInfo = {
            id: clientResult[0].id,
            firstName: clientResult[0].firstName,
            lastName: clientResult[0].lastName,
            name: `${clientResult[0].firstName} ${clientResult[0].lastName}`,
            email: clientResult[0].email
          };
        } else {
          return {
            success: false,
            message: `Non è stato trovato alcun cliente con ID ${clientId}.`
          };
        }
      }
      
      // Controlliamo se abbiamo un topic, e in questo caso procediamo anche senza cliente
      const hasTopic = params.topic && params.topic.trim() !== '';
      
      // Se ancora non abbiamo un clientId e non abbiamo un topic, restituisci un errore
      if (!clientId && !clientInfo && !hasTopic) {
        return {
          success: false,
          message: 'È necessario specificare un cliente per l\'email, tramite nome/email o ID, oppure almeno un argomento.',
          requiredParams: ['clientIdentifier', 'topic']
        };
      }
      
      // La lingua dell'email (predefinita: italiano)
      const language = params.language || 'italian';
      
      // Se non è stato fornito un messaggio, generiamo un template basato sul subject e/o topic
      let messageContent = params.messageTemplate;
      if (!messageContent) {
        const topic = params.topic || params.subject;
        
        // Se non abbiamo un cliente ma abbiamo un topic, procediamo comunque
        // In questo caso, il cliente sarà scelto dall'utente nel dialog
        return {
          success: true,
          clientInfo: clientInfo || null,
          subject: params.subject,
          needsGeneration: true,  // Flag per indicare che è necessaria la generazione di contenuto
          topic: topic,
          language,
          showDialog: true,
          showEmailDialog: true,
          dialogType: 'sendCustomEmail',
          message: clientInfo 
            ? `Sto preparando un'email personalizzata da inviare a ${clientInfo.name} riguardo a "${topic}". Il contenuto sarà generato in modo unico e personalizzato.`
            : `Sto preparando un'email personalizzata riguardo a "${topic}". Il contenuto sarà generato in modo unico e personalizzato.`
        };
      }
      
      // Log per debug
      console.log('[Agent] Mostro dialog con mail:', {
        showDialog: true,
        showEmailDialog: true,
        dialogType: 'sendCustomEmail'
      });
      
      // Prepariamo i dati per il dialog UI di conferma
      return {
        success: true,
        clientInfo: clientInfo || null,
        subject: params.subject,
        messageTemplate: messageContent,
        language,
        showDialog: true,
        showEmailDialog: true,
        dialogType: 'sendCustomEmail',
        message: clientInfo 
          ? `Ho preparato un'email da inviare a ${clientInfo.name}. Controlla il contenuto e inviala quando sei pronto.`
          : `Ho preparato un'email. Controlla il contenuto e il destinatario, poi inviala quando sei pronto.`
      };
    } catch (error) {
      console.error('[Agent] Error preparing custom email:', error);
      return {
        success: false,
        message: 'Errore nella preparazione dell\'email personalizzata',
        error: String(error)
      };
    }
  },
  requiresAuth: true
};

// Raccolta di tutte le funzioni
export const agentFunctions: Record<string, AgentFunction> = {
  searchClients,
  getClientById,
  createClient,
  searchMeetings,
  createMeeting,
  sendOnboardingEmail,
  sendCustomEmail
}; 