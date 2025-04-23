import { Router } from 'express';
import { handleChat, getConversations, getConversationById, deleteConversation, deleteAllConversations, handleClientContext } from './controller';
import { Request, Response, NextFunction } from 'express';

const router = Router();

// Middleware di sicurezza per proteggere l'accesso ai dati dei clienti
function validateClientAccess(req: Request, res: Response, next: NextFunction) {
  // Verifica che l'utente sia autenticato (dovrebbe già essere verificato dal middleware isAuthenticated)
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      error: 'User not authenticated'
    });
  }

  // Se ci sono informazioni relative al cliente nel corpo della richiesta, verifichiamo che il cliente appartenga all'advisor
  if (req.body.clientName || req.body.clientId) {
    // Registriamo la richiesta per motivi di sicurezza e audit
    console.log(`[SECURITY] Accesso ai dati cliente richiesto da user ${req.user.id} - clientName: "${req.body.clientName}" - clientId: ${req.body.clientId}`);
    
    // Controlliamo in controller.ts per garantire che il cliente appartenga all'advisor
    // Qui impostiamo solo il flag che indica che è necessario un controllo di sicurezza
    req.body._requireClientOwnershipCheck = true;
  }

  // Procedi con la richiesta
  next();
}

// Define the chat route
// POST /api/agent/chat (assuming this router is mounted under /api/agent)
router.post('/chat', handleChat);

// Conversation routes
router.get('/conversations', getConversations);
router.get('/conversations/:id', getConversationById);
router.delete('/conversations/:id', deleteConversation);
router.delete('/conversations', deleteAllConversations);

// Client context route - SICUREZZA: Applica il middleware di validazione 
router.post('/client/context', validateClientAccess, handleClientContext);

// Add other agent-related routes here later

export default router;
