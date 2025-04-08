/**
 * Controller per le funzionalità AI relative ai suggerimenti per il consulente
 * Gestisce l'endpoint per la generazione di suggerimenti suddivisi in opportunità, re-engagement e gestione operativa
 */

import { Request, Response } from 'express';
import { storage } from '../storage';
import { Client, ClientLog } from '@shared/schema';
import { generateAdvisorSuggestions, AiClientProfile, generateClientProfile } from './openai-service';

// Validità cache: 12 ore
const CACHE_VALIDITY_HOURS = 12;

/**
 * Verifica se i dati sono cambiati dall'ultima generazione
 * @param advisorId ID del consulente
 * @param lastGeneratedAt Data dell'ultima generazione
 * @returns true se i dati sono cambiati
 */
async function hasDataChanged(advisorId: number, lastGeneratedAt: Date): Promise<boolean> {
  try {
    // Ottieni tutti i clienti dell'advisor con i loro dati
    const clients = await storage.getClientsByAdvisor(advisorId);
    
    // Controlla se ci sono nuovi log o modifiche ai client dopo l'ultima generazione
    for (const client of clients) {
      // Verifica se il client è stato creato o modificato dopo l'ultima generazione
      if (client.createdAt && new Date(client.createdAt) > lastGeneratedAt) {
        return true;
      }
      
      // Ottieni i log del cliente
      const logs = await storage.getClientLogs(client.id);
      
      // Controlla se ci sono nuovi log dopo l'ultima generazione
      for (const log of logs) {
        if (log.createdAt && new Date(log.createdAt) > lastGeneratedAt) {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error("Errore nella verifica dei cambiamenti dei dati:", error);
    // In caso di errore, assumiamo che ci siano stati cambiamenti
    return true;
  }
}

/**
 * Controller per ottenere i suggerimenti per l'advisor
 * @param req Request
 * @param res Response
 */
export async function getAdvisorSuggestions(req: Request, res: Response) {
  try {
    // Verifica che l'utente sia autenticato
    if (!req.user) {
      return res.status(401).json({ error: 'Utente non autenticato' });
    }
    
    const advisorId = req.user.id;
    
    // Controlla se è richiesto un refresh forzato
    const forceRefresh = req.query.refresh === 'true';
    
    // Cerca suggerimenti esistenti nel database
    const existingSuggestions = await storage.getAdvisorSuggestions(advisorId);
    
    // Se esistono suggerimenti in cache, verifica se sono ancora validi
    if (existingSuggestions) {
      const lastGeneratedAt = new Date(existingSuggestions.lastGeneratedAt);
      const now = new Date();
      const hoursSinceLastGeneration = (now.getTime() - lastGeneratedAt.getTime()) / (1000 * 60 * 60);
      
      // Verifica se i suggerimenti sono ancora validi (meno di 12 ore fa)
      // e se non è richiesto un refresh forzato
      if (hoursSinceLastGeneration < CACHE_VALIDITY_HOURS && !forceRefresh) {
        return res.json({
          suggestions: existingSuggestions.suggestionsData,
          lastGeneratedAt: existingSuggestions.lastGeneratedAt
        });
      }
      
      // Se è richiesto un refresh, ma non ci sono stati cambiamenti nei dati
      // e i suggerimenti sono ancora relativamente freschi (meno di 12 ore)
      if (forceRefresh && hoursSinceLastGeneration < CACHE_VALIDITY_HOURS) {
        const dataChanged = await hasDataChanged(advisorId, lastGeneratedAt);
        
        if (!dataChanged) {
          return res.json({
            suggestions: existingSuggestions.suggestionsData,
            lastGeneratedAt: existingSuggestions.lastGeneratedAt,
            message: "I suggerimenti sono già aggiornati con i dati più recenti."
          });
        }
      }
    }
    
    // Ottieni tutti i clienti dell'advisor con i loro dati
    const clients = await storage.getClientsByAdvisor(advisorId);
    
    // Se non ci sono clienti, restituisci un array vuoto
    if (!clients || clients.length === 0) {
      return res.json({
        suggestions: {
          opportunities: []
        },
        lastGeneratedAt: new Date()
      });
    }
    
    // Ottieni i profili AI per tutti i clienti
    const aiProfiles = await Promise.all(
      clients.map(client => storage.getAiProfile(client.id))
    );
    
    // Filtra i profili nulli e prendi solo i dati del profilo
    const validAiProfiles = aiProfiles
      .filter((profile, index): profile is NonNullable<typeof profile> => {
        if (!profile) {
          console.log(`Skipping client ${clients[index].id} - no AI profile found`);
          return false;
        }
        return true;
      })
      .map((profile, index) => ({
        ...profile.profileData as AiClientProfile,
        clientId: clients[index].id,
        clientName: clients[index].name || `${clients[index].firstName} ${clients[index].lastName}`
      }));
    
    // Se non ci sono profili validi, restituisci un array vuoto
    if (validAiProfiles.length === 0) {
      return res.json({
        suggestions: {
          opportunities: []
        },
        lastGeneratedAt: new Date(),
        message: "Non ci sono profili AI validi per generare suggerimenti."
      });
    }
    
    // Genera i suggerimenti
    const suggestions = await generateAdvisorSuggestions(validAiProfiles);
    
    // Valida i suggerimenti per assicurarsi che contengano solo clienti reali
    const clientIds = clients.map(client => client.id);
    
    // Filtra opportunità per rimuovere clienti non esistenti
    const validatedSuggestions = {
      opportunities: suggestions.opportunities.filter(suggestion => 
        clientIds.includes(suggestion.clientId))
    };
    
    // Salva i suggerimenti validati nel database
    if (existingSuggestions) {
      await storage.updateAdvisorSuggestions(advisorId, validatedSuggestions);
    } else {
      await storage.createAdvisorSuggestions({
        advisorId,
        suggestionsData: validatedSuggestions
      });
    }
    
    // Restituisci i suggerimenti validati
    return res.json({
      suggestions: validatedSuggestions,
      lastGeneratedAt: new Date()
    });
    
  } catch (error) {
    console.error("Errore nella generazione dei suggerimenti:", error);
    return res.status(500).json({ 
      error: 'Errore durante la generazione dei suggerimenti',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
} 