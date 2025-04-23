import { OpenAI } from 'openai';
import { Request, Response } from 'express';
import { db } from '../db'; // Import database instance
import { conversations, messages as messagesTable, clients } from '../../shared/schema'; // Rename to avoid conflict
import { eq, and, asc, desc, isNull, or, ilike } from 'drizzle-orm'; // Import query helpers
import { getClientContext, getSiteDocumentation, getMeetingsByDateRange, getMeetingsByClientName, prepareMeetingData, prepareEditMeeting, getFinancialNews } from './functions';
import { nanoid } from 'nanoid';
import { createEmptyConversation, getConversationDetails, updateConversationTitle } from './conversations-service';
import { ChatCompletionMessageParam } from 'openai';
import express from 'express';
import { handleFlow } from './flow';
import { findClientByName } from '../services/clientProfileService';

// Initialize OpenAI client
// Ensure OPENAI_API_KEY is set in your environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Modelli OpenAI disponibili
const AVAILABLE_MODELS = {
  STANDARD: 'gpt-4.1-mini',
  ADVANCED: 'gpt-4.1'
};

// Type for OpenAI message
type OpenAIMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
}

// Basic chat handler function
export const handleChat = async (req: Request, res: Response) => {
  // Check if API Key is loaded
  if (!process.env.OPENAI_API_KEY) {
    console.error('OpenAI API Key not configured.');
    return res.status(500).json({ 
      success: false, 
      error: 'AI service is not configured.' 
    });
  }

  try {
    // Aggiungiamo variabili per indicare se mostrare i dialog nel frontend
    let showMeetingDialog = false;
    let meetingDialogData = null;
    let showEmailDialog = false;
    let emailDialogData = null;
    
    const { message: userMessage, conversationId, model: requestedModel } = req.body; // Aggiungi il parametro model

    // Ensure message is a string
    if (!userMessage || typeof userMessage !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Message content must be a non-empty string' 
      });
    }

    // Controlla che il modello richiesto sia valido
    const modelToUse = requestedModel === AVAILABLE_MODELS.ADVANCED 
      ? AVAILABLE_MODELS.ADVANCED 
      : AVAILABLE_MODELS.STANDARD;

    // Get user ID from req.user - ensure it exists
    // This is set by the isAuthenticated middleware
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    const userId = req.user.id;

    // Get or create conversation
    let currentConversationId = conversationId;
    let conversationTitle = userMessage.substring(0, 50); // First 50 chars as title
    
    if (!currentConversationId) {
      // Create a new conversation using camelCase column names
      console.log('Creating new conversation with title:', conversationTitle);
      
      const newConversation = await db.insert(conversations).values({
        userId: userId,
        title: conversationTitle,
        createdAt: new Date(),  // camelCase nel database
        updatedAt: new Date()   // camelCase nel database
      }).returning({ id: conversations.id });
      
      currentConversationId = newConversation[0].id;
      console.log('Created new conversation with ID:', currentConversationId);
    } else {
      // Update existing conversation timestamp
      await db.update(conversations)
        .set({ updatedAt: new Date() })  // Usa camelCase
        .where(eq(conversations.id, currentConversationId));
    }
    
    // Save user message to database
    const userMessageRecord = await db.insert(messagesTable).values({
      conversationId: currentConversationId,
      content: userMessage,
      role: 'user',
      createdAt: new Date()
    }).returning({ id: messagesTable.id });
    
    console.log('Saved user message with ID:', userMessageRecord[0].id);
    
    // Get conversation history from database
    const historyMessages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, currentConversationId))
      .orderBy(asc(messagesTable.createdAt));
    
    console.log(`Found ${historyMessages.length} messages in conversation history`);

    // Prepare messages for OpenAI API, including history
    const validRoles = ['user', 'assistant']; // Define valid roles for history
    
    // Create correctly typed array for OpenAI
    const systemMessage: OpenAIMessage = {
        role: 'system',
        content: `
      Tu sei Gervis, un assistente AI esperto progettato per supportare consulenti finanziari in modo professionale, conciso ed efficace. Le tue competenze coprono:
      
      1. **Insight sui clienti e comunicazione personalizzata**  
         - Analizza i profili dei clienti  
         - Redigi email su misura in base alle loro esigenze e al loro portafoglio
      
      2. **Gestione dell'agenda e degli incontri**  
         - Pianifica, prepara e sintetizza riunioni con i clienti  
         - Suggerisci follow-up puntuali e rilevanti
      
      3. **Idee di investimento basate su news recenti**  
         - Interpreta notizie di mercato  
         - Genera suggerimenti coerenti con il profilo del cliente
      
      4. **Assistenza normativa e operativa**  
         - Fornisci template, sintesi normative, risposte su strumenti della piattaforma  
      
      Parli sempre in italiano.  
      Adotta uno stile professionale, chiaro, sintetico, ispirato alle best practice del settore della consulenza finanziaria e wealth management.  
      Se il messaggio dell'utente riguarda un cliente specifico, valuta se richiedere informazioni aggiuntive tramite strumenti esterni.
      
      IMPORTANTE PER APPUNTAMENTI: Quando l'utente chiede di creare un appuntamento/meeting, NON usare frasi che indicano che l'operazione è già completata (come "Ho creato un appuntamento" o "L'appuntamento è stato fissato"). 
      Invece, usa frasi che indicano che l'operazione è in preparazione (ad esempio "Sto preparando un appuntamento con [cliente]" o "Ho compilato i dettagli per l'appuntamento").
      Questo perché l'utente dovrà confermare l'appuntamento tramite un'interfaccia grafica, quindi l'operazione non è ancora conclusa.
      
      IMPORTANTE PER EMAIL: chiamare la funzione composeEmailData SOLO se utente ha chiesto esplicitamente di INVIARE la mail. Se utente chiede di preparare mail, rispondi normalmente senza chiamare funzione composeEmailData.;
      Ad esempio: "INVIA un'email a Mario Rossi" o "INVIA messaggio di follow-up a Bianchi". 
      In questi casi, chiama la funzione composeEmailData con i dettagli dell'email. Non suggerire di inviare email se l'utente non ha usato la parola "INVIA" esplicitamente.
      
      MOLTO IMPORTANTE PER GLI APPUNTAMENTI: 
      1. Quando l'utente chiede di VISUALIZZARE appuntamenti esistenti (con frasi come "mostrami gli appuntamenti", "che meeting ho", "incontri di questa settimana", ecc.), devi SEMPRE chiamare una di queste funzioni:
         - getMeetingsByDateRange: per richieste relative a periodi di tempo (oggi, questa settimana, questo mese, ecc.)
         - getMeetingsByClientName: per richieste relative a un cliente specifico
      
      2. ESEMPI:
         - Se l'utente chiede "Che meeting ho questa settimana?", chiama getMeetingsByDateRange con la settimana corrente
         - Se l'utente chiede "Mostrami gli appuntamenti con Mario Rossi", chiama getMeetingsByClientName
      
      3. Una volta ottenuti i dati, fornisci SOLO un breve messaggio introduttivo come "Ecco gli appuntamenti richiesti" o "Ho trovato N appuntamenti per il periodo specificato" senza elencare i dettagli, poiché verranno visualizzati automaticamente in una card separata nell'interfaccia.
      
      Per le idee di investimento, devi sempre spiegare perche l'idea si allinea con i profili dei clienti.

      Se l'user chiede di usare notizie, devi SEMPRE chiamare la funzione getFinancialNews ed usare quelle notizie.
      Se usi una notizia, devi sempre citare la fonte e mettere il link alla notizia originale.
      Le idee di investimento devono essere sempre specifiche, dettagliate e dovresti dare esempi per implementarle.
      
      Agisci come partner affidabile del consulente: **preciso, proattivo, strategico**.
      Rispondi alle domande che ti vengono fatte, senza divagare se non necessario.

      IMPORTANTE: Oggi è ${new Date().toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
      Quando l'utente fa riferimento a periodi come "questa settimana", "oggi", "domani", ecc., usa questa data come riferimento.

      Formatta sempre le tue risposte usando markdown. Usa **grassetto** per evidenziare concetti chiave, *corsivo* per enfatizzare, ed elenchi puntati o numerati per chiarezza. Non aggiungere elementi HTML.
      Non aggiungere emoji.
      Nelle mail, non aggiungere firma consulenti o altre informazioni di contatto, perchè vengono aggiunte sepratamente.
      
      `.trim()
      };
      
    
    // Convert database messages to OpenAI format with proper types
    const historyOpenAIMessages: OpenAIMessage[] = historyMessages
      .filter(msg => validRoles.includes(msg.role))
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));
    
    // Combine all messages
    const apiMessages: OpenAIMessage[] = [systemMessage, ...historyOpenAIMessages];

    // --- DEBUG LOG --- 
    console.log('Sending messages to OpenAI:', JSON.stringify(apiMessages, null, 2));
    console.log(`Using model: ${modelToUse}`);
    // --- END DEBUG LOG ---

    // Call OpenAI API with properly typed messages
    console.log('Chiamata OpenAI in corso...');
    
    // Rimuoviamo l'analisi delle keyword e lasciamo che OpenAI scelga automaticamente
    // il tool giusto da chiamare in base al contesto del messaggio
    const forcedToolChoice = "auto";
    
    // Analizziamo il messaggio per vedere se riguarda la visualizzazione di appuntamenti
    const showMeetingsPattern = /(mostra|visualizza|vedi|che|quali|quanti|dammi|hai|ho|lista|elenco)\s+(meeting|appuntamenti|incontri)/i;
    const timeframePattern = /(oggi|questa\s+settimana|domani|prossima\s+settimana|questo\s+mese)/i;
    const clientNamePattern = /(con|per|di|cliente)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i;
    
    // Pattern per rilevare richieste di email con la parola INVIA in maiuscolo
    // Deve essere esplicito per evitare falsi positivi
    const emailPattern = /INVIA\s+(una|un\'|un|la)?\s*(email|mail|messaggio|comunicazione)/i;
    const hasEmailKeyword = userMessage.toUpperCase().includes("INVIA");
    
    let toolChoice: any = "auto";
    
    // Se l'utente sta chiedendo appuntamenti in un periodo, forziamo getMeetingsByDateRange
    if (showMeetingsPattern.test(userMessage) && timeframePattern.test(userMessage)) {
      console.log('[DEBUG] Forcing getMeetingsByDateRange for timeframe-based meeting query');
      toolChoice = {
        type: "function",
        function: { name: "getMeetingsByDateRange" }
      };
    }
    // Se l'utente sta chiedendo appuntamenti con un cliente, forziamo getMeetingsByClientName
    else if (showMeetingsPattern.test(userMessage) && clientNamePattern.test(userMessage)) {
      console.log('[DEBUG] Forcing getMeetingsByClientName for client-based meeting query');
      toolChoice = {
        type: "function",
        function: { name: "getMeetingsByClientName" }
      };
    }
    // Se l'utente ha usato "INVIA" nel messaggio e contiene email/mail/messaggio, forziamo composeEmailData
    else if (hasEmailKeyword && emailPattern.test(userMessage)) {
      console.log('[DEBUG] Forcing composeEmailData for email request');
      toolChoice = {
        type: "function",
        function: { name: "composeEmailData" }
      };
    }
    
    const completion = await openai.chat.completions.create({
      model: modelToUse, // Usa il modello selezionato
      messages: apiMessages,
      tools: [
        {
          type: "function",
          function: {
            name: "getClientContext",
            description: "Ottiene informazioni contestuali su un cliente. Chiamare questa funzione quando l'utente chiede informazioni su un cliente specifico. Utile per rispondere a domande come 'che profilo ha X?', 'parlami di Y', 'cosa sai di Z?', 'Mi dai qualche idea per A?'",
            parameters: {
              type: "object",
              properties: {
                clientName: {
                  type: "string",
                  description: "Nome completo o parziale del cliente di cui recuperare le informazioni"
                },
                query: {
                  type: "string",
                  description: "La richiesta originale dell'utente per contestualizzare la risposta"
                }
              },
              required: ["clientName", "query"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "composeEmailData",
            description: "Prepara una email in base al prompt dell'utente. Deve essere chiamata SOLO quando l'utente usa esplicitamente la parola 'INVIA' nel suo messaggio (ad esempio 'INVIA una email a Mario', 'INVIA mail di follow-up', ecc). Questa funzione mostra un dialog per consentire all'utente di rivedere e inviare la mail.",
            parameters: {
              type: "object",
              properties: {
                clientId: {
                  type: "string",
                  description: "ID del cliente o nome del cliente a cui inviare l'email"
                },
                clientName: {
                  type: "string",
                  description: "Nome completo del cliente (usato solo se clientId è un nome anziché un ID)"
                },
                subject: {
                  type: "string",
                  description: "Oggetto dell'email"
                },
                emailType: {
                  type: "string",
                  description: "Tipo di email (follow-up, proposta, richiesta, ecc.)"
                },
                content: {
                  type: "string",
                  description: "Corpo dell'email, formattato in markdown"
                }
              },
              required: ["clientName", "subject", "content"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "getSiteDocumentation",
            description: "Recupera la documentazione completa sulle funzionalità della piattaforma Gervis. Utilizzare questa funzione quando l'utente chiede informazioni sul funzionamento della piattaforma, domande come 'come funziona Gervis?', 'quali funzionalità ha il sito?', 'cosa può fare questa piattaforma?', 'spiegami le funzioni di Gervis', 'help', ecc.",
            parameters: {
              type: "object",
              properties: {},
              required: []
            }
          }
        },
        {
          type: "function",
          function: {
            name: "getFinancialNews",
            description: "Recupera le ultime notizie finanziarie. Utilizzare questa funzione SOLO quando l'utente chiede di visualizzare o leggere notizie finanziarie, senza alcuna necessità di analizzarle o collegarle ai clienti. Esempi: 'quali sono le ultime notizie finanziarie?', 'dimmi le novità del mercato'.",
            parameters: {
              type: "object",
              properties: {
                maxResults: {
                  type: "number",
                  description: "Numero massimo di notizie da recuperare (default: 5, max: 10)"
                }
              },
              required: []
            }
          }
        },
        {
          type: "function",
          function: {
            name: "getMeetingsByDateRange",
            description: "Recupera gli appuntamenti in un intervallo di date specifico. USARE QUESTA FUNZIONE quando l'utente chiede appuntamenti per un periodo di tempo, come 'mostrami gli appuntamenti di questa settimana', 'che incontri ho oggi', 'meeting del mese', ecc. Questa è la funzione principale per mostrare l'agenda all'utente.",
            parameters: {
              type: "object",
              properties: {
                dateRange: {
                  type: "object",
                  properties: {
                    startDate: {
                      type: "string",
                      description: "Data di inizio nel formato YYYY-MM-DD"
                    },
                    endDate: {
                      type: "string",
                      description: "Data di fine nel formato YYYY-MM-DD"
                    }
                  },
                  required: ["startDate", "endDate"]
                }
              },
              required: ["dateRange"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "getMeetingsByClientName",
            description: "Cerca gli appuntamenti per un cliente specifico. Utilizzare questa funzione quando l'utente chiede di vedere gli appuntamenti per un certo cliente, ad esempio 'mostra gli appuntamenti con Mario Rossi' o 'appuntamenti per il cliente Bianchi'.",
            parameters: {
              type: "object",
              properties: {
                clientName: {
                  type: "string",
                  description: "Nome del cliente di cui cercare gli appuntamenti"
                }
              },
              required: ["clientName"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "prepareMeetingData",
            description: "Usare questa funzione quando l'utente chiede di creare, fissare o programmare un appuntamento con un cliente.",
            parameters: {
              type: "object",
              properties: {
                clientId: {
                  type: "string",
                  description: "ID del cliente o nome del cliente con cui fissare l'appuntamento"
                },
                clientName: {
                  type: "string",
                  description: "Nome completo del cliente (usato solo se clientId è un nome anziché un ID)"
                },
                subject: {
                  type: "string",
                  description: "Oggetto o titolo dell'appuntamento"
                },
                dateTime: {
                  type: "string",
                  description: "Data e ora dell'appuntamento in formato ISO (YYYY-MM-DDTHH:MM:SS) o descrizione testuale come 'domani alle 15'"
                },
                duration: {
                  type: "string",
                  description: "Durata dell'appuntamento in minuti (30, 60, 90, 120)"
                },
                location: {
                  type: "string",
                  description: "Luogo dell'appuntamento (zoom, ufficio, etc)"
                },
                notes: {
                  type: "string",
                  description: "Note aggiuntive sull'appuntamento"
                }
              },
              required: ["clientId"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "prepareEditMeeting",
            description: "Prepara i dati per modificare un appuntamento esistente",
            parameters: {
              type: "object",
              properties: {
                meetingId: {
                  type: "string",
                  description: "ID numerico dell'appuntamento da modificare"
                },
                clientName: {
                  type: "string",
                  description: "Nome del cliente dell'appuntamento da modificare"
                },
                date: {
                  type: "string",
                  description: "Data dell'appuntamento nel formato DD/MM/YYYY"
                },
                time: {
                  type: "string",
                  description: "Ora dell'appuntamento nel formato HH:MM"
                }
              },
              required: [] // Almeno uno dei parametri deve essere fornito
            }
          }
        }
      ],
      // Utilizziamo la scelta del tool che abbiamo determinato
      tool_choice: toolChoice,
      // Add other parameters like temperature, max_tokens if needed
    });
    
    console.log('Risposta OpenAI ricevuta:', { 
      content: completion.choices[0]?.message?.content?.substring(0, 100) + '...',
      hasFunctionCalls: !!completion.choices[0]?.message?.tool_calls?.length
    });

    // DEBUG: Stampo il formato esatto della risposta per debug
    if (completion.choices[0]?.message?.content) {
      console.log('------------- DEBUG FORMATO RISPOSTA OPENAI -------------');
      console.log('RISPOSTA ORIGINALE:');
      console.log(completion.choices[0].message.content);
      console.log('RAPPRESENTAZIONE JSON CON ESCAPE PER VISUALIZZARE NEW LINE:');
      console.log(JSON.stringify(completion.choices[0].message.content));
      console.log('------------------------------------------------------');
    }

    // Check if there's a tool call in the response
    let aiResponse = completion.choices[0]?.message?.content || '';
    let functionCalls = null;
    let toolCallId = null;

    if (completion.choices[0]?.message?.tool_calls && completion.choices[0].message.tool_calls.length > 0) {
      // We have a tool call
      const toolCall = completion.choices[0].message.tool_calls[0];
      console.log('Tool call ricevuto:', { 
        name: toolCall.function.name, 
        args: toolCall.function.arguments.substring(0, 100) + '...' 
      });
      
      // Imposta functionCalls per qualsiasi tipo di tool, non solo getClientContext
      functionCalls = [
        {
          name: toolCall.function.name,
          arguments: JSON.parse(toolCall.function.arguments)
        }
      ];
      
      toolCallId = toolCall.id;
      
      // If there's no content, add a placeholder
      if (!aiResponse) {
        aiResponse = 'Elaborazione della richiesta in corso...';
      }
    }

    // Handle function calls if present
    let functionResults = null;
    if (functionCalls) {
      const functionName = functionCalls[0].name;
      const args = functionCalls[0].arguments;
      let result = null;
      
      try {
        console.log(`[DEBUG] Iniziando esecuzione funzione ${functionName}`);
        
        // Esegui la funzione in base al nome
        switch (functionName) {
          case "getClientContext":
            console.log(`[DEBUG] Chiamando getClientContext con: ${args.clientName}`);
            result = await getClientContext(args.clientName, args.query, userId);
            console.log('[DEBUG] Risultato getClientContext:', result);
            console.log('Recupero contesto cliente completato:', { 
              success: result.success,
              client: result.success && result.clientInfo && result.clientInfo.personalInformation && result.clientInfo.personalInformation.data ? 
                `${result.clientInfo.personalInformation.data.firstName.value} ${result.clientInfo.personalInformation.data.lastName.value}` : 
                'Cliente trovato ma dati incompleti'
            });
            break;
          
          case "getSiteDocumentation":
            console.log(`[DEBUG] Chiamando getSiteDocumentation`);
            result = await getSiteDocumentation();
            console.log('[DEBUG] Risultato getSiteDocumentation:', {
              success: result.success,
              docLength: result.success && result.documentation ? result.documentation.length : 0
            });
            break;
          
          case "getFinancialNews":
            console.log(`[DEBUG] Chiamando getFinancialNews con maxResults: ${args.maxResults || 'default'}`);
            result = await getFinancialNews(args.maxResults);
            console.log('[DEBUG] Risultato getFinancialNews:', {
              success: result.success,
              count: result.success ? result.count : 0,
              totalAvailable: result.success ? result.totalAvailable : 0
            });
            break;
          
          case "getMeetingsByDateRange":
            console.log(`[DEBUG] Chiamando getMeetingsByDateRange con date: ${JSON.stringify(args.dateRange)}`);
            result = await getMeetingsByDateRange(args.dateRange, userId);
            console.log('[DEBUG] Risultato getMeetingsByDateRange:', result);
            console.log('Ricerca appuntamenti per data completata:', { 
              success: result.success,
              count: result.success ? result.count : 0
            });
            break;
          
          case "getMeetingsByClientName":
            console.log(`[DEBUG] Chiamando getMeetingsByClientName con: ${args.clientName}`);
            result = await getMeetingsByClientName(args.clientName, userId);
            console.log('[DEBUG] Risultato getMeetingsByClientName:', result);
            console.log('Ricerca appuntamenti per cliente completata:', { 
              success: result.success,
              count: result.success ? result.count : 0
            });
            
            // Verifica se nel messaggio originale c'è una richiesta di modifica meeting
            // Esempio: "modifica meeting con [clientName]" o "sposta appuntamento con [clientName]"
            if (result.success && result.meetings && result.meetings.length > 0 && 
                (userMessage.includes("modif") || 
                 userMessage.includes("sposta") || 
                 userMessage.includes("cambia") || 
                 userMessage.includes("aggiorna"))) {
              
              console.log('[DEBUG] Rilevata richiesta di modifica meeting dopo getMeetingsByClientName');
              
              // Prendi il primo meeting trovato (assumiamo che sia quello da modificare)
              const meetingToEdit = result.meetings[0];
              
              // Estrai potenziali nuove informazioni dal messaggio dell'utente
              const editParams: any = {
                meetingId: meetingToEdit.id
              };
              
              // 1. Cerca una nuova data nel formato "il XX aprile" o "il XX/YY"
              const dateRegex1 = /il\s+(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)/i;
              const dateRegex2 = /il\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/i;
              
              let dateMatch = userMessage.match(dateRegex1);
              if (dateMatch) {
                const day = parseInt(dateMatch[1]);
                const monthNames = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
                const month = monthNames.findIndex(m => m.toLowerCase() === dateMatch[2].toLowerCase()) + 1;
                
                // Assumiamo l'anno corrente se non specificato
                const year = new Date().getFullYear();
                if (day > 0 && day <= 31 && month > 0) {
                  editParams.newDate = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
                  console.log(`[DEBUG] Estratta nuova data dal testo: ${editParams.newDate}`);
                }
              } else {
                dateMatch = userMessage.match(dateRegex2);
                if (dateMatch) {
                  const day = parseInt(dateMatch[1]);
                  const month = parseInt(dateMatch[2]);
                  const year = dateMatch[3] ? parseInt(dateMatch[3]) : new Date().getFullYear();
                  
                  if (day > 0 && day <= 31 && month > 0 && month <= 12) {
                    editParams.newDate = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
                    console.log(`[DEBUG] Estratta nuova data dal testo: ${editParams.newDate}`);
                  }
                }
              }
              
              // 2. Cerca una nuova ora nel formato "alle XX:YY" o "alle XX"
              const timeRegex = /alle\s+(\d{1,2})[:\.]?(\d{0,2})/i;
              const timeMatch = userMessage.match(timeRegex);
              
              if (timeMatch) {
                const hours = parseInt(timeMatch[1]);
                const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
                
                if (hours >= 0 && hours < 24) {
                  editParams.newTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                  console.log(`[DEBUG] Estratta nuova ora dal testo: ${editParams.newTime}`);
                }
              }
              
              // Chiamata a prepareEditMeeting con i parametri estratti
              console.log('[DEBUG] Chiamata a prepareEditMeeting con parametri estratti:', editParams);
              const editResult = await prepareEditMeeting(editParams, userId);
              
              console.log('[DEBUG] Risultato prepareEditMeeting auto dopo getMeetingsByClientName:', editResult);
              
              if (editResult.success) {
                // Imposta il flag per mostrare il dialog di modifica meeting
                showMeetingDialog = true;
                meetingDialogData = editResult.meetingData;
                // Aggiunge il flag per indicare che è una modifica
                if (meetingDialogData) {
                  meetingDialogData.isEdit = true;
                }
                console.log('[DEBUG] Impostato flag showMeetingDialog a true dopo auto-prepareEditMeeting');
              }
            }
            break;
          
          case "prepareMeetingData":
            console.log('[DEBUG] Chiamando prepareMeetingData');
            result = await prepareMeetingData({
              clientId: args.clientId,
              clientName: args.clientName,
              subject: args.subject,
              dateTime: args.dateTime,
              duration: args.duration,
              location: args.location,
              notes: args.notes
            }, userId);
            console.log('[DEBUG] Risultato prepareMeetingData:', result);
            
            // Se il risultato è positivo, imposta il flag per mostrare il dialog
            if (result.success && result.meetingData) {
              showMeetingDialog = true;
              meetingDialogData = result.meetingData;
              
              // Se è presente una risposta suggerita, la impostiamo come risposta AI
              if (result.suggestedResponse) {
                aiResponse = result.suggestedResponse;
                console.log('[DEBUG] Utilizzo della risposta suggerita dalla funzione');
              }
              
              console.log('[DEBUG] Impostato flag showMeetingDialog a true con dati:', meetingDialogData);
            }
            
            console.log('Preparazione dati appuntamento completata:', { 
              success: result.success,
              client: result.success && result.meetingData ? result.meetingData.clientName : 'Nessun cliente trovato'
            });
            break;
          
          case "prepareEditMeeting":
            console.log('[DEBUG] Chiamando prepareEditMeeting');
            result = await prepareEditMeeting(args, userId);
            console.log('[DEBUG] Risultato prepareEditMeeting:', result);
            
            if (result.success) {
              // Imposta il flag per mostrare il dialog di modifica meeting
              showMeetingDialog = true;
              meetingDialogData = result.meetingData;
              // Aggiunge il flag per indicare che è una modifica
              meetingDialogData.isEdit = true;
              console.log('[DEBUG] Impostato flag showMeetingDialog a true con dati per modifica:', meetingDialogData);
            }
            break;

          case "composeEmailData":
            console.log('[DEBUG] Chiamando composeEmailData');
            result = await composeEmailData({
              clientId: args.clientId,
              clientName: args.clientName,
              subject: args.subject,
              emailType: args.emailType,
              content: args.content
            }, userId);
            console.log('[DEBUG] Risultato composeEmailData:', result);
            
            // Se il risultato è positivo, imposta il flag per mostrare il dialog
            if (result.success && result.emailData) {
              showEmailDialog = true;
              emailDialogData = result.emailData;
              
              // Se è presente una risposta suggerita, la impostiamo come risposta AI
              if (result.suggestedResponse) {
                aiResponse = result.suggestedResponse;
                console.log('[DEBUG] Utilizzo della risposta suggerita dalla funzione');
              }
              
              console.log('[DEBUG] Impostato flag showEmailDialog a true con dati:', emailDialogData);
            }
            
            console.log('Preparazione dati email completata:', { 
              success: result.success,
              client: result.success && result.emailData ? result.emailData.clientName : 'Nessun cliente trovato'
            });
            break;
        }
        
        console.log('[DEBUG] Funzione eseguita con successo, salvo il risultato');
        
        // Salva il risultato
        functionResults = [result];
      } catch (error) {
        console.error(`[DEBUG] Errore durante l'esecuzione della funzione ${functionName}:`, error);
        result = {
          success: false,
          error: `Si è verificato un errore durante l'esecuzione della funzione ${functionName}: ${error.message || 'Errore sconosciuto'}`
        };
        functionResults = [result];
      }
      
      // Se abbiamo un tool call ID, invio il risultato a OpenAI per generare una risposta
      if (toolCallId) {
        console.log('[DEBUG] Costruisco toolMessages per OpenAI');
        
        // Verifica se è disponibile una risposta suggerita dalla funzione prepareMeetingData
        if (functionName === "prepareMeetingData" && result?.success && result?.suggestedResponse) {
          console.log('[DEBUG] Utilizzata risposta suggerita da prepareMeetingData');
          aiResponse = result.suggestedResponse;
        } else {
          // Per TUTTE le altre funzioni, inclusa generateInvestmentIdeas
          // Prepara un messaggio specifico per la funzione
          let systemInstruction = "";
          
          if (functionName === "generateInvestmentIdeas") {
            systemInstruction = `
Presenta le idee di investimento in modo molto concreto e orientato all'azione:

1. Nel riepilogo della notizia, includi SEMPRE il link alla fonte originale.

2. Fornisci UNA sola idea di investimento per ogni notizia, molto specifica e pratica:
   - Indica esattamente cosa fare (es. "Acquistare azioni di [azienda]" o "Aumentare l'esposizione al settore X")
   - Spiega il razionale concreto basato sulla notizia
   - Specifica perché questo è il momento giusto per questa azione

3. Per ogni cliente suggerito:
   - Fornisci motivazioni DETTAGLIATE e SPECIFICHE al profilo individuale del cliente
   - Spiega come l'idea si allinea ai suoi obiettivi e restrizioni personali
   - Adatta il linguaggio al livello di sofisticazione finanziaria del cliente
   - Non includere MAI punteggi numerici o percentuali

Il tono deve essere quello di un consulente finanziario esperto che parla a un collega professionista.
`;
          }
          
          // Aggiungi l'istruzione al tool message se necessario
          const toolMessages = [
            ...apiMessages,
            completion.choices[0].message,
            {
              role: "tool" as const,
              tool_call_id: toolCallId,
              content: JSON.stringify(result || {})
            }
          ];
          
          // Se abbiamo un'istruzione specifica per questa funzione, aggiungiamo un messaggio di sistema
          if (systemInstruction) {
            toolMessages.push({
              role: "system" as const,
              content: systemInstruction
            });
          }
          
          console.log('[DEBUG] Richiamo OpenAI per followUpCompletion');
          
          // Ottieni una risposta di follow-up da OpenAI con i risultati della funzione
          try {
            const followUpCompletion = await openai.chat.completions.create({
              model: modelToUse, // Usa lo stesso modello per coerenza
              messages: toolMessages,
            });
            
            console.log('[DEBUG] Ricevuta risposta da OpenAI followUpCompletion');
            
            // Aggiorna la risposta dell'AI con il messaggio di follow-up
            if (followUpCompletion.choices[0]?.message?.content) {
              const followUpResponse = followUpCompletion.choices[0].message.content;
              console.log('[DEBUG] Contenuto risposta OpenAI:', followUpResponse.substring(0, 100));
              
              // Salva la risposta di follow-up nel database
              console.log('[DEBUG] Salvo la risposta nel database');
              try {
                await db.insert(messagesTable).values({
                  conversationId: currentConversationId,
                  content: followUpResponse,
                  role: 'assistant',
                  createdAt: new Date(),
                  functionResults: JSON.stringify(functionResults)
                });
                console.log('[DEBUG] Risposta salvata con successo nel database');
              } catch (dbError) {
                console.error('[DEBUG] Errore durante il salvataggio nel database:', dbError);
                throw dbError;
              }
              
              // Aggiorna la risposta per includere entrambi i messaggi
              aiResponse = followUpResponse;
              console.log('[DEBUG] aiResponse aggiornato con la risposta di follow-up');
            } else {
              console.log('[DEBUG] Nessun contenuto nella risposta di follow-up');
            }
          } catch (openaiError) {
            console.error('[DEBUG] Errore durante la chiamata OpenAI per follow-up:', openaiError);
            throw openaiError;
          }
        }
      } else {
        console.log('[DEBUG] Non c\'è un toolCallId, quindi non richiamo OpenAI per il follow-up');
      }
    }

    console.log('[DEBUG] Preparazione risposta finale per il client:', { 
      success: true, 
      responseLength: aiResponse.length,
      conversationId: currentConversationId,
      hasFunctionCalls: !!functionCalls,
      hasFunctionResults: !!functionResults
    });

    // Costruisci la risposta
    const response = {
      success: true,
      response: aiResponse,
      conversationId: currentConversationId,
      model: modelToUse,
      showMeetingDialog,
      meetingDialogData,
      showEmailDialog,
      emailDialogData,
      functionResults // Aggiungi i risultati delle funzioni alla risposta
    };

    console.log('Invio risposta al client:', {
      length: aiResponse.length,
      showMeetingDialog,
      hasMeetingData: !!meetingDialogData,
      hasFunctionResults: !!functionResults
    });

    // Return response with conversationId and function info
    res.json(response);

    console.log('[DEBUG] Risposta inviata al client con successo');

  } catch (error) {
    console.error('Error handling chat:', error);
    if (error instanceof OpenAI.APIError) {
       res.status(error.status || 500).json({ 
         success: false, 
         error: error.message 
       });
    } else {
       res.status(500).json({ 
         success: false, 
         error: 'An internal server error occurred' 
       });
    }
  }
};

// Get all conversations for the logged-in user
export const getConversations = async (req: Request, res: Response) => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Fetch conversations from DB for the logged-in user
    const userConversations = await db.select()
      .from(conversations)
      .where(eq(conversations.userId, req.user.id))
      .orderBy(asc(conversations.updatedAt));
    
    res.json({ 
      success: true, 
      conversations: userConversations 
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch conversations' 
    });
  }
};

// Get a specific conversation by ID
export const getConversationById = async (req: Request, res: Response) => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const conversationId = parseInt(req.params.id, 10);
    if (isNaN(conversationId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid conversation ID' 
      });
    }

    // Ensure the conversation belongs to the logged-in user
    const conversation = await db.select()
      .from(conversations)
      .where(and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, req.user.id)
      ));
    
    if (conversation.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Fetch messages for this conversation
    const conversationMessages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, conversationId))
      .orderBy(asc(messagesTable.createdAt));

    res.json({ 
      success: true, 
      messages: conversationMessages,
      conversation: conversation[0]
    });
  } catch (error) {
    console.error('Error fetching conversation by ID:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch conversation' 
    });
  }
};

