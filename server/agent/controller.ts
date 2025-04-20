/**
 * GERVIS AGENT CONTROLLER
 * 
 * Controller principale per l'agente AI che gestisce:
 * - Le richieste in arrivo dall'UI
 * - L'interazione con il modello LLM
 * - L'esecuzione di funzioni autorizzate
 * - Il tracciamento delle conversazioni
 */

import { Request, Response } from 'express';
import { agentFunctions } from './functions';
import { db } from '../db';
import { conversations, messages } from '@shared/schema';
import { z } from 'zod';
import { eq, and, desc, asc } from 'drizzle-orm';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources';

// Tipi per gestire lo stato della conversazione
interface ConversationState {
  currentIntent?: string;
  pendingAction?: {
    type: string;
    params: Record<string, any>;
    requiredParams: string[];
    collectedParams: Record<string, any>;
  };
}

// Validazione dell'input dell'agente
const agentRequestSchema = z.object({
  message: z.string().min(1),
  conversationId: z.number().optional(), // Se fornito, continua una conversazione esistente
  context: z.record(z.any()).optional()  // Contesto aggiuntivo (opzionale)
});

// Setup client OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Gestore principale per le richieste all'agente
 * Riceve un messaggio dall'utente, lo elabora e restituisce una risposta
 */
