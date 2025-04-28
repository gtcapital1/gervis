import { OpenAI } from 'openai';
import { Request, Response } from 'express';
import { db } from '../db.js'; // Import database instance
import { conversations, messages as messagesTable, clients, users } from '../../shared/schema.js'; // Rename to avoid conflict
import { eq, and, asc, desc, isNull, or, ilike } from 'drizzle-orm'; // Import query helpers
import { getClientContext, getSiteDocumentation, getMeetingsByDateRange, getMeetingsByClientName, prepareMeetingData, prepareEditMeeting, getFinancialNews, handlePortfolioGeneration } from './functions.js';
import { nanoid } from 'nanoid';
import type { createEmptyConversation, getConversationDetails, updateConversationTitle } from './conversations-service';
import type { ChatCompletion } from 'openai';
import express from 'express';
import { handleFlow } from './flow.js';
import { findClientByName } from '../services/clientProfileService.js';

// Type definitions for OpenAI API compatibility
type ChatCompletionRole = 'system' | 'user' | 'assistant' | 'tool' | 'function';

interface ChatCompletionMessageParam {
  role: ChatCompletionRole;
  content: string | null;
  tool_call_id?: string;
  name?: string;
}

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

// Define User type for TypeScript compatibility
interface User {
  id: number;
  username: string;
  // Add other properties as needed
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

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
    let showPortfolioDialog = false;
    let portfolioData = null;
    let portfolioMetrics = null;
    
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
      Tu sei Gervis, un assistente AI esperto progettato per supportare consulenti finanziari in modo professionale, conciso ed efficace. 
      
      ATTENZIONE: Quando l'utente chiede di generare un portafoglio, devi SEMPRE chiamare la funzione generatePortfolio e NON fornire un portafoglio di esempio come testo.
      
      Le tue competenze coprono:
      
      1. **Insight sui clienti e comunicazione personalizzata**  
         - Analizza i profili dei clienti  
         - Redigi email su misura in base alle loro esigenze e al loro portafoglio
      
      2. **Gestione dell'agenda e degli incontri**  
         - Pianifica, prepara e sintetizza riunioni con i clienti  
         - Suggerisci follow-up puntuali e rilevanti
      
      3. **Costruzione portafogli di investimento**  
         - Crei portafogli di investimento su misura  
         - Genera portafogli coerenti con il profilo del cliente
      
      4. **Assistenza normativa e operativa**  
         - Fornisci template, sintesi normative, risposte su strumenti della piattaforma  
      
    
      
      Parli sempre in italiano.  
      Adotta uno stile professionale, chiaro, sintetico, ispirato alle best practice del settore della consulenza finanziaria e wealth management.  
      Se il messaggio dell'utente riguarda un cliente specifico, valuta se richiedere informazioni aggiuntive tramite strumenti esterni.
      Se utente chiede di generare un portafoglio usa sempre la funzione generatePortfolio. 
      
      IMPORTANTE PER APPUNTAMENTI: Quando l'utente chiede di creare un appuntamento/meeting, NON usare frasi che indicano che l'operazione è già completata (come "Ho creato un appuntamento" o "L'appuntamento è stato fissato"). 
      Invece, usa frasi che indicano che l'operazione è in preparazione (ad esempio "Sto preparando un appuntamento con [cliente]" o "Ho compilato i dettagli per l'appuntamento").
      Questo perché l'utente dovrà confermare l'appuntamento tramite un'interfaccia grafica, quindi l'operazione non è ancora conclusa.
      
      IMPORTANTE PER EMAIL: chiamare la funzione composeEmailData SOLO se utente ha chiesto esplicitamente di INVIARE la mail. Se utente chiede di preparare mail, rispondi normalmente senza chiamare funzione composeEmailData.;
      Ad esempio: "INVIA un'email a Mario Rossi" o "INVIA messaggio di follow-up a Bianchi". 
      In questi casi, chiama la funzione composeEmailData con i dettagli dell'email. Non suggerire di inviare email se l'utente non ha usato la parola "INVIA" esplicitamente.
      