// Delete a conversation by ID
export const deleteConversation = async (req: Request, res: Response) => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const conversationId = parseInt(req.params.id, 10);
    if (isNaN(conversationId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid conversation ID' 
      });
    }

    // Check if the conversation exists and belongs to the user
    const conversation = await db.select()
      .from(conversations)
      .where(and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, req.user.id)
      ));
    
    if (conversation.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or you do not have permission to delete it'
      });
    }

    // Delete all messages in the conversation first
    await db.delete(messagesTable)
      .where(eq(messagesTable.conversationId, conversationId));
    
    // Then delete the conversation
    await db.delete(conversations)
      .where(eq(conversations.id, conversationId));
    
    res.json({ 
      success: true, 
      message: 'Conversation and all related messages have been deleted'
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete conversation' 
    });
  }
};

// Delete all conversations for the current user
export const deleteAllConversations = async (req: Request, res: Response) => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get all conversations for the user
    const userConversations = await db.select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.userId, req.user.id));
    
    // Get the IDs of all conversations
    const conversationIds = userConversations.map(conv => conv.id);
    
    if (conversationIds.length === 0) {
      return res.json({
        success: true,
        message: 'No conversations to delete'
      });
    }
    
    // Delete all messages in these conversations
    for (const id of conversationIds) {
      await db.delete(messagesTable)
        .where(eq(messagesTable.conversationId, id));
    }
    
    // Delete all conversations
    await db.delete(conversations)
      .where(eq(conversations.userId, req.user.id));
    
    res.json({ 
      success: true, 
      message: `Successfully deleted all ${conversationIds.length} conversations`
    });
  } catch (error) {
    console.error('Error deleting all conversations:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete all conversations' 
    });
  }
};