export async function handleAgentRequest(req: Request, res: Response) {
  try {
    // Verifica che l'utente sia autenticato
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Autenticazione richiesta'
      });
    }

    // Valida l'input
    const validationResult = agentRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Input non valido',
        errors: validationResult.error.format()
      });
    }

    const { message, conversationId, context } = validationResult.data;
    
    // Recupera o crea una nuova conversazione
    let currentConversationId = conversationId;
    let conversationState: ConversationState = {};
    
    if (!currentConversationId) {
      // Crea una nuova conversazione
      const newConversation = await db.insert(conversations)
        .values({
          userId: req.user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          title: generateConversationTitle(message)
        })
        .returning();
      
      if (!newConversation || newConversation.length === 0) {
        throw new Error('Impossibile creare una nuova conversazione');
      }
      
      currentConversationId = newConversation[0].id;
    } else {
      // Recupera lo stato della conversazione esistente
      const existingConversation = await db.select()
        .from(conversations)
        .where(eq(conversations.id, currentConversationId))
        .limit(1);
      
      if (existingConversation && existingConversation.length > 0) {
        try {
          // Recupera lo stato della conversazione dai metadati
          if (existingConversation[0].metadata) {
            const metadata = JSON.parse(existingConversation[0].metadata as string);
            if (metadata.state) {
              conversationState = metadata.state;
              console.log('[Agent] Stato conversazione recuperato:', JSON.stringify(conversationState));
            }
          }
        } catch (e) {
          console.error('[Agent] Errore nel parsing dello stato della conversazione:', e);
        }
      }
    }
    
    // Salva il messaggio dell'utente
    await db.insert(messages)
      .values({
        conversationId: currentConversationId,
        content: message,
        role: 'user',
        createdAt: new Date()
      });
    
    // Recuperiamo l'ultima risposta dell'assistente per questo thread di conversazione
    let lastAssistantMessage = null;
    try {
      const recentMessages = await db.select()
        .from(messages)
        .where(and(
          eq(messages.conversationId, currentConversationId),
          eq(messages.role, 'assistant')
        ))
        .orderBy(desc(messages.createdAt))
        .limit(1);
      
      if (recentMessages && recentMessages.length > 0) {
        lastAssistantMessage = recentMessages[0].content;
        console.log('[Agent] Recuperato ultimo messaggio assistente per contesto');
      }
    } catch (e) {
      console.log('[Agent] Errore nel recupero dell\'ultimo messaggio:', e);
    }
    
    // Prepariamo un messaggio di sistema potenziato che include lo stato della conversazione
    let systemMessage = `Sei Gervis, un assistente virtuale esperto per consulenti finanziari. 
    Aiuti i consulenti finanziari italiani a gestire i loro clienti e le loro attività. 
    Sei sempre cordiale, professionale e disponibile. Rispondi sempre in italiano.
    Puoi eseguire funzioni specializzate come cercare clienti, creare appuntamenti e altro.`;
    
    // Aggiungiamo informazioni sullo stato della conversazione
    if (conversationState.currentIntent) {
      systemMessage += `\n\nATTENZIONE: L'utente sta attualmente eseguendo l'azione "${conversationState.currentIntent}".`;
      
      if (conversationState.pendingAction) {
        systemMessage += `\nSta cercando di ${conversationState.pendingAction.type} e hai già raccolto questi parametri: ${JSON.stringify(conversationState.pendingAction.collectedParams)}.`;
        const requiredParams = Array.isArray(conversationState.pendingAction.requiredParams) ? 
          conversationState.pendingAction.requiredParams : [];
        const missingParams = requiredParams.filter(
          (p: string) => !conversationState.pendingAction?.collectedParams[p]
        );
        systemMessage += `\nParametri ancora richiesti: ${missingParams.join(', ')}.`;
        systemMessage += `\nAssicurati di interpretare il messaggio corrente in questo contesto e cerca di estrarre le informazioni mancanti.`;
      }
    }
    
    // Chiama l'API di OpenAI per generare una risposta, includendo lo stato della conversazione
    const agentResponse = await processAgentRequest(req.user.id, message, {
      conversationState,
      lastAssistantMessage,
      systemMessage
    });
    
    // Aggiorna lo stato della conversazione in base alle funzioni chiamate
    if (agentResponse.functionCalls && agentResponse.functionCalls.length > 0) {
      const functionCall = agentResponse.functionCalls[0];
      
      // Se è un'operazione di creazione o modifica, salviamo l'intento
      if (functionCall.name.startsWith('create') || functionCall.name.startsWith('update')) {
        conversationState.currentIntent = functionCall.name;
        
        // Se l'operazione è completa, rimuovi lo stato pendente
        const requiredParamsExist = agentFunctions[functionCall.name]?.parameters?.required || [];
        const providedParams = functionCall.parameters || {};
        
        const missingParams = Array.isArray(requiredParamsExist) ? requiredParamsExist.filter(
          (param: string) => !providedParams[param] && providedParams[param] !== 0 && providedParams[param] !== false
        ) : [];
        
        if (missingParams.length > 0) {
          // Operazione incompleta, salva lo stato pendente
          conversationState.pendingAction = {
            type: functionCall.name,
            params: providedParams,
            requiredParams: Array.isArray(requiredParamsExist) ? requiredParamsExist : [],
            collectedParams: providedParams
          };
          
          console.log('[Agent] Operazione incompleta, parametri mancanti:', missingParams);
        } else {
          // Operazione completata, rimuovi lo stato pendente
          console.log('[Agent] Operazione completata, tutti i parametri forniti');
          conversationState.pendingAction = undefined;
        }
      } else if (agentResponse.functionResults && agentResponse.functionResults.length > 0) {
        // Se un'operazione è riuscita, rimuoviamo l'intento pendente
        if (agentResponse.functionResults[0].success) {
          conversationState.currentIntent = undefined;
          conversationState.pendingAction = undefined;
        }
      }
    }
    
    // Salva la risposta dell'agente
    await db.insert(messages)
      .values({
        conversationId: currentConversationId,
        content: agentResponse.text,
        role: 'assistant',
        createdAt: new Date(),
        functionCalls: agentResponse.functionCalls ? JSON.stringify(agentResponse.functionCalls) : null,
        functionResults: agentResponse.functionResults ? JSON.stringify(agentResponse.functionResults) : null
      });
    
    // Aggiorna il timestamp della conversazione e salva lo stato
    await db.update(conversations)
      .set({ 
        updatedAt: new Date(),
        metadata: JSON.stringify({ state: conversationState })
      })
      .where(eq(conversations.id, currentConversationId));
    
    console.log('[Agent] Stato conversazione aggiornato:', JSON.stringify(conversationState));
    
    // Restituisci la risposta all'utente
    return res.json({
      success: true,
      response: agentResponse.text,
      conversationId: currentConversationId,
      functionCalls: agentResponse.functionCalls,
      functionResults: agentResponse.functionResults,
      conversationState: conversationState
    });
    
  } catch (error) {
    console.error('[AgentController] Error processing request:', error);
    return res.status(500).json({
      success: false,
      message: "Errore durante l'elaborazione della richiesta",
      error: process.env.NODE_ENV === 'production' ? undefined : String(error)
    });
  }
}

/**
 * Recupera la cronologia della conversazione
 */