      IMPORTANTE PER PORTAFOGLI:
      **Generazione e analisi di portafogli**
         - Quando generi un portafoglio di investimento, riepiloga SEMPRE le metriche calcolate:
           - Rischio medio ponderato (scala 1-7)
           - Orizzonte temporale medio (in anni)
           - Distribuzione percentuale per asset class (equity, bonds, cash, ecc.)
         - Presenta le allocazioni in formato tabellare ben organizzato
         - Spiega in dettaglio la logica della costruzione del portafoglio
         - Dai sempre il dettaglio degli asset del portafoglio con i rispettivi pesi

      Quando generi un portafoglio di investimento, informa l'utente che può:
      - Aggiungere il portafoglio ai modelli salvati tramite il pulsante dedicato
      - Chiedere modifiche specifiche al portafoglio per adattarlo ulteriormente
      Sottolinea che l'utente può continuare a interagire con il portafoglio nella chat.
      
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
      .filter((msg: any) => validRoles.includes(msg.role))
      .map((msg: any) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));
    
    // Inizializza array di messaggi con messaggio di sistema e storico della conversazione
    let messages: OpenAIMessage[] = [systemMessage, ...historyOpenAIMessages];

    console.log('------------- INIZIO CICLO PLANNING DINAMICO -------------');
    console.log(`Using model: ${modelToUse}`);
    
    // Variabili per il planning dinamico
    let finalResponse = '';
    let step = 0;
    const maxSteps = 4;
    let allFunctionResults: any[] = [];
    
    // Esegui il loop di planning (massimo 4 step)
    while (step < maxSteps) {
      step++;
      console.log(`[PLANNING] Step ${step} di ${maxSteps}`);
      
      // Convert our OpenAIMessage array to ChatCompletionMessageParam[] for OpenAI API
      const apiMessages: ChatCompletionMessageParam[] = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        tool_call_id: msg.tool_call_id
      }));

      // Chiamata a OpenAI con i messaggi correnti (senza forzare tool specifici)
      const completion = await openai.chat.completions.create({
        model: modelToUse,
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
              name: "generatePortfolio",
              description: "Genera un portafoglio di investimento ottimizzato in base al profilo del cliente, al livello di rischio e all'orizzonte temporale. Utilizza l'AI per creare un'allocazione ottimale utilizzando solo i prodotti disponibili per l'utente. Chiamare questa funzione quando l'utente richiede di generare un portafoglio di investimento.",
              parameters: {
                type: "object",
                properties: {
                  portfolioDescription: {
                    type: "string",
                    description: "Descrizione del portafoglio da generare, specificando l'obiettivo e le caratteristiche principali"
                  },
                  clientProfile: {
                    type: "string",
                    description: "Descrizione del profilo del cliente per cui è destinato il portafoglio"
                  },
                  riskLevel: {
                    type: "string",
                    description: "Livello di rischio desiderato per il portafoglio (conservative, moderate, balanced, growth, aggressive)",
                    enum: ["conservative", "moderate", "balanced", "growth", "aggressive"]
                  },
                  investmentHorizon: {
                    type: "string",
                    description: "Orizzonte temporale degli investimenti (short_term, medium_term, long_term)",
                    enum: ["short_term", "medium_term", "long_term"]
                  },
                  objectives: {
                    type: "array",
                    description: "Obiettivi di investimento",
                    items: {
                      type: "string",
                      enum: ["growth", "income", "preservation", "tax_efficiency", "liquidity", "sustainability"]
                    }
                  }
                },
                required: ["portfolioDescription", "clientProfile"]
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
        tool_choice: "auto" // Lasciamo all'AI la libertà di scegliere quale tool usare
      });
      
      console.log(`[PLANNING] Risposta OpenAI (Step ${step}):`, { 
        content: completion.choices[0]?.message?.content?.substring(0, 100) + '...',
        hasFunctionCalls: !!completion.choices[0]?.message?.tool_calls?.length
      });

      const choice = completion.choices[0];
      if (!choice || !choice.message) {
        console.error(`[PLANNING] Nessuna risposta valida ricevuta nel step ${step}`);
        break;
      }
      
      // Fix the ChatCompletionMessage handling with appropriate types
      if (choice && choice.message) {
        // Extract the content or use empty string if null
        const assistantMessageContent = choice.message.content || '';
        
        // Create our own message object with the correct type
        const assistantMessage: OpenAIMessage = {
          role: 'assistant',
          content: assistantMessageContent
        };
        
        // Push the correctly typed message
        messages.push(assistantMessage);
      }
      
      // Se non ci sono tool calls, probabilmente abbiamo la risposta finale
      if (!choice.message.tool_calls || choice.message.tool_calls.length === 0) {
        console.log(`[PLANNING] Risposta finale ricevuta al step ${step}`);
        finalResponse = choice.message.content || '';
        break;
      }
      
      // Processo tutte le tool calls richieste dall'AI
      for (const toolCall of choice.message.tool_calls) {
        const functionName = toolCall.function.name;
        let functionArgs;
        
        try {
          functionArgs = JSON.parse(toolCall.function.arguments);
        } catch (error) {
          console.error(`[PLANNING] Errore parsing arguments per ${functionName}:`, error);
          functionArgs = {};
        }
        
        console.log(`[PLANNING] Esecuzione tool: ${functionName}`, functionArgs);
        
        let functionResult;
        try {
          // Esegui la funzione richiesta
        switch (functionName) {
          case "getClientContext":
              functionResult = await getClientContext(functionArgs.clientName, functionArgs.query, userId);
            console.log('Recupero contesto cliente completato:', { 
                success: functionResult.success,
                client: functionResult.success && functionResult.clientInfo?.personalInformation?.data ? 
                  `${functionResult.clientInfo.personalInformation.data.firstName.value} ${functionResult.clientInfo.personalInformation.data.lastName.value}` : 
                'Cliente trovato ma dati incompleti'
            });
            break;
          
            case "generatePortfolio":
              console.log(`[PLANNING] INIZIO GENERAZIONE PORTAFOGLIO con parametri:`, functionArgs);
              functionResult = await handlePortfolioGeneration({
                portfolioDescription: functionArgs.portfolioDescription,
                clientProfile: functionArgs.clientProfile,
                riskLevel: functionArgs.riskLevel,
                investmentHorizon: functionArgs.investmentHorizon,
                objectives: functionArgs.objectives
              }, userId);
              
              console.log(`[PLANNING] RISULTATO generazione portafoglio:`, { 
                success: functionResult.success, 
                hasPortfolio: !!functionResult.portfolio,
                hasMetrics: !!functionResult.portfolioMetrics,
                portfolioName: functionResult.portfolio?.name
              });
              
              // Se abbiamo generato un portfolio, mostra il dialog
              if (functionResult.success && functionResult.portfolio) {
                showPortfolioDialog = true;
                portfolioData = functionResult.portfolio;
                portfolioMetrics = functionResult.portfolioMetrics;
                console.log(`[PLANNING] Impostato showPortfolioDialog=true con dati:`, {
                  name: portfolioData.name,
                  hasAllocation: !!portfolioData.allocation,
                  allocationCount: portfolioData.allocation?.length,
                  hasMetrics: !!portfolioMetrics
                });
              }
              break;
            
            case "getSiteDocumentation":
              functionResult = await getSiteDocumentation();
            break;
          
          case "getFinancialNews":
              functionResult = await getFinancialNews(functionArgs.maxResults);
            break;
          
          case "getMeetingsByDateRange":
              functionResult = await getMeetingsByDateRange(functionArgs.dateRange, userId);
            break;
          
          case "getMeetingsByClientName":
              functionResult = await getMeetingsByClientName(functionArgs.clientName, userId);
            break;
          
          case "prepareMeetingData":
              functionResult = await prepareMeetingData({
                clientId: functionArgs.clientId,
                clientName: functionArgs.clientName,
                subject: functionArgs.subject,
                dateTime: functionArgs.dateTime,
                duration: functionArgs.duration,
                location: functionArgs.location,
                notes: functionArgs.notes
            }, userId);
            
            // Se il risultato è positivo, imposta il flag per mostrare il dialog
              if (functionResult.success && functionResult.meetingData) {
              showMeetingDialog = true;
                meetingDialogData = functionResult.meetingData;
              }
            break;
          
          case "prepareEditMeeting":
              functionResult = await prepareEditMeeting(functionArgs, userId);
            
              if (functionResult.success && functionResult.meetingData) {
              // Imposta il flag per mostrare il dialog di modifica meeting
              showMeetingDialog = true;
                meetingDialogData = functionResult.meetingData;
                if (meetingDialogData) {
              meetingDialogData.isEdit = true;
                }
            }
            break;

          case "composeEmailData":
              functionResult = await composeEmailData({
                clientId: functionArgs.clientId,
                clientName: functionArgs.clientName,
                subject: functionArgs.subject,
                emailType: functionArgs.emailType,
                content: functionArgs.content
            }, userId);
            
            // Se il risultato è positivo, imposta il flag per mostrare il dialog
              if (functionResult.success && functionResult.emailData) {
              showEmailDialog = true;
                emailDialogData = functionResult.emailData;
              }
              break;
              
            default:
              functionResult = {
                success: false,
                error: `Funzione non implementata: ${functionName}`
              };
          }
          
          // Aggiungi questo risultato all'array totale dei risultati
          allFunctionResults.push({
            name: functionName,
            result: functionResult
          });
          
      } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
          console.error(`[PLANNING] Errore nell'esecuzione di ${functionName}:`, errorMessage);
          functionResult = {
          success: false,
            error: `Errore nell'esecuzione della funzione: ${errorMessage}`
          };
        }
        
        // Aggiungi il risultato come messaggio di risposta alla tool call
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(functionResult || {})
        });
      }
    }
    
    console.log('------------- FINE CICLO PLANNING DINAMICO -------------');
    console.log(`Completati ${step} step di planning. Risposta finita: ${!!finalResponse}`);
    
    // Se non abbiamo ricevuto una risposta finale esplicita, usa l'ultimo messaggio ricevuto
    if (!finalResponse && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant' && lastMessage.content) {
        finalResponse = lastMessage.content;
      } else {
        finalResponse = "Mi dispiace, non sono riuscito a elaborare una risposta completa.";
      }
    }
    
    // Salva la risposta dell'assistente nel database
                await db.insert(messagesTable).values({
                  conversationId: currentConversationId,
      content: finalResponse,
                  role: 'assistant',
                  createdAt: new Date(),
      functionResults: JSON.stringify(allFunctionResults.length > 0 ? allFunctionResults : null)
    });
    
    // Costruisci la risposta per il client
    const response = {
      success: true,
      response: finalResponse,
      conversationId: currentConversationId,
      model: modelToUse,
      showMeetingDialog,
      meetingDialogData,
      showEmailDialog,
      emailDialogData,
      showPortfolioDialog,
      portfolioData,
      portfolioMetrics,
      functionResults: allFunctionResults.length > 0 ? allFunctionResults : null
    };

    console.log('Invio risposta al client:', {
      length: finalResponse.length,
      showMeetingDialog,
      showPortfolioDialog,
      hasMeetingData: !!meetingDialogData,
      hasPortfolioData: !!portfolioData,
      hasFunctionResults: allFunctionResults.length > 0
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
    
    // Verifica la configurazione SMTP dell'utente
    try {
      // Tenta di recuperare le impostazioni email dell'utente
      const user = await db.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      // Se l'utente non ha configurato SMTP, notifica subito senza tentare l'invio
      if (!user[0]?.custom_email_enabled || !user[0]?.smtp_host || !user[0]?.smtp_user) {
        console.log('[DEBUG composeEmailData] Configurazione SMTP mancante per l\'utente', userId);
        return {
          success: false,
          error: 'Per inviare email, configura le tue impostazioni SMTP nel tab Impostazioni.',
          errorCode: 'SMTP_CONFIG_MISSING'
        };
      }
    } catch (error) {
      console.error('[ERROR composeEmailData] Errore verifica configurazione SMTP:', error);
      // Continuiamo comunque, lasceremo che il servizio email rilevi l'errore se necessario
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
    
    // Verifica se l'errore è relativo alla configurazione SMTP mancante
    if (error instanceof Error && error.message.includes('Configurazione email mancante')) {
      return {
        success: false,
        error: 'Per inviare email, configura le tue impostazioni SMTP nel tab Impostazioni.',
        errorCode: 'SMTP_CONFIG_MISSING'
      };
    }
    
    return {
      success: false,
      error: `Si è verificato un errore durante la preparazione dell'email: ${error.message || 'Errore sconosciuto'}`
    };
  }
}
