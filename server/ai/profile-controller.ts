/**
 * Controller per le funzionalità AI relative al profilo cliente
 * Gestisce l'endpoint per la generazione del profilo arricchito
 * Implementa un sistema di cache per evitare chiamate ridondanti all'API OpenAI
 */

import { Request, Response } from 'express';
import { generateClientProfile } from './openai-service';
import { storage } from '../storage';
import { Client, ClientLog } from '@shared/schema';

// Intervallo in millisecondi (24 ore) prima di considerare i dati "obsoleti"
const CACHE_VALIDITY_DURATION = 24 * 60 * 60 * 1000;

/**
 * Confronta i dati client e i log per determinare se sono cambiati
 * rispetto all'ultima generazione del profilo
 */
function hasClientDataChanged(
  client: Client,
  logs: ClientLog[],
  cachedProfileDate: Date
): boolean {
  // Se il cliente è stato modificato dopo l'ultima generazione del profilo
  if (client.createdAt && new Date(client.createdAt) > cachedProfileDate) {
    return true;
  }
  
  // Controlla se ci sono nuovi log o se log esistenti sono stati modificati
  // dopo l'ultima generazione del profilo
  if (logs.some(log => {
    if (!log.createdAt) return false;
    const logDate = new Date(log.createdAt);
    return logDate > cachedProfileDate;
  })) {
    return true;
  }
  
  // Nessun cambiamento rilevante
  return false;
}

/**
 * Genera il profilo arricchito per un cliente
 * GET /api/ai/client-profile/:clientId
 */
export async function getClientProfile(req: Request, res: Response) {
  try {
    const clientId = parseInt(req.params.clientId);
    const forceRefresh = req.query.refresh === 'true';
    
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
    
    // Verifica se esiste già un profilo AI memorizzato
    const cachedProfile = await storage.getAiProfile(clientId);
    
    // Determina se è necessario generare un nuovo profilo
    let needsNewGeneration = forceRefresh || !cachedProfile;
    let isCacheValid = false;
    
    if (cachedProfile && cachedProfile.lastGeneratedAt) {
      const lastGeneratedAt = new Date(cachedProfile.lastGeneratedAt);
      const now = new Date();
      const cacheAge = now.getTime() - lastGeneratedAt.getTime();
      
      // La cache è considerata valida se è stata generata nelle ultime 24 ore
      // e se i dati del cliente non sono cambiati da allora
      isCacheValid = 
        cacheAge < CACHE_VALIDITY_DURATION && 
        !hasClientDataChanged(client, clientLogs, lastGeneratedAt);
      
      needsNewGeneration = !isCacheValid;
    }
    
    let profileData;
    
    if (needsNewGeneration) {
      // Recupera i dati MIFID del cliente
      const mifid = await storage.getMifidByClient(clientId);
      
      // Debug log per verificare i dati MIFID
      
      
      
      if (mifid) {
        
        
        
        
        
        
        
        
      }
      
      // Genera un nuovo profilo arricchito utilizzando l'AI
      profileData = await generateClientProfile(client, mifid || null, clientLogs);
      
      // Salva il profilo generato nella cache
      if (cachedProfile) {
        await storage.updateAiProfile(clientId, profileData);
      } else {
        await storage.createAiProfile({
          clientId,
          profileData,
          createdBy: req.user.id
        });
      }
      
      return res.json({
        success: true,
        data: profileData,
        cached: false
      });
    } else if (cachedProfile) {
      // Utilizza il profilo memorizzato nella cache
      profileData = cachedProfile.profileData;
      
      // Controlla se il refresh è stato esplicitamente richiesto ma i dati sono già aggiornati
      if (req.query.refresh === 'true') {
        return res.json({
          success: true,
          data: profileData,
          cached: true,
          lastGenerated: cachedProfile.lastGeneratedAt,
          upToDate: true, // Indica che i dati sono già aggiornati
          message: "Profilo AI è già aggiornato con tutte le informazioni raccolte"
        });
      } else {
        return res.json({
          success: true,
          data: profileData,
          cached: true,
          lastGenerated: cachedProfile.lastGeneratedAt
        });
      }
    } else {
      // Questo caso non dovrebbe verificarsi, ma per sicurezza
      return res.status(500).json({
        success: false,
        error: "Cache invalid but no profile found - inconsistent state"
      });
    }
  } catch (error: any) {
    
    
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

export async function generateEnrichedProfile(clientId: number): Promise<AiClientProfile> {
  try {
    // Get client data
    const client = await getClientById(clientId);
    if (!client) {
      throw new Error(`Client with ID ${clientId} not found`);
    }

    // Get MIFID data
    const mifid = await getMifidByClient(clientId);
    
    
    
    
    

    // Get client logs
    const clientLogs = await getClientLogsByClientId(clientId);
    
    // Generate profile
    const profileData = await generateClientProfile(client, mifid || null, clientLogs);

    // Save profile to storage
    await storage.createAiProfile({
      clientId,
      profileData,
      createdBy: req.user.id
    });

    return profileData;
  } catch (error: any) {
    
    
    // Gestione degli errori specifici
    if (error.message && (
      error.message.includes("OpenAI API key not configured") ||
      error.message.includes("Credito OpenAI esaurito")
    )) {
      throw new Error(error.message);
    }
    
    throw new Error("Failed to generate enriched profile: " + (error.message || "Unknown error"));
  }
}