export async function getConversationHistory(req: Request, res: Response) {
  try {
    // Verifica che l'utente sia autenticato
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Autenticazione richiesta'
      });
    }
    
    const conversationId = parseInt(req.params.id);
    if (isNaN(conversationId)) {
      return res.status(400).json({
        success: false,
        message: 'ID conversazione non valido'
      });
    }
    
    // Verifica che la conversazione appartenga all'utente
    const conversation = await db.select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, req.user.id)
        )
      );
    
    if (!conversation || conversation.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Conversazione non trovata'
      });
    }
    
    // Recupera i messaggi ordinati per data di creazione
    const messageHistory = await db.select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));
    
    return res.json({
      success: true,
      conversation: conversation[0],
      messages: messageHistory
    });
    
  } catch (error) {
    console.error('[AgentController] Error fetching conversation history:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore durante il recupero della cronologia della conversazione',
      error: process.env.NODE_ENV === 'production' ? undefined : String(error)
    });
  }
}

/**
 * Recupera l'elenco delle conversazioni dell'utente
 */
export async function getConversations(req: Request, res: Response) {
  try {
    // Verifica che l'utente sia autenticato
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Autenticazione richiesta'
      });
    }
    
    // Recupera le conversazioni dell'utente
    const userConversations = await db.select()
      .from(conversations)
      .where(eq(conversations.userId, req.user.id))
      .orderBy(desc(conversations.updatedAt));
    
    return res.json({
      success: true,
      conversations: userConversations
    });
    
  } catch (error) {
    console.error('[AgentController] Error fetching conversations:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore durante il recupero delle conversazioni',
      error: process.env.NODE_ENV === 'production' ? undefined : String(error)
    });
  }
}

// Genera un titolo per la conversazione basato sul primo messaggio
function generateConversationTitle(message: string): string {
  // Se il messaggio è troppo lungo, prendiamo solo l'inizio
  const maxLength = 40;
  const truncated = message.length > maxLength 
    ? message.substring(0, maxLength) + '...'
    : message;
  
  return truncated;
}

// ==========================================
// INTEGRAZIONE CON OPENAI API
// ==========================================
interface AgentResponse {
  text: string;
  functionCalls?: any[];
  functionResults?: any[];
}

