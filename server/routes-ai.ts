/**
 * Routes per l'integrazione AI
 * Questo file contiene gli endpoint necessari per l'integrazione con OpenAI
 * per generare approfondimenti e suggerimenti basati sui dati del cliente.
 */

import { Request, Response } from "express";
import { generateEnrichedProfile } from "./ai-services";
import { storage } from "./storage";

// Middleware per verificare che l'utente sia autenticato
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  
  // Verifica se l'utente è in stato "pending"
  if (req.user?.approvalStatus === 'pending') {
    return res.status(403).json({
      success: false,
      message: "In attesa di approvazione da parte del management di Gervis",
      pendingApproval: true
    });
  }
  
  // Verifica se l'utente è in stato "rejected"
  if (req.user?.approvalStatus === 'rejected') {
    return res.status(403).json({
      success: false,
      message: "La tua registrazione è stata rifiutata. Per favore contatta l'amministratore per maggiori informazioni.",
      rejected: true
    });
  }
  
  next();
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
      // Ottieni l'ID cliente dai parametri della richiesta
      const clientId = parseInt(req.params.clientId);
      if (isNaN(clientId)) {
        return res.status(400).json({
          success: false,
          message: "ID cliente non valido"
        });
      }
      
      // Verifica che il cliente esista nel database
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({
          success: false,
          message: "Cliente non trovato"
        });
      }
      
      // Verifica che l'utente corrente sia l'advisor di questo cliente
      if (client.advisorId !== req.user?.id) {
        return res.status(403).json({
          success: false,
          message: "Non sei autorizzato ad accedere ai dati di questo cliente"
        });
      }
      
      // Recupera i log delle interazioni del cliente
      const logs = await storage.getClientLogs(clientId);
      
      // Genera il profilo arricchito utilizzando OpenAI
      const enrichedProfile = await generateEnrichedProfile(client, logs);
      
      // Restituisci il profilo arricchito
      res.json({
        success: true,
        clientId,
        profile: enrichedProfile
      });
      
    } catch (error) {
      console.error("[ERROR] Errore durante la generazione del profilo cliente AI:", error);
      
      // Controlla se l'errore è legato alla chiave API mancante
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('OpenAI') && message.includes('API')) {
        return res.status(500).json({
          success: false,
          message: "Errore di configurazione API AI. Contatta l'amministratore.",
          apiError: true
        });
      }
      
      res.status(500).json({
        success: false,
        message: "Errore durante la generazione del profilo cliente",
        error: message
      });
    }
  });
  
  /**
   * Verifica che la configurazione OpenAI sia valida
   * Questo endpoint è utilizzato principalmente per scopi di diagnostica
   */
  app.get("/api/ai/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Verifica che il client OpenAI sia inizializzato
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({
          success: false,
          message: "Chiave API OpenAI non configurata",
          apiConfigured: false
        });
      }
      
      res.json({
        success: true,
        message: "Integrazione AI configurata correttamente",
        apiConfigured: true
      });
      
    } catch (error) {
      console.error("[ERROR] Errore durante la verifica dello stato AI:", error);
      
      res.status(500).json({
        success: false,
        message: "Errore durante la verifica dello stato dell'integrazione AI",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}