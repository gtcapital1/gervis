/**
 * GERVIS AGENT FUNCTIONS
 * 
 * Questo file contiene tutte le funzioni che l'agente AI può utilizzare.
 * Per aggiungere/rimuovere permessi all'agente, è sufficiente modificare questo file.
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
      console.log('==== DEBUG RICERCA CLIENTI ====');
      console.log('[Agent] userId:', userId);
      console.log('[Agent] Parametri ricerca:', JSON.stringify(params));
      console.log('[Agent] Query originale:', query);
      
      // Limitiamo a 50 per motivi di performance
      const allUserClients = await db.select()
        .from(clients)
        .where(eq(clients.advisorId, userId))
        .limit(50);
      
      console.log('[Agent] Numero di clienti recuperati per debug:', allUserClients.length);
      
      // Mostriamo solo i primi 10 per non sovraccaricare i log
      console.log('[Agent] Primi 10 clienti dell\'utente:');
      allUserClients.slice(0, 10).forEach((client, index) => {
        console.log(`[Agent] Cliente ${index + 1}: ${client.firstName} ${client.lastName} (${client.email})`);
      });
      
      // Separa la query in parole per la ricerca
      const queryWords = query.toLowerCase().split(/\s+/);
      console.log('[Agent] Parole query:', queryWords);
      
      // Implementiamo una ricerca manuale ottimizzata
      console.log('[Agent] Esecuzione ricerca ottimizzata');
      
      // Filtriamo direttamente dalla lista completa di clienti che abbiamo già recuperato
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
        
        // Controlli rapidi prima (sono più veloci)
        if (clientEmail.includes(searchQuery)) return true;
        if (clientFullName.includes(searchQuery)) return true;
        
        // Ricerca parola per parola come ultima opzione
        for (const word of queryWords) {
          if (word.length < 3) continue; // Ignora parole troppo corte
          if (clientFirstName.includes(word) || clientLastName.includes(word)) {
            return true;
          }
        }
        
        return false;
      }).slice(0, limit);
      
      console.log('[Agent] Risultati ricerca manuale:', matchedManually.length);
      
      if (matchedManually.length > 0) {
        console.log('[Agent] Clienti trovati nella ricerca manuale:');
        matchedManually.forEach((client, index) => {
          console.log(`[Agent] Risultato ${index + 1}: ${client.firstName} ${client.lastName} (${client.email})`);
        });
      }
      
      console.log('==== FINE DEBUG RICERCA CLIENTI ====');
      
      // Restituiamo i risultati indipendentemente da quanti ne abbiamo trovati
      return {
        success: true,
        clients: matchedManually,
        count: matchedManually.length,
        note: matchedManually.length > 0 ? 'Clienti trovati' : 'Nessun cliente trovato'
      };
    } catch (error) {
      console.error('[Agent] Error searching clients:', error);
      // Assicuriamoci di restituire sempre una risposta, anche in caso di errore
      return {
        success: false,
        message: 'Errore nella ricerca dei clienti',
        error: String(error),
        clients: [], // Aggiungiamo un array vuoto per evitare errori nel frontend
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
      
      return {
        success: true,
        client: result[0]
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

// Crea nuovo cliente
export const createClient: AgentFunction = {
  name: 'createClient',
  description: 'Crea un nuovo cliente',
  parameters: {
    firstName: 'string',
    lastName: 'string',
    email: 'string',
  },
  handler: async (userId: number, params: any) => {
    try {
      console.log('[Agent] Creazione cliente con parametri:', JSON.stringify(params));
      
      // Validazione dei parametri obbligatori
      if (!params.firstName || !params.lastName || !params.email) {
        console.log('[Agent] Parametri mancanti per la creazione del cliente');
        return {
          success: false,
          message: 'Parametri mancanti per la creazione del cliente. Serve nome, cognome ed email.',
          requiredParams: ['firstName', 'lastName', 'email']
        };
      }
      
      // Controllo se l'email è già utilizzata da un altro cliente dello stesso advisor
      const existingClient = await db.select()
        .from(clients)
        .where(
          and(
            eq(clients.advisorId, userId),
            eq(clients.email, params.email)
          )
        )
        .limit(1);
      
      if (existingClient.length > 0) {
        console.log('[Agent] Email già utilizzata:', params.email);
        return {
          success: false,
          message: `L'email ${params.email} è già utilizzata da un altro cliente`,
          existingClient: existingClient[0]
        };
      }
      
      // Aggiungi l'advisorId ai dati del cliente
      const clientData = {
        ...params,
        advisorId: userId,
        createdAt: new Date(),
        isArchived: false,
        isOnboarded: false,
        active: false
      };
      
      // Inserisci il nuovo cliente
      const result = await db.insert(clients)
        .values(clientData)
        .returning();
      
      if (!result || result.length === 0) {
        return {
          success: false,
          message: 'Errore nella creazione del cliente: nessun risultato restituito'
        };
      }
      
      console.log('[Agent] Cliente creato con successo:', JSON.stringify(result[0]));
      
      return {
        success: true,
        client: result[0],
        message: `Cliente ${result[0].firstName} ${result[0].lastName} creato con successo`
      };
    } catch (error) {
      console.error('[Agent] Error creating client:', error);
      return {
        success: false,
        message: 'Errore nella creazione del cliente',
        error: String(error)
      };
    }
  },
  requiresAuth: true
};

/**
 * FUNZIONI PER APPUNTAMENTI
 */

