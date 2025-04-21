import { OpenAI } from 'openai';
import { Request, Response } from 'express';
import { db } from '../db'; // Import database instance
import { conversations, messages as messagesTable } from '../../shared/schema'; // Rename to avoid conflict
import { eq, and, asc } from 'drizzle-orm'; // Import query helpers and asc helper for sorting
// Import necessary types from schema if needed later, e.g., for conversation history
// import { Conversation, Message } from '../../shared/schema'; 

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
    const { message, conversationId } = req.body; // Expect message content and optional conversationId

    // Ensure message is a string
    if (!message || typeof message !== 'string') {
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
    let conversationTitle = message.substring(0, 50); // First 50 chars as title
    
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
      content: message,
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
      content: 'You are Gervis, an advanced AI assistant specialized for financial advisors. Your purpose is to help them onboard and manage clients, automate tasks, provide insights and generate ideas. Your capabilities include: helping with client management, scheduling appointments, providing investment ideas, generating reports, answering questions about financial products, and guiding advisors through platform features. You have expertise in wealth management, financial planning, client relations, and investment strategies. Always respond in a professional, concise manner that reflects industry best practices.'
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

    // Call OpenAI API with properly typed messages
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using the specified model
      messages: apiMessages,
      // Add other parameters like temperature, max_tokens if needed
    });

    const aiResponse = completion.choices[0]?.message?.content;

    if (!aiResponse) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to get response from AI' 
      });
    }
    
    // Save assistant response to database
    await db.insert(messagesTable).values({
      conversationId: currentConversationId,
      content: aiResponse,
      role: 'assistant',
      createdAt: new Date()
    });
    
    // Return response with conversationId
    res.json({ 
      success: true, 
      response: aiResponse,
      conversationId: currentConversationId
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

// --- END NEW FUNCTIONS ---

// Add other agent-related functions here later (e.g., function calling handlers)