// --- END NEW FUNCTIONS ---

// Add other agent-related functions here later (e.g., function calling handlers)

export const handleClientContext = async (req: Request, res: Response) => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { clientName, query, _requireClientOwnershipCheck } = req.body;
    
    if (!clientName) {
      return res.status(400).json({
        success: false,
        message: 'Manca il parametro richiesto: clientName'
      });
    }

    // SICUREZZA: Se la richiesta proviene da un endpoint che richiede verifica di proprietà,
    // eseguiamo la query con verifica di sicurezza
    const result = await getClientContext(clientName, query || "", req.user.id);
    
    // SICUREZZA: Se è richiesta la verifica di proprietà e il risultato è positivo,
    // verifichiamo che il cliente appartenga all'advisor corrente
    if (_requireClientOwnershipCheck && result.success && result.clientInfo?.personalInformation?.data?.id) {
      const clientId = result.clientInfo.personalInformation.data.id.value;
      const advisorId = result.clientInfo.personalInformation.data.advisorId?.value;
      
      if (advisorId !== req.user.id) {
        // Log del tentativo di accesso non autorizzato
        console.error(`[SECURITY VIOLATION] Utente ${req.user.id} ha tentato di accedere ai dati del cliente ${clientId} appartenente all'advisor ${advisorId}`);
        
        return res.status(403).json({
          success: false,
          message: 'Non sei autorizzato ad accedere ai dati di questo cliente'
        });
      }
      
      console.log(`[SECURITY] Accesso verificato: utente ${req.user.id} autorizzato ad accedere al cliente ${clientId}`);
    }
    
    if (result.success) {
      res.json({
        success: true,
        clientInfo: result.clientInfo,
        dataCompleteness: result.dataCompleteness,
        message: result.message
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.error
      });
    }
  } catch (error) {
    console.error('Error retrieving client context:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore nel recupero del contesto del cliente' 
    });
  }
};

