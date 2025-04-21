import type { Express } from "express";
import agentRouter from "../agent/routes";
import { isAuthenticated } from "../routes";

export function registerAgentRoutes(app: Express) {
  console.log('[Routes] Registrazione router agente AI');
  
  // Monta il router sotto /api/agent
  // Aggiungi middleware di autenticazione
  app.use('/api/agent', isAuthenticated, agentRouter);
  
  console.log('[Routes] Router agente AI registrato con successo.');
} 