// Cerca appuntamenti del cliente
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
      const limit = params.limit || 10; // Aumentiamo il limite predefinito
      
      // Gestisci le date in modo più flessibile
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      
      // Gestione migliorata della data - includi ora di inizio e fine per query per giorno singolo
      if (params.startDate) {
        try {
          // Prova a parsare la data
          startDate = new Date(params.startDate);
          // Se la data è valida e non ha un'ora specificata (è solo una data),
          // impostiamo l'ora a 00:00:00 per coprire l'intera giornata
          if (!isNaN(startDate.getTime()) && params.startDate.indexOf('T') === -1) {
            startDate.setHours(0, 0, 0, 0);
          }
        } catch (e) {
          console.error('[Agent] Error parsing startDate:', e);
        }
      }
      
      if (params.endDate) {
        try {
          // Prova a parsare la data di fine
          endDate = new Date(params.endDate);
          // Se la data è valida e non ha un'ora specificata, impostiamo l'ora a 23:59:59
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
      
      // Debug logging migliorato
      console.log('[Agent] Search meetings params:', JSON.stringify({
        clientId,
        timeframe,
        originalStartDate: params.startDate,
        originalEndDate: params.endDate,
        parsedStartDate: startDate?.toISOString(),
        parsedEndDate: endDate?.toISOString(),
        limit
      }));

      // Costruisci le condizioni di ricerca
      let conditions = [eq(meetings.advisorId, userId)];
      
      // Aggiungi filtro per clientId se specificato
      if (clientId !== undefined) {
        conditions.push(eq(meetings.clientId, clientId));
      }
      
      // Priorità alle date esplicite se fornite
      if (startDate && endDate) {
        console.log('[Agent] Using explicit date range:', startDate.toISOString(), 'to', endDate.toISOString());
        conditions.push(gte(meetings.dateTime, startDate));
        conditions.push(lte(meetings.dateTime, endDate));
      } else if (startDate) {
        console.log('[Agent] Using only start date:', startDate.toISOString());
        conditions.push(gte(meetings.dateTime, startDate));
      } else if (endDate) {
        console.log('[Agent] Using only end date:', endDate.toISOString());
        conditions.push(lte(meetings.dateTime, endDate));
      } 
      // Gestione semplificata di "oggi"
      else if (timeframe === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        console.log('[Agent] Using today timeframe:', today.toISOString(), 'to', tomorrow.toISOString());
        conditions.push(gte(meetings.dateTime, today));
        conditions.push(lt(meetings.dateTime, tomorrow));
      }
      // Altrimenti usa il timeframe
      else if (timeframe === 'future') {
        console.log('[Agent] Using future timeframe');
        conditions.push(gt(meetings.dateTime, new Date()));
      } else if (timeframe === 'past') {
        console.log('[Agent] Using past timeframe');
        conditions.push(lt(meetings.dateTime, new Date()));
      } else if (timeframe === 'week') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        console.log('[Agent] Using week timeframe:', today.toISOString(), 'to', nextWeek.toISOString());
        conditions.push(gte(meetings.dateTime, today));
        conditions.push(lt(meetings.dateTime, nextWeek));
      }
      
      // Esegui la query
      console.log('[Agent] Executing query with conditions');
      const results = await db.select()
        .from(meetings)
        .where(and(...conditions))
        .orderBy(meetings.dateTime) // Ordina per data ascendente
        .limit(limit);
      
      console.log('[Agent] Found', results.length, 'meetings');
      
      // Arricchisci i risultati con i dati del cliente
      const enrichedResults: any[] = [];
      
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
        
        // Formatta il meeting con le informazioni cliente
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
      
      // Log più dettagliato dei risultati
      if (enrichedResults.length > 0) {
        console.log('[Agent] First meeting found:', JSON.stringify({
          subject: enrichedResults[0].subject,
          dateTime: enrichedResults[0].dateTime,
          formattedDate: enrichedResults[0].formattedDate,
          formattedTime: enrichedResults[0].formattedTime,
        }));
      }
      
      return {
        success: true,
        meetings: enrichedResults,
        count: enrichedResults.length,
        message: enrichedResults.length > 0 
          ? `Trovati ${enrichedResults.length} appuntamenti` 
          : 'Nessun appuntamento trovato per il periodo specificato'
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

// Crea nuovo appuntamento
export const createMeeting: AgentFunction = {
  name: 'createMeeting',
  description: 'Crea un nuovo appuntamento',
  parameters: {
    clientId: 'number',      // ID del cliente
    subject: 'string',       // Oggetto dell'appuntamento
    dateTime: 'string',      // Data e ora (formato ISO)
    duration: 'number',      // Durata in minuti
    location: 'string?',     // Luogo dell'appuntamento
    notes: 'string?',        // Note aggiuntive
    sendEmail: 'boolean?'    // Invia email di invito
  },
  handler: async (userId: number, params: any) => {
    try {
      // Verifica che i parametri obbligatori siano presenti
      if (!params.clientId || !params.subject || !params.dateTime || !params.duration) {
        return {
          success: false,
          message: 'Parametri obbligatori mancanti. Serve clientId, subject, dateTime e duration.',
          requiredParams: ['clientId', 'subject', 'dateTime', 'duration']
        };
      }
      
      // Crea i dati dell'appuntamento
      const meetingData = {
        clientId: params.clientId,
        subject: params.subject,
        dateTime: new Date(params.dateTime),
        duration: params.duration,
        location: params.location || '',
        notes: params.notes || '',
        advisorId: userId,
        createdAt: new Date()
      };
      
      // Inserisci il nuovo appuntamento
      const result = await db.insert(meetings)
        .values(meetingData)
        .returning();
      
      if (!result || result.length === 0) {
        return {
          success: false,
          message: 'Errore nella creazione dell\'appuntamento: nessun risultato restituito'
        };
      }

      const createdMeeting = result[0];
      
      // Invia email di invito se richiesto
      if (params.sendEmail) {
        try {
          // Recupera informazioni cliente e consulente
          const client = await db.select()
            .from(clients)
            .where(eq(clients.id, createdMeeting.clientId as number))
            .limit(1)
            .then(results => results[0]);
          
          const advisor = await db.select()
            .from(users)
            .where(eq(users.id, createdMeeting.advisorId as number))
            .limit(1)
            .then(results => results[0]);
          
          if (client && advisor) {
            // Formatta data e ora
            const formattedDate = formatDate(new Date(createdMeeting.dateTime));
            const formattedTime = formatTime(new Date(createdMeeting.dateTime));
            
            // Prepara dati firma
            const signatureData = advisor ? {
              firstName: advisor.firstName || undefined,
              lastName: advisor.lastName || undefined,
              company: advisor.company || undefined,
              email: advisor.email,
              phone: advisor.phone || undefined,
              role: advisor.role || undefined
            } : undefined;
            
            // In questa versione semplificata non invieremo l'email reale
            // ma registriamo l'intenzione di farlo
            return {
              success: true,
              meeting: createdMeeting,
              emailStatus: {
                would_send_to: client.email,
                client_name: `${client.firstName} ${client.lastName}`,
                advisor_name: `${advisor.firstName} ${advisor.lastName}`,
                meeting_date: formattedDate,
                meeting_time: formattedTime
              },
              message: 'Appuntamento creato con successo e notifica email simulata'
            };
          }
        } catch (emailError) {
          console.error('[Agent] Error preparing meeting email:', emailError);
          // Continuiamo con il successo anche se l'email fallisce
        }
      }
      
      return {
        success: true,
        meeting: createdMeeting,
        message: 'Appuntamento creato con successo'
      };
    } catch (error) {
      console.error('[Agent] Error creating meeting:', error);
      return {
        success: false,
        message: 'Errore nella creazione dell\'appuntamento',
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
  createMeeting
}; 