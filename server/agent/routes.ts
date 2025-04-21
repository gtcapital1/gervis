import { Router } from 'express';
import { handleChat, getConversations, getConversationById, deleteConversation } from './controller';

const router = Router();

// Define the chat route
// POST /api/agent/chat (assuming this router is mounted under /api/agent)
router.post('/chat', handleChat);

// Conversation routes
router.get('/conversations', getConversations);
router.get('/conversations/:id', getConversationById);
router.delete('/conversations/:id', deleteConversation);

// Add other agent-related routes here later

export default router;
