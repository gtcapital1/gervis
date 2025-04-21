import { OpenAI } from 'openai';
import { Request, Response } from 'express';
import { db } from '../db'; // Import database instance
import { conversations, messages as messagesTable } from '../../shared/schema'; // Rename to avoid conflict
import { eq, and, asc } from 'drizzle-orm'; // Import query helpers and asc helper for sorting
// Import necessary types from schema if needed later, e.g., for conversation history
// import { Conversation, Message } from '../../shared/schema'; 
import { getClientContext } from './functions';

// Initialize OpenAI client
// Ensure OPENAI_API_KEY is set in your environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Type for OpenAI message
type OpenAIMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
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
    const { message: userMessage, conversationId } = req.body; // Expect message content and optional conversationId

    // Ensure message is a string
    if (!userMessage || typeof userMessage !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Message content must be a non-empty string' 
      });
    }

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
      content: 'Sei Gervis, un assistente AI avanzato specializzato per consulenti finanziari. Il tuo scopo è aiutarli con le seguenti capacità: 1) Insight clienti e mail personalizzate: analizza i profili dei clienti e genera email personalizzate; 2) Gestione calendario e incontri: pianifica, prepara e fai follow-up degli incontri con i clienti; 3) Generazione idee basate su news recenti: fornisci suggerimenti di investimento basati sulle ultime notizie di mercato; 4) Assistenza generale: supporto con normative, template di documenti e utilizzo della piattaforma. Hai competenze in gestione patrimoniale, pianificazione finanziaria, relazioni con i clienti e strategie di investimento. Rispondi sempre in italiano in modo professionale e conciso, riflettendo le migliori pratiche del settore.'
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
    // --- END DEBUG LOG ---

    // Determiniamo se la richiesta sembra riferirsi a un cliente
    const messageText = userMessage.toLowerCase();
    
    // Regex per trovare possibili nomi di cliente nel formato "Nome Cognome"
    const nameRegex = /\b([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/g;
    
    // Estrai possibili nomi di clienti dal messaggio
    let clientNames = [];
    let match;
    const messageWithCapitalizedNames = userMessage.replace(/\b[a-z]/g, c => c.toUpperCase());
    while ((match = nameRegex.exec(messageWithCapitalizedNames)) !== null) {
      clientNames.push(match[0]);
    }
    
    // Keywords che potrebbero indicare una richiesta relativa a un cliente
    const clientKeywords = ['profilo', 'cliente', 'informazioni su', 'dati di', 'portafoglio di'];
    const isClientRequest = clientKeywords.some(keyword => messageText.includes(keyword));
    
    let clientName = null;
    if (clientNames.length > 0) {
      clientName = clientNames[0]; // Prendiamo il primo nome trovato
    } else if (isClientRequest) {
      // Cerca di estrarre nomi dal messaggio
      const words = messageText.split(/\s+/);
      for (let i = 0; i < words.length; i++) {
        // Cerchiamo parole che iniziano con maiuscola e non sono all'inizio della frase
        if (i > 0 && words[i].charAt(0) === words[i].charAt(0).toUpperCase() && words[i].length > 2) {
          clientName = words[i];
          break;
        }
      }
    }
    
    console.log(`[DEBUG] Rilevato possibile nome cliente: "${clientName}"`);
    
    // Call OpenAI API with properly typed messages
    console.log('Chiamata OpenAI in corso...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini', // Using the specified model
      messages: apiMessages,
      tools: [
        {
          type: "function",
          function: {
            name: "getClientContext",
            description: "Ottiene informazioni contestuali su un cliente. Chiamare questa funzione quando l'utente menziona il nome di un cliente o chiede informazioni su un cliente specifico. Utile per rispondere a domande come 'che profilo ha X?', 'parlami di Y', 'cosa sai di Z?', ecc.",
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
        }
      ],
      // Se è stata identificata una richiesta relativa a un cliente, forziamo l'uso del tool
      tool_choice: clientName ? {
        type: "function",
        function: {
          name: "getClientContext"
        }
      } : "auto",
      // Add other parameters like temperature, max_tokens if needed
    });
    
    console.log('Risposta OpenAI ricevuta:', { 
      content: completion.choices[0]?.message?.content?.substring(0, 100) + '...',
      hasFunctionCalls: !!completion.choices[0]?.message?.tool_calls?.length
    });

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
      
      if (toolCall.function.name === "getClientContext") {
        functionCalls = [
          {
            name: "getClientContext",
            arguments: JSON.parse(toolCall.function.arguments)
          }
        ];
        
        toolCallId = toolCall.id;
        
        // If there's no content, add a placeholder

      }
    }

    // Save assistant response to database
    await db.insert(messagesTable).values({
      conversationId: currentConversationId,
      content: aiResponse,
      role: 'assistant',
      createdAt: new Date(),
      functionCalls: functionCalls ? JSON.stringify(functionCalls) : null
    });

    // Handle function calls if present
    let functionResults = null;
    if (functionCalls) {
      // Process the getClientContext function call
      if (functionCalls[0].name === "getClientContext") {
        const args = functionCalls[0].arguments;
        console.log('Chiamata funzione getClientContext con argomenti:', { 
          clientName: args.clientName, 
          query: args.query?.substring(0, 50) + '...' 
        });
        
        try {
          console.log('Avvio recupero contesto cliente...');
          const result = await getClientContext(
            args.clientName,
            args.query,
            userId
          );
          
          console.log('Recupero contesto cliente completato:', { 
            success: result.success,
            client: result.success && result.clientInfo && result.clientInfo.basicInfo ? 
              `${result.clientInfo.basicInfo.firstName} ${result.clientInfo.basicInfo.lastName}` : 
              'Cliente trovato ma dati incompleti'
          });
          
          functionResults = [result];
          
          // If we have a tool call ID, send the result back to OpenAI
          if (toolCallId) {
            const toolMessages = [
              ...apiMessages,
              completion.choices[0].message,
              {
                role: "tool" as const,
                tool_call_id: toolCallId,
                content: JSON.stringify(result)
              }
            ];
            
            // Get a follow-up message from OpenAI with the function results
            const followUpCompletion = await openai.chat.completions.create({
              model: 'gpt-4.1-mini',
              messages: toolMessages,
            });
            
            // Update the AI response with the follow-up message
            if (followUpCompletion.choices[0]?.message?.content) {
              const followUpResponse = followUpCompletion.choices[0].message.content;
              
              // Save the follow-up response to the database
              await db.insert(messagesTable).values({
                conversationId: currentConversationId,
                content: followUpResponse,
                role: 'assistant',
                createdAt: new Date(),
                functionResults: JSON.stringify(functionResults)
              });
              
              // Update the response to include both messages
              aiResponse = [aiResponse, followUpResponse].join('\n\n');
            }
          }
        } catch (error) {
          console.error("Error executing getClientContext function:", error);
          functionResults = [{
            success: false,
            error: "Si è verificato un errore durante il recupero delle informazioni sul cliente"
          }];
        }
      }
    }

    // Return response with conversationId and function info
    res.json({ 
      success: true, 
      response: aiResponse,
      conversationId: currentConversationId,
      functionCalls: functionCalls,
      functionResults: functionResults
    });

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

    const { clientName, query } = req.body;
    
    if (!clientName) {
      return res.status(400).json({
        success: false,
        message: 'Manca il parametro richiesto: clientName'
      });
    }

    const result = await getClientContext(clientName, query || "", req.user.id);
    
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
