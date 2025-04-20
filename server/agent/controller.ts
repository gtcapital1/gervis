/**
 * GERVIS AGENT CONTROLLER
 * 
 * Controller principale per l'agente AI che gestisce:
 * - Le richieste in arrivo dall'UI
 * - L'interazione con il modello LLM
 * - La preparazione di dialoghi di conferma
 * - Il tracciamento delle conversazioni
 */

import { Request, Response } from 'express';
import { agentFunctions } from './functions';
import { db } from '../db';
import { conversations, messages, clients, meetings } from '@shared/schema';
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

// Log the API key status (without revealing the key)
console.log('[Agent Controller] OpenAI API key status:', process.env.OPENAI_API_KEY ? 'Key is set' : 'Key is missing');
console.log('[Agent Controller] OpenAI API key length:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0);

/**
 * Gestore principale per le richieste all'agente
 * Riceve un messaggio dall'utente, lo elabora e restituisce una risposta
 */
export async function handleAgentRequest(req: Request, res: Response) {
  try {
    console.log('[Agent Controller] Received request to /api/agent/message');
    console.log('[Agent Controller] Request body:', req.body);
    
    // Verifica che l'utente sia autenticato
    if (!req.user || !req.user.id) {
      console.log('[Agent Controller] Authentication required but user not found');
      return res.status(401).json({
        success: false,
        message: 'Autenticazione richiesta'
      });
    }
    
    console.log('[Agent Controller] User authenticated:', req.user.id);

    // Valida l'input
    const validationResult = agentRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.log('[Agent Controller] Input validation failed:', JSON.stringify(validationResult.error.format()));
      return res.status(400).json({
        success: false,
        message: 'Input non valido',
        errors: validationResult.error.format()
      });
    }
    
    console.log('[Agent Controller] Input validated successfully');
    
    const { message, conversationId, context } = validationResult.data;
    console.log('[Agent Controller] Parsed data:', { message, conversationId: conversationId || 'not provided', hasContext: !!context });
    
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
    
    // Prepariamo un messaggio di sistema potenziato che include contesto temporale
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('it-IT', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const formattedTime = currentDate.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    let systemMessage = `Sei Gervis, un assistente virtuale esperto che aiuta i consulenti finanziari italiani.
    
    PRINCIPI GUIDA:
    1. Per la creazione di clienti, le informazioni essenziali sono: nome, cognome ed email
    2. Per la creazione di appuntamenti, le informazioni essenziali sono: nome del cliente e orario dell'appuntamento
    3. NON chiedere ulteriori conferme quando l'utente ha già fornito le informazioni essenziali
    4. Quando hai le informazioni essenziali, rispondi con un breve messaggio come "Certo, ecco il form per l'appuntamento" o "Perfetto, conferma i dati qui sotto" e POI passa DIRETTAMENTE alla creazione con createClient o createMeeting
    5. Non richiedere conferma e non chiedere informazioni non essenziali; usa valori predefiniti ragionevoli per i campi non specificati
    6. Deduci il più possibile dalle informazioni fornite e riempi i campi mancanti non essenziali con valori ragionevoli. Per le informazioni essenziali invece chiedi conferma
    7. Rispondi in italiano e in modo conversazionale
    8. Per l'onboarding di un cliente, usa la funzione sendOnboardingEmail quando l'utente chiede di inviare un onboarding a un cliente esistente
    9. Se un cliente è appena stato creato, suggerisci sempre di procedere con l'onboarding
    
    INFORMAZIONI TEMPORALI:
    Oggi è ${formattedDate}.
    Ora sono le ${formattedTime}.
    
    CONTESTO ATTUALE:`;
    
    // Aggiungiamo informazioni sullo stato della conversazione
    if (conversationState.currentIntent) {
      systemMessage += `\nL'utente sta attualmente eseguendo l'azione "${conversationState.currentIntent}".`;
      
      if (conversationState.pendingAction) {
        systemMessage += `\nHai già raccolto questi parametri: ${JSON.stringify(conversationState.pendingAction.collectedParams)}.`;
        const requiredParams = Array.isArray(conversationState.pendingAction.requiredParams) ? 
          conversationState.pendingAction.requiredParams : [];
        const missingParams = requiredParams.filter(
          (p: string) => !conversationState.pendingAction?.collectedParams[p]
        );
        
        if (missingParams.length > 0) {
          systemMessage += `\nParametri ancora mancanti: ${missingParams.join(', ')}.`;
          systemMessage += `\nCerca di estrarre questi parametri dal messaggio dell'utente o suggerisci valori ragionevoli.`;
        }
      }
    } else {
      systemMessage += `\nNessuna azione in corso. Decidi la migliore azione in base al messaggio dell'utente.`;
    }
    
    // Chiama l'API di OpenAI per generare una risposta, includendo lo stato della conversazione
    const agentResponse = await processAgentRequestWithOpenAI(req.user.id, message, {
      conversationState,
      lastAssistantMessage,
      systemMessage
    });
    
    // Aggiorna lo stato della conversazione in base alle funzioni chiamate
    if (agentResponse.functionCalls && agentResponse.functionCalls.length > 0) {
      const functionCall = agentResponse.functionCalls[0];
      
      console.log('[Agent] Intent corrente:', conversationState.currentIntent || 'nessuno');
      console.log('[Agent] Nuova funzione chiamata:', functionCall.name);
      
      // Aggiorna l'intent corrente
      const vecchioIntent = conversationState.currentIntent;
      conversationState.currentIntent = functionCall.name;
      console.log(`[Agent] Intent aggiornato: da "${vecchioIntent || 'nessuno'}" a "${functionCall.name}"`);
      
      // Se è un'operazione con parametri, gestiamo lo stato
      const requiredParamsExist = agentFunctions[functionCall.name]?.parameters?.required || [];
      const providedParams = functionCall.parameters || {};
      
      console.log('[Agent] Parametri richiesti:', requiredParamsExist);
      console.log('[Agent] Parametri forniti:', providedParams);
      
      // Fusioniamo i parametri precedentemente raccolti con quelli nuovi
      let mergedParams = {...providedParams};
      if (conversationState.pendingAction && 
          conversationState.pendingAction.type === functionCall.name && 
          conversationState.pendingAction.collectedParams) {
        // Mantieni i vecchi parametri che non sono stati sovrascritti
        mergedParams = {
          ...conversationState.pendingAction.collectedParams,
          ...providedParams // I nuovi parametri hanno priorità
        };
        console.log('[Agent] Parametri fusi:', mergedParams);
      }
      
      const missingParams = Array.isArray(requiredParamsExist) ? requiredParamsExist.filter(
        (param: string) => !mergedParams[param] && mergedParams[param] !== 0 && mergedParams[param] !== false
      ) : [];
      
      console.log('[Agent] Parametri mancanti:', missingParams);
      
      if (missingParams.length > 0) {
        // Operazione incompleta, salva lo stato pendente
        conversationState.pendingAction = {
          type: functionCall.name,
          params: providedParams,
          requiredParams: Array.isArray(requiredParamsExist) ? requiredParamsExist : [],
          collectedParams: mergedParams
        };
        
        console.log('[Agent] Operazione incompleta, parametri mancanti:', missingParams);
      } else {
        // Abbiamo tutti i parametri, ma non eseguiamo direttamente l'azione
        // La conferma e l'esecuzione saranno gestite tramite l'interfaccia UI
        conversationState.pendingAction = {
          type: functionCall.name,
          params: providedParams,
          requiredParams: Array.isArray(requiredParamsExist) ? requiredParamsExist : [],
          collectedParams: mergedParams
        };
        
        console.log('[Agent] Operazione pronta per il dialogo UI');
      }
    } else if (agentResponse.functionResults && agentResponse.functionResults.length > 0) {
      const result = agentResponse.functionResults[0];
      
      // Se la funzione restituisce un dialogo, manteniamo lo stato della conversazione
      // In modo che l'utente possa confermare l'azione dal frontend
      if (result.showDialog || result.showMeetingDialog || result.showClientDialog) {
        console.log('[Agent] Mantengo lo stato per il dialogo UI');
      } else {
        // Se è solo una ricerca o un'altra azione senza dialogo, possiamo pulire lo stato
        console.log('[Agent] Resetto lo stato perché l\'azione è completata');
        conversationState.currentIntent = undefined;
        conversationState.pendingAction = undefined;
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
    
    // Restituisci la risposta all'utente con eventuali dati per i dialog UI
    return res.json({
      success: true,
      response: agentResponse.text,
      conversationId: currentConversationId,
      functionCalls: agentResponse.functionCalls,
      functionResults: agentResponse.functionResults,
      conversationState: conversationState,
      // Dati specifici per il frontend per aprire i dialog UI
      dialog: agentResponse.functionResults && agentResponse.functionResults.length > 0
        ? {
            // Se è un dialog per creare un cliente
            showClientDialog: agentResponse.functionResults[0].showClientDialog || false,
            // Se è un dialog per creare un meeting
            showMeetingDialog: agentResponse.functionResults[0].showMeetingDialog || false,
            // Tipo di dialog (createClient, createMeeting, ecc.)
            type: agentResponse.functionResults[0].dialogType,
            // Dati del cliente da mostrare nel dialog
            clientData: agentResponse.functionResults[0].clientData,
            // Dati del meeting da mostrare nel dialog
            meetingData: agentResponse.functionResults[0].meetingData
          }
        : null
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

async function processAgentRequestWithOpenAI(userId: number, message: string, context?: any): Promise<AgentResponse> {
  console.log('[Agent] Elaborazione richiesta per userId:', userId);
  console.log('[Agent] Messaggio utente:', message);

  // Prepara i messaggi per l'API di OpenAI
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: context?.systemMessage || `Sei Gervis, un assistente virtuale che prepara dialoghi di conferma ma non esegue mai azioni finali.`
    }
  ];

  // Se c'è un messaggio precedente dell'assistente, includiamolo per dare contesto
  if (context?.lastAssistantMessage) {
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

  // Funzioni disponibili per l'AI
  const availableFunctions = [
    {
      name: "searchClients",
      description: "Cerca clienti per nome, email o altre informazioni. Usa questa funzione per trovare clienti in base a qualsiasi criterio menzionato dall'utente.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Testo di ricerca (nome, email, o qualsiasi altra informazione del cliente)"
          },
          limit: {
            type: "integer",
            description: "Numero massimo di risultati. Default: 10."
          },
          includeArchived: {
            type: "boolean",
            description: "Includi clienti archiviati. Default: false."
          }
        },
        required: ["query"]
      }
    },
    {
      name: "searchMeetings",
      description: "Cerca appuntamenti per data, cliente o qualsiasi altro criterio. Usa questa funzione quando l'utente chiede di trovare o visualizzare appuntamenti.",
      parameters: {
        type: "object",
        properties: {
          startDate: {
            type: "string",
            description: "Data di inizio della ricerca. Puoi dedurla dal messaggio dell'utente. Se l'utente dice 'oggi', usa la data di oggi."
          },
          endDate: {
            type: "string",
            description: "Data di fine della ricerca. Se l'utente chiede gli appuntamenti 'di oggi', startDate e endDate dovrebbero essere lo stesso giorno."
          },
          clientId: {
            type: "integer",
            description: "Filtra per cliente specifico. Deducilo dal contesto se possibile."
          },
          timeframe: {
            type: "string",
            description: "Periodo predefinito: 'today' (oggi), 'future' (futuri), 'past' (passati), 'week' (questa settimana), 'all' (tutti). Se l'utente non specifica, scegli l'opzione più logica."
          },
          limit: {
            type: "integer",
            description: "Numero massimo di risultati. Default: 20."
          }
        }
      }
    },
    {
      name: "createClient",
      description: "Prepara i dati per la creazione di un nuovo cliente, mostrando un dialogo di conferma. Usa questa funzione quando l'utente vuole aggiungere un cliente.",
      parameters: {
        type: "object",
        properties: {
          firstName: {
            type: "string",
            description: "Nome del cliente. Obbligatorio."
          },
          lastName: {
            type: "string",
            description: "Cognome del cliente. Obbligatorio."
          },
          email: {
            type: "string",
            description: "Email del cliente. Obbligatorio."
          }
        },
        required: ["firstName", "lastName", "email"]
      }
    },
    {
      name: "createMeeting",
      description: "Prepara i dati per un nuovo appuntamento, mostrando un dialogo di conferma. Usa questa funzione quando l'utente vuole creare un appuntamento.",
      parameters: {
        type: "object",
        properties: {
          clientIdentifier: {
            type: "string",
            description: "Nome, cognome o email del cliente. Usa questo se l'utente non specifica un ID cliente."
          },
          clientId: {
            type: "integer",
            description: "ID del cliente. Opzionale se viene fornito clientIdentifier."
          },
          subject: {
            type: "string",
            description: "Oggetto dell'appuntamento. Se non specificato, suggerisci un oggetto ragionevole."
          },
          dateTime: {
            type: "string",
            description: "Data e ora dell'appuntamento. Cerca di dedurre dal messaggio dell'utente. Se l'utente dice solo 'alle 18', assumi che sia oggi."
          },
          duration: {
            type: "integer",
            description: "Durata in minuti. Default: 60 minuti."
          },
          location: {
            type: "string",
            description: "Luogo dell'appuntamento. Default: 'incontro'. Se l'utente non specifica, scegli un'opzione ragionevole."
          },
          notes: {
            type: "string",
            description: "Note aggiuntive. Opzionale."
          }
        },
        required: ["subject", "dateTime"]
      }
    },
    {
      name: "sendOnboardingEmail",
      description: "Invia email di onboarding a un cliente esistente. Usa questa funzione quando l'utente vuole inviare un'email di onboarding a un cliente.",
      parameters: {
        type: "object",
        properties: {
          clientIdentifier: {
            type: "string",
            description: "Nome, cognome o email del cliente. Usa questo se l'utente non specifica un ID cliente."
          },
          clientId: {
            type: "integer",
            description: "ID del cliente. Opzionale se viene fornito clientIdentifier."
          }
        }
      }
    },
    {
      name: "sendCustomEmail",
      description: "Compone e invia un'email personalizzata a un cliente. Usa questa funzione quando l'utente vuole inviare un'email a un cliente con contenuto personalizzato o generato da te.",
      parameters: {
        type: "object",
        properties: {
          clientIdentifier: {
            type: "string",
            description: "Nome, cognome o email del cliente. Usa questo se l'utente non specifica un ID cliente."
          },
          clientId: {
            type: "integer",
            description: "ID del cliente. Opzionale se viene fornito clientIdentifier."
          },
          subject: {
            type: "string",
            description: "Oggetto dell'email. Crea un oggetto conciso e professionale. Se non specificato, verrà generato automaticamente."
          },
          messageTemplate: {
            type: "string",
            description: "Contenuto dell'email. Se non specificato, lo genererò automaticamente in base al topic. Il messaggio dovrà includere un saluto iniziale formale e una chiusura professionale."
          },
          topic: {
            type: "string",
            description: "Argomento dell'email se il contenuto deve essere generato. Es: 'valore aggiunto dei nostri servizi' o 'proposte di investimento'."
          },
          language: {
            type: "string",
            description: "Lingua dell'email: 'italian' o 'english'. Default: 'italian'."
          }
        },
        required: ["clientIdentifier"]
      }
    }
  ];

  try {
    console.log('[Agent] Funzioni disponibili:', availableFunctions.map(f => f.name).join(', '));
    console.log('[Agent] Preparing to call OpenAI API with model: gpt-4o-mini');

    // Chiamata a OpenAI
    try {
      console.log('[Agent] Sending request to OpenAI API...');
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
      
      console.log('[Agent] OpenAI API response received successfully');
      
      // Estrai la risposta
      const assistantResponse = response.choices[0].message;
      let responseText = assistantResponse.content || '';
      let functionCalls = [];
      let functionResults = [];
      
      // Gestisci tool calling se presente
      if (assistantResponse.tool_calls && assistantResponse.tool_calls.length > 0) {
        for (const toolCall of assistantResponse.tool_calls) {
          if (toolCall.type === 'function') {
            const functionName = toolCall.function.name;
            let functionArgs;
            
            try {
              functionArgs = JSON.parse(toolCall.function.arguments);
            } catch (e) {
              console.error(`[Agent] Errore nel parsing degli argomenti: ${e}`);
              functionArgs = {};
            }

            // Registra la chiamata a funzione
            functionCalls.push({
              name: functionName,
              parameters: functionArgs
            });

            // Esegui la funzione
            if (agentFunctions[functionName]) {
              try {
                const result = await agentFunctions[functionName].handler(userId, functionArgs);
                
                // Se è richiesta una generazione dinamica di contenuto email
                if (result.needsGeneration && functionName === 'sendCustomEmail') {
                  // Ottieni informazioni sul cliente e sull'argomento
                  const clientInfo = result.clientInfo;
                  const topic = result.topic || 'informazioni importanti';
                  
                  // Chiedi a OpenAI di generare un contenuto personalizzato per l'email
                  const emailPrompt = `Scrivi un'email professionale in italiano da inviare a ${clientInfo.firstName} ${clientInfo.lastName} riguardo a "${topic}". 
                  L'email deve essere formale ma cordiale, con un'apertura appropriata, un corpo dettagliato e una chiusura professionale.
                  Se il topic riguarda la cancellazione di un appuntamento, includi scuse appropriate e proponi alternative.
                  Se è una presentazione di servizi, descrivi i vantaggi in modo convincente e personalizzato.
                  Assicurati che l'email sia completamente personalizzata e unica, non un template generico.
                  NON concludere con frasi come "[il tuo nome]" o "[firma]" o qualsiasi altro segnaposto per la firma, poiché questa verrà aggiunta automaticamente dal sistema.`;
                  
                  // Chiamata a OpenAI per la generazione del contenuto
                  const emailResponse = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [{ role: "system", content: "Sei un assistente esperto nella scrittura di email professionali e personalizzate. Non includere mai firme o segnaposti del tipo [il tuo nome], [firma], ecc. alla fine dell'email, poiché queste verranno aggiunte automaticamente dal sistema." },
                               { role: "user", content: emailPrompt }],
                    temperature: 0.7,
                  });
                  
                  // Estrai il contenuto generato
                  const generatedContent = emailResponse.choices[0].message.content || '';
                  
                  // Aggiorna il risultato con il contenuto generato
                  result.messageTemplate = generatedContent;
                  delete result.needsGeneration;
                  
                  console.log('[Agent] Email generata dinamicamente da OpenAI');
                }
                
                functionResults.push(result);

                // Genera una risposta in base al risultato
                if (result.success) {
                  // Risposta per funzioni con successo
                  responseText = result.message || responseText;
                  
                  // Aggiungi flag per indicare che c'è un dialog da mostrare
                  if (result.showMeetingDialog || result.showClientDialog || 
                      result.showDialog || result.dialogData) {
                    console.log('[Agent] Dialog rilevato nei risultati');
                  }
                } else {
                  // Risposta per errori
                  if (result.clientOptions && result.clientOptions.length > 0) {
                    // Mostra le opzioni dei clienti
                    responseText = result.message + "\n\nEcco i clienti che ho trovato:\n";
                    result.clientOptions.forEach((client: any, index: number) => {
                      responseText += `${index + 1}. ${client.name} (${client.email})\n`;
                    });
                    responseText += "\nPuoi specificare quale cliente scegliere.";
                  } else if (result.requiredParams && result.requiredParams.length > 0) {
                    // Chiedi i parametri mancanti in modo conversazionale
                    const missingParams = result.requiredParams.filter(
                      (param: string) => !functionArgs[param]
                    );
                    
                    if (missingParams.length > 0) {
                      const paramDescriptions: Record<string, string> = {
                        'firstName': 'nome',
                        'lastName': 'cognome',
                        'email': 'email',
                        'clientId': 'cliente',
                        'clientIdentifier': 'nome o email del cliente',
                        'subject': 'oggetto dell\'appuntamento',
                        'dateTime': 'data e ora'
                      };
                      
                      const readableParams = missingParams.map((p: string) => paramDescriptions[p] || p).join(', ');
                      responseText = `Ho bisogno di altre informazioni: ${readableParams}. Puoi fornirmele?`;
                    } else {
                      responseText = result.message || "Ci sono alcuni problemi con i dati inseriti.";
                    }
                  } else {
                    responseText = result.message || "Non sono riuscito a completare la richiesta.";
                  }
                }
              } catch (error) {
                console.error(`[Agent] Errore nell'esecuzione di ${functionName}:`, error);
                responseText = "Si è verificato un errore. Riprova più tardi.";
              }
            } else {
              responseText = "La funzione richiesta non è disponibile al momento.";
            }
          }
        }
      }
      
      return {
        text: responseText,
        functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
        functionResults: functionResults.length > 0 ? functionResults : undefined
      };
    } catch (openaiError) {
      console.error('[Agent] OpenAI API call failed:', openaiError);
      
      if (openaiError instanceof Error) {
        console.error('[Agent] OpenAI error message:', openaiError.message);
        console.error('[Agent] OpenAI error stack:', openaiError.stack);
        
        // If it's an API error with a response
        if ('response' in openaiError) {
          console.error('[Agent] OpenAI API error response:', (openaiError as any).response?.data);
        }
      }
      
      throw openaiError;
    }
  } catch (error) {
    console.error('[Agent] Error during agent request processing:', error);
    
    if (error instanceof Error) {
      console.error('[Agent] Error message:', error.message);
      console.error('[Agent] Error stack:', error.stack);
    }
    
    // Fallback in caso di errore
    return {
      text: 'Scusa, sto avendo qualche problema tecnico a elaborare la tua richiesta. Riprova tra poco.',
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

// Helper function per formattare la data
function formatDate(date: Date): string {
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Helper function per formattare l'ora
function formatTime(date: Date): string {
  return date.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit'
  });
} 