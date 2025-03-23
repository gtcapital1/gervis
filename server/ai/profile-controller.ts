/**
 * Controller per le funzionalità AI relative al profilo cliente
 * Gestisce l'endpoint per la generazione del profilo arricchito
 */

import { Request, Response } from 'express';
import { generateClientProfile } from './openai-service';
import { storage } from '../storage';

/**
 * Genera il profilo arricchito per un cliente
 * GET /api/ai/client-profile/:clientId
 */
export async function getClientProfile(req: Request, res: Response) {
  try {
    const clientId = parseInt(req.params.clientId);
    
    if (isNaN(clientId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid client ID"
      });
    }
    
    // Verifica se l'utente è autenticato
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ 
        success: false, 
        message: "Not authenticated"
      });
    }
    
    // Recupera il cliente dal database
    const client = await storage.getClient(clientId);
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found"
      });
    }
    
    // Verifica che il cliente appartenga all'advisor corrente
    if (client.advisorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to access this client's profile"
      });
    }
    
    // Verifica che il cliente abbia completato l'onboarding
    if (!client.isOnboarded) {
      return res.status(400).json({
        success: false,
        message: "Client has not completed onboarding"
      });
    }
    
    // Recupera i log del cliente (interazioni passate)
    const clientLogs = await storage.getClientLogs(clientId);
    
    // Genera il profilo arricchito utilizzando l'AI
    const profileData = await generateClientProfile(client, clientLogs);
    
    return res.json({
      success: true,
      data: profileData
    });
  } catch (error: any) {
    console.error("Error generating client profile:", error);
    
    // Gestione degli errori specifici
    if (error.message && (
      error.message.includes("OpenAI API key not configured") ||
      error.message.includes("Credito OpenAI esaurito")
    )) {
      return res.status(402).json({
        success: false,
        error: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      error: "Failed to generate client profile: " + (error.message || "Unknown error")
    });
  }
}