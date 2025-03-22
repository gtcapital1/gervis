/**
 * Routes per l'integrazione AI
 * Questo file contiene gli endpoint necessari per l'integrazione con OpenAI
 * per generare approfondimenti e suggerimenti basati sui dati del cliente.
 */
import { Request, Response } from 'express';
import { generateEnrichedProfile, verifyOpenAIConfiguration } from './ai-services';
import { storage } from './storage';

// Middleware di autenticazione
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ success: false, message: 'Autenticazione richiesta' });
}

/**
 * Registra le rotte per l'integrazione AI nell'app Express
 * @param app App Express
 */
export function registerAiRoutes(app: any) {
  /**
   * Endpoint per generare un profilo cliente arricchito con approfondimenti AI
   * Utilizza i dati del cliente e i log delle interazioni per generare
   * approfondimenti e suggerimenti personalizzati.
   */
  app.get("/api/ai/client-profile/:clientId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId);
      if (isNaN(clientId)) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID cliente non valido' 
        });
      }
      
      // Carica i dati del cliente
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ 
          success: false, 
          message: 'Cliente non trovato' 
        });
      }
      
      // Verifica che l'utente abbia accesso a questo cliente
      if (req.user && 'id' in req.user) {
        const userId = req.user.id;
        // Se l'utente non è admin e il cliente non è assegnato a lui
        if (req.user.role !== 'admin' && client.advisorId !== userId) {
          return res.status(403).json({ 
            success: false, 
            message: 'Non hai i permessi per accedere a questo cliente' 
          });
        }
      }
      
      // Carica i log delle interazioni del cliente
      const logs = await storage.getClientLogs(clientId);
      
      // Genera il profilo arricchito
      const enrichedProfile = await generateEnrichedProfile(client, logs);
      
      res.json({ 
        success: true, 
        data: enrichedProfile
      });
    } catch (error) {
      console.error('Errore nella generazione del profilo AI:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Errore interno del server' 
      });
    }
  });
  
  /**
   * Verifica che la configurazione OpenAI sia valida
   * Questo endpoint è utilizzato principalmente per scopi di diagnostica
   */
  app.get("/api/ai/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const isConfigured = await verifyOpenAIConfiguration();
      res.json({ 
        success: true, 
        configured: isConfigured
      });
    } catch (error) {
      console.error('Errore nella verifica della configurazione OpenAI:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Errore interno del server', 
        configured: false
      });
    }
  });
  
  /**
   * Endpoint di debug pubblico per verificare la configurazione OpenAI
   * Non richiede autenticazione per facilitare il debug
   */
  app.get("/api/ai/debug-status", async (req: Request, res: Response) => {
    try {
      console.log("[DEBUG AI] Richiesta debug status OpenAI ricevuta");
      const apiKey = process.env.OPENAI_API_KEY;
      const apiKeyExists = !!apiKey;
      const apiKeyLength = apiKeyExists ? apiKey.length : 0;
      const apiKeyPrefix = apiKeyExists ? apiKey.substring(0, 7) : "";
      
      console.log("[DEBUG AI] Chiave API esistente:", apiKeyExists);
      console.log("[DEBUG AI] Lunghezza chiave API:", apiKeyLength);
      console.log("[DEBUG AI] Prefisso chiave API:", apiKeyPrefix);
      
      let isValid = false;
      let error = null;
      
      try {
        console.log("[DEBUG AI] Tentativo di verifica API...");
        isValid = await verifyOpenAIConfiguration();
        console.log("[DEBUG AI] Verifica API completata, risultato:", isValid);
      } catch (err) {
        console.error("[DEBUG AI] Errore durante la verifica:", err);
        error = (err as Error).message;
      }
      
      res.json({ 
        success: true,
        valid: isValid,
        apiKeyExists,
        apiKeyLength,
        apiKeyPrefix,
        error,
        message: isValid ? 'Configurazione OpenAI valida' : 'Configurazione OpenAI non valida'
      });
    } catch (error) {
      console.error("[DEBUG AI] Errore completo durante debug status:", error);
      res.status(500).json({ 
        success: false, 
        valid: false,
        message: 'Errore durante la verifica della configurazione OpenAI',
        error: (error as Error).message
      });
    }
  });
}