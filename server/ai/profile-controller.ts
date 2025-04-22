/**
 * Controller per le funzionalità AI relative al profilo cliente
 * Gestisce l'endpoint per la generazione del profilo arricchito
 */

import { Request, Response } from 'express';
import { generateClientProfile, AiClientProfile } from './openai-service';
import { storage } from '../storage';
import { Client, ClientLog, Mifid } from '@shared/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { getCompleteClientData } from '../agent/clientDataFetcher';

/**
 * Genera il profilo arricchito per un cliente
 * GET /api/ai/client-profile/:clientId
 */
export async function getClientProfile(req: Request, res: Response) {
  try {
    const clientId = parseInt(req.params.clientId);
    const forceRefresh = req.query.refresh === 'true';
    const checkOnly = req.query.checkOnly === 'true';
    
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

    // Verifica se esiste già un profilo AI memorizzato
    const existingProfile = await storage.getAiProfile(clientId);
    
    // Se è richiesto solo un controllo dell'esistenza del profilo, restituisci i dati esistenti
    if (checkOnly) {
      return res.json({
        success: true,
        data: existingProfile?.profileData || null,
        lastGenerated: existingProfile?.lastGeneratedAt || null
      });
    }
    
    // Se è richiesto un refresh forzato o non esiste un profilo, genera un nuovo profilo
    if (forceRefresh || !existingProfile) {
      // Recupera i dati completi del cliente utilizzando getCompleteClientData
      const clientData = await getCompleteClientData(client.firstName, client.lastName);
      
      if (!clientData.success) {
        return res.status(500).json({
          success: false,
          error: clientData.error || "Failed to retrieve client data"
        });
      }
      
      // Passa direttamente i dati completi a generateClientProfile
      const profileData = await generateClientProfile(client, clientData);
      
      // Salva o aggiorna il profilo generato
      if (existingProfile) {
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
    } else {
      // Se c'è un profilo esistente e non è richiesto un refresh, restituisci il profilo esistente
      return res.json({
        success: true,
        data: existingProfile.profileData,
        cached: true,
        lastGenerated: existingProfile.lastGeneratedAt
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

/**
 * Genera il profilo arricchito per un cliente (funzione riutilizzabile)
 */
export async function generateEnrichedProfile(clientId: number, advisorId: number): Promise<AiClientProfile> {
  try {
    // Get client data
    const client = await storage.getClient(clientId);
    if (!client) {
      throw new Error(`Client with ID ${clientId} not found`);
    }

    // Ottieni i dati completi del cliente usando getCompleteClientData
    const clientData = await getCompleteClientData(client.firstName, client.lastName);
    
    if (!clientData.success) {
      throw new Error(clientData.error || "Failed to retrieve client data");
    }
    
    // Passa direttamente l'oggetto clientData a generateClientProfile
    const profileData = await generateClientProfile(client, clientData);

    // Save profile to storage
    await storage.createAiProfile({
      clientId,
      profileData,
      createdBy: advisorId
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

/**
 * Aggiorna il profilo AI di un cliente
 * POST /api/ai/client-profile/:clientId
 */
export async function updateClientProfile(req: Request, res: Response) {
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
        message: "You don't have permission to update this client's profile"
      });
    }
    
    // Genera un nuovo profilo arricchito
    const profileData = await generateEnrichedProfile(clientId, req.user.id);
    
    return res.json({
      success: true,
      data: profileData
    });
    
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
      error: "Failed to update client profile: " + (error.message || "Unknown error")
    });
  }
}

/**
 * Recupera tutti i profili AI dei clienti per l'advisor corrente
 * GET /api/ai-profiles
 */
export async function getAllClientProfiles(req: Request, res: Response) {
  try {
    // Verifica se l'utente è autenticato
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ 
        success: false, 
        message: "Not authenticated"
      });
    }
    
    const advisorId = req.user.id;
    
    // Recupera tutti i clienti dell'advisor
    const clients = await storage.getClientsByAdvisor(advisorId);
    
    if (!clients || clients.length === 0) {
      return res.json({
        success: true,
        profiles: []
      });
    }
    
    // Raccogli tutti i profili AI per questi clienti
    const profiles = [];
    
    for (const client of clients) {
      // Salta i clienti che non hanno completato l'onboarding
      if (!client.isOnboarded) continue;
      
      const aiProfile = await storage.getAiProfile(client.id);
      
      if (aiProfile && aiProfile.profileData) {
        // Aggiungi informazioni sul cliente al profilo AI
        const profileWithClientInfo = {
          clientId: client.id,
          clientName: client.name,
          lastUpdated: aiProfile.lastGeneratedAt || new Date(),
          ...aiProfile.profileData
        };
        
        profiles.push(profileWithClientInfo);
      }
    }
    
    return res.json({
      success: true,
      profiles
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve client profiles: " + (error.message || "Unknown error")
    });
  }
}