import type { Express, Request, Response } from "express";
import { safeLog, handleErrorResponse, isAuthenticated } from "../routes";
import { getClientProfile, updateClientProfile } from "../ai/profile-controller";
import { getAdvisorSuggestions } from "../ai/advisor-suggestions-controller";
import { generateInvestmentIdeas, getPromptForDebug } from "../investment-ideas-controller";

export function registerAiRoutes(app: Express) {
  // Rotte per il profilo cliente AI
  app.get('/api/ai/client-profile/:clientId', isAuthenticated, async (req, res) => {
    try {
      await getClientProfile(req, res);
    } catch (error) {
      safeLog('Errore nel recupero del profilo AI del cliente', error, 'error');
      handleErrorResponse(res, error, 'Impossibile recuperare il profilo AI del cliente');
    }
  });
  
  app.post('/api/ai/client-profile/:clientId', isAuthenticated, async (req, res) => {
    try {
      await updateClientProfile(req, res);
    } catch (error) {
      safeLog('Errore nell\'aggiornamento del profilo AI del cliente', error, 'error');
      handleErrorResponse(res, error, 'Impossibile aggiornare il profilo AI del cliente');
    }
  });
  
  // Rotte per suggerimenti all'advisor
  app.get('/api/ai/advisor-suggestions', isAuthenticated, async (req, res) => {
    try {
      await getAdvisorSuggestions(req, res);
    } catch (error) {
      safeLog('Errore nel recupero dei suggerimenti per l\'advisor', error, 'error');
      handleErrorResponse(res, error, 'Impossibile recuperare i suggerimenti per l\'advisor');
    }
  });
  
  // Rotte per idee di investimento
  app.get('/api/ai/investment-ideas', isAuthenticated, async (req, res) => {
    try {
      await generateInvestmentIdeas(req, res);
    } catch (error) {
      safeLog('Errore nella generazione delle idee di investimento', error, 'error');
      handleErrorResponse(res, error, 'Impossibile generare idee di investimento');
    }
  });
  
  // Rotta di debug per visualizzare il prompt
  app.get('/api/ai/investment-ideas/debug', isAuthenticated, async (req, res) => {
    try {
      await getPromptForDebug(req, res);
    } catch (error) {
      safeLog('Errore nel recupero del prompt di debug', error, 'error');
      handleErrorResponse(res, error, 'Impossibile recuperare il prompt di debug');
    }
  });
} 