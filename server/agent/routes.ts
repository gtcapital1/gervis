/**
 * GERVIS AGENT ROUTES
 * 
 * Definizione delle rotte API per l'agente conversazionale
 */

import { Router, Request, Response } from 'express';
import { isAuthenticated } from '../routes';
import {
  handleAgentRequest,
  getConversationHistory,
  getConversations
} from './controller';

const router = Router();

// Endpoint principale per inviare messaggi all'agente
router.post('/agent/message', isAuthenticated, handleAgentRequest);

// Recupera l'elenco delle conversazioni dell'utente
router.get('/agent/conversations', isAuthenticated, getConversations);

// Recupera la cronologia dei messaggi di una specifica conversazione
router.get('/agent/conversations/:id', isAuthenticated, getConversationHistory);

// Registra le rotte nell'app
export function registerAgentRoutes(app: Router) {
  app.use('/api', router);
} 