async function processAgentRequest(userId: number, message: string, context?: any): Promise<AgentResponse> {
  console.log('==== DEBUG AGENT ====');
  console.log('[Agent] Elaborazione richiesta per userId:', userId);
  console.log('[Agent] Messaggio utente:', message);
  console.log('[Agent] Contesto fornito:', context ? JSON.stringify(context) : 'Nessuno');

  // Definiamo le funzioni disponibili in formato OpenAI per il function calling
  const availableFunctions = [
    {
      name: "searchClients",
      description: "Cerca clienti per nome, email o altri campi",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Query di ricerca"
          },
          limit: {
            type: "integer",
            description: "Numero massimo di risultati (opzionale)"
          },
          includeArchived: {
            type: "boolean",
            description: "Includi clienti archiviati (opzionale)"
          }
        },
        required: ["query"]
      }
    },
    {
      name: "searchMeetings",
      description: "Cerca appuntamenti per data, cliente o altri parametri. Usa questa funzione quando l'utente chiede informazioni su appuntamenti o meeting in qualsiasi modo.",
      parameters: {
        type: "object",
        properties: {
          startDate: {
            type: "string",
            description: "Data di inizio (formato YYYY-MM-DD, opzionale). Quando l'utente chiede gli appuntamenti di un giorno specifico, usa questo campo."
          },
          endDate: {
            type: "string",
            description: "Data di fine (formato YYYY-MM-DD, opzionale)"
          },
          clientId: {
            type: "integer",
            description: "Filtra per cliente specifico (opzionale)"
          },
          timeframe: {
            type: "string",
            description: "Periodo di tempo predefinito (today, future, past, week, all). Usa 'today' quando l'utente chiede gli appuntamenti di oggi."
          },
          limit: {
            type: "integer",
            description: "Numero massimo di risultati (opzionale)"
          }
        }
      }
    },
    {
      name: "createClient",
      description: "Crea un nuovo cliente",
      parameters: {
        type: "object",
        properties: {
          firstName: {
            type: "string",
            description: "Nome del cliente"
          },
          lastName: {
            type: "string",
            description: "Cognome del cliente"
          },
          email: {
            type: "string",
            description: "Email del cliente"
          }
          
        },
        required: ["firstName", "lastName", "email"]
      }
    },
    {
      name: "createMeeting",
      description: "Crea un nuovo appuntamento",
      parameters: {
        type: "object",
        properties: {
          clientId: {
            type: "integer",
            description: "ID del cliente"
          },
          subject: {
            type: "string",
            description: "Oggetto dell'appuntamento"
          },
          dateTime: {
            type: "string",
            description: "Data e ora (formato ISO)"
          },
          duration: {
            type: "integer",
            description: "Durata in minuti"
          },
          location: {
            type: "string",
            description: "Luogo dell'appuntamento (opzionale)"
          },
          notes: {
            type: "string",
            description: "Note aggiuntive (opzionale)"
          },
          sendEmail: {
            type: "boolean",
            description: "Invia email di invito (opzionale)"
          }
        },
        required: ["clientId", "subject", "dateTime", "duration"]
      }
    }
  ];

  try {
    // Prepara i messaggi per l'API di OpenAI
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: context?.systemMessage || `Sei Gervis Assistant, un assistente virtuale specializzato per consulenti finanziari.
          Puoi aiutare gli utenti a cercare informazioni sui clienti, gestire appuntamenti, 
          e fornire supporto per l'utilizzo della piattaforma Gervis. Rispondi in italiano e in modo professionale.
          Sei un assistente esperto in ambito finanziario e sai come aiutare i consulenti a gestire le loro relazioni con i clienti.`
      }
    ];

    // Se c'è un messaggio precedente dell'assistente, includiamolo per dare contesto
    if (context?.lastAssistantMessage) {
      console.log('[Agent] Aggiungo messaggio precedente dell\'assistente per contesto');
      messages.push({
        role: "assistant",
        content: context.lastAssistantMessage
      });
    }

    // Aggiungi il messaggio dell'utente
    messages.push({
      role: "user",
      content: message
    });

    console.log('[Agent] Preparata richiesta a OpenAI con', messages.length, 'messaggi');
    console.log('[Agent] Funzioni disponibili:', availableFunctions.map(f => f.name).join(', '));

    // Chiamata a OpenAI con tools
    console.log('[Agent] Invio richiesta a OpenAI...');
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools: availableFunctions.map(func => ({
        type: "function",
        function: func
      })),
      tool_choice: "auto",
      temperature: 0.7,
    });

    // Estrai la risposta
    console.log('[Agent] Risposta ricevuta da OpenAI');
    console.log('[Agent] Modello utilizzato:', response.model);
    console.log('[Agent] Token consumati:', 
      'prompt:', response.usage?.prompt_tokens, 
      'completamento:', response.usage?.completion_tokens, 
      'totale:', response.usage?.total_tokens);

    const assistantResponse = response.choices[0].message;
    console.log('[Agent] Tipo di risposta:', assistantResponse.tool_calls ? 'tool_calls' : 'testo');
    let responseText = assistantResponse.content || '';
    let functionCalls = [];
    let functionResults = [];

    // Gestisci tool calling se presente
    if (assistantResponse.tool_calls && assistantResponse.tool_calls.length > 0) {
      console.log('[Agent] Rilevate', assistantResponse.tool_calls.length, 'chiamate a funzioni');
      for (const toolCall of assistantResponse.tool_calls) {
        console.log('[Agent] Tool call type:', toolCall.type);
        if (toolCall.type === 'function') {
          const functionName = toolCall.function.name;
          console.log('[Agent] Elaborazione chiamata a funzione:', functionName);
          let functionArgs;
          
          try {
            functionArgs = JSON.parse(toolCall.function.arguments);
            console.log('[Agent] Parametri per', functionName, ':', JSON.stringify(functionArgs, null, 2));
          } catch (e) {
            console.error(`[Agent] Errore nel parsing degli argomenti della funzione: ${e}`);
            console.log('[Agent] Raw arguments:', toolCall.function.arguments);
            functionArgs = {};
          }

          // Aggiungi la chiamata alla funzione ai risultati
          functionCalls.push({
            name: functionName,
            parameters: functionArgs
          });

          // Esegui la funzione se disponibile
          if (agentFunctions[functionName]) {
            try {
              console.log('[Agent] Esecuzione funzione:', functionName);
              const result = await agentFunctions[functionName].handler(userId, functionArgs);
              console.log('[Agent] Risultato funzione:', 
                result.success ? 'Success' : 'Failure',
                'dimensione dati:', JSON.stringify(result).length, 'bytes');
              
              if (result.count !== undefined) {
                console.log('[Agent] Conteggio risultati:', result.count);
              }
              
              functionResults.push(result);

              // Formatta una risposta in base al risultato della funzione
              if (functionName === 'searchClients') {
                if (result.success && result.clients && result.clients.length > 0) {
                  responseText = `Ho trovato ${result.clients.length} clienti che corrispondono alla tua ricerca:\n\n`;
                  
                  result.clients.forEach((client: any, index: number) => {
                    responseText += `${index + 1}. ${client.firstName} ${client.lastName} (${client.email})\n`;
                  });
                } else {
                  responseText = 'Non ho trovato clienti che corrispondono alla tua ricerca.';
                }
              } else if (functionName === 'searchMeetings') {
                if (result.success && result.meetings && result.meetings.length > 0) {
                  responseText = `Ho trovato ${result.meetings.length} appuntamenti.`;
                } else {
                  responseText = 'Non ho trovato appuntamenti che corrispondono alla tua ricerca.';
                }
              } else if (functionName === 'createClient') {
                if (result.success) {
                  responseText = `Ho creato con successo il cliente ${result.client.firstName} ${result.client.lastName}.`;
                } else {
                  responseText = `Non sono riuscito a creare il cliente: ${result.message}`;
                }
              } else if (functionName === 'createMeeting') {
                if (result.success) {
                  responseText = `Ho creato con successo l'appuntamento per ${new Date(result.meeting.dateTime).toLocaleString()}`;
                  if (result.emailStatus) {
                    responseText += ` e ho inviato una notifica email a ${result.emailStatus.client_name}.`;
                  } else {
                    responseText += '.';
                  }
                } else {
                  responseText = `Non sono riuscito a creare l'appuntamento: ${result.message}`;
                }
              }
            } catch (error) {
              console.error(`[Agent] Errore nell'esecuzione della funzione: ${functionName}:`, error);
              responseText = `Si è verificato un errore durante l'esecuzione della richiesta. Riprova più tardi.`;
            }
          } else {
            console.error(`[Agent] La funzione ${functionName} non è disponibile`);
            responseText = 'Mi dispiace, non posso eseguire questa operazione al momento.';
          }
        }
      }
    }

    console.log('[Agent] Risposta finale generata');
    console.log('[Agent] Lunghezza risposta:', responseText.length, 'caratteri');
    console.log('[Agent] Funzioni chiamate:', functionCalls.length);
    console.log('==== FINE DEBUG AGENT ====');
    
    return {
      text: responseText,
      functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
      functionResults: functionResults.length > 0 ? functionResults : undefined
    };
  } catch (error) {
    console.error('==== ERRORE AGENT ====');
    console.error('[Agent] Errore nella chiamata a OpenAI:', error);
    console.error('==== FINE ERRORE AGENT ====');
    
    // Fallback alle risposte predefinite in caso di errore
    const genericResponses = [
      'Scusa, sto avendo qualche problema a elaborare la tua richiesta. Riprova tra poco.',
      'Mi dispiace, c\'è stato un errore di comunicazione. Puoi riformulare la tua domanda?',
      'Al momento non riesco a rispondere. Verifica la tua connessione e riprova.',
      'Sto riscontrando difficoltà tecniche. Riprova tra qualche istante.'
    ];
    
    const randomIndex = Math.floor(Math.random() * genericResponses.length);
    return {
      text: genericResponses[randomIndex]
    };
  }
}

// Funzione helper per estrarre termini di ricerca
function extractSearchTerm(message: string): string {
  // Cerca pattern come "cerca cliente Mario" o "trova cliente con email mario@"
  const patterns = [
    /cerca\s+client[ei]\s+(?:chiamat[oi]\s+)?([a-zA-Z0-9@.]+)/i,
    /trova\s+client[ei]\s+(?:chiamat[oi]\s+)?([a-zA-Z0-9@.]+)/i,
    /client[ei]\s+(?:che\s+si\s+chiam(?:a|ano)\s+)?([a-zA-Z0-9@.]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  // Se non troviamo un pattern specifico, prendiamo l'ultima parola
  const words = message.split(/\s+/);
  return words[words.length - 1];
} 