// Add flow request handler
export const handleFlowRequest = async (req: Request, res: Response) => {
  return handleFlow(req, res);
}

// Initialize the router and add flow endpoint
export const agentRouter = express.Router();

// Add routes for conversations
agentRouter.post('/chat', handleChat);
agentRouter.get('/conversations', getConversations);
agentRouter.get('/conversations/:id', getConversationById);
agentRouter.delete('/conversations/:id', deleteConversation);
agentRouter.delete('/conversations', deleteAllConversations);
agentRouter.post('/client-context', handleClientContext);

// Add flow endpoint
agentRouter.post('/flow', handleFlowRequest);

// Funzione per preparare i dati di una email
async function composeEmailData(args: {
  clientId?: string;
  clientName?: string;
  subject?: string;
  emailType?: string;
  content?: string;
}, userId: number) {
  console.log('[DEBUG composeEmailData] Input ricevuti:', args);
  
  try {
    // Verifica presenza di dati obbligatori
    if (!args.clientName && !args.clientId) {
      return {
        success: false,
        error: 'È necessario specificare il nome del cliente o l\'ID del cliente.'
      };
    }
    
    if (!args.subject) {
      return {
        success: false,
        error: 'È necessario specificare l\'oggetto dell\'email.'
      };
    }
    
    if (!args.content) {
      return {
        success: false,
        error: 'È necessario specificare il contenuto dell\'email.'
      };
    }
    
    let clientId = null;
    let clientName = args.clientName || '';
    
    // Se è stato passato un ID cliente direttamente, usiamo quello
    if (args.clientId && !isNaN(parseInt(args.clientId))) {
      clientId = parseInt(args.clientId);
    } 
    // Altrimenti, cerchiamo il cliente per nome usando findClientByName
    else if (args.clientName) {
      console.log(`[DEBUG composeEmailData] Cercando cliente con nome: ${args.clientName}`);
      
      try {
        // Utilizziamo findClientByName per ottenere l'ID del cliente
        clientId = await findClientByName(args.clientName, userId, false);
        
        if (!clientId) {
          return {
            success: false,
            error: `Nessun cliente trovato con il nome "${args.clientName}".`
          };
        }
        
        // Recupera i dati completi del cliente per ottenere nome e cognome
        const clientData = await db.select({
          id: clients.id,
          firstName: clients.firstName,
          lastName: clients.lastName
        })
        .from(clients)
        .where(
          and(
            eq(clients.id, clientId),
            eq(clients.advisorId, userId)
          )
        );
        
        if (clientData.length === 0) {
          return {
            success: false,
            error: `Cliente trovato ma impossibile recuperare i dettagli completi.`
          };
        }
        
        // Imposta il nome completo
        clientName = `${clientData[0].firstName} ${clientData[0].lastName}`;
        console.log(`[DEBUG composeEmailData] Cliente trovato: ${clientName} (ID: ${clientId})`);
      } catch (dbError) {
        console.error('[ERROR composeEmailData] Errore ricerca cliente:', dbError);
        return {
          success: false,
          error: `Errore durante la ricerca del cliente: ${dbError.message || 'Database error'}`
        };
      }
    }
    
    if (!clientId) {
      return {
        success: false,
        error: 'Impossibile identificare il cliente in modo univoco.'
      };
    }
    
    // Prepara i dati per il dialog
    const emailData = {
      clientId,
      clientName,
      subject: args.subject,
      emailType: args.emailType || 'general',
      content: args.content
    };
    
    // Componi una risposta suggerita da mostrare all'utente
    const suggestedResponse = `Ho preparato l'email per ${clientName}. Puoi rivederla e inviarla tramite il pannello di controllo.`;
    
    return {
      success: true,
      emailData,
      suggestedResponse
    };
  } catch (error) {
    console.error('[ERROR composeEmailData]', error);
    return {
      success: false,
      error: `Si è verificato un errore durante la preparazione dell'email: ${error.message || 'Errore sconosciuto'}`
    };
  }
}
