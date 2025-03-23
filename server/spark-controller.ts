/**
 * Controller per la funzionalità Spark
 * 
 * Gestisce la generazione e la manipolazione delle priorità Spark, che rappresentano
 * raccomandazioni di azione prioritarie per i consulenti basate sui dati dei clienti
 * e sui trend di mercato.
 */

import { Request, Response } from "express";
import { storage } from "./storage";
import axios from "axios";
import { SparkPriority, Client } from "@shared/schema";

/**
 * Recupera le priorità Spark per l'utente autenticato
 * GET /api/spark/priorities
 */
export async function getSparkPriorities(req: Request, res: Response) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false, 
        message: "Utente non autenticato" 
      });
    }

    // Recupera tutte le priorità per il consulente
    const priorities = await storage.getSparkPriorities(req.user.id);
    
    // Per ogni priorità, aggiungi il nome del cliente
    const enhancedPriorities = await Promise.all(
      priorities.map(async (priority) => {
        if (!priority.clientId) {
          return {
            ...priority,
            clientName: "Cliente generale"
          };
        }
        
        const client = await storage.getClient(priority.clientId);
        return {
          ...priority,
          clientName: client ? `${client.firstName} ${client.lastName}` : "Cliente sconosciuto"
        };
      })
    );
    
    // Ordina le priorità per numero di priorità (prima le più alte)
    const sortedPriorities = enhancedPriorities.sort((a, b) => a.priority - b.priority);
    
    return res.json(sortedPriorities);
  } catch (error) {
    console.error("Errore nel recupero delle priorità Spark:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Errore nel recupero delle priorità" 
    });
  }
}

/**
 * Genera nuove priorità Spark basate su notizie recenti e dati dei clienti
 * POST /api/spark/generate
 */
export async function generateSparkPriorities(req: Request, res: Response) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false, 
        message: "Utente non autenticato" 
      });
    }
    
    const advisorId = req.user.id;
    
    // Passaggio 1: Recupera i clienti dell'advisor
    const clients = await storage.getClientsByAdvisor(advisorId);
    
    if (clients.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Nessun cliente trovato per generare priorità"
      });
    }
    
    // Passaggio 2: Recupera le notizie finanziarie recenti
    // Utilizziamo l'API esistente per le notizie finanziarie
    const newsResponse = await axios.get(
      `${process.env.BASE_URL || ""}/api/market/news?category=global&limit=30`
    );
    
    const news = newsResponse.data;
    
    if (!news || news.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Nessuna notizia trovata per generare priorità"
      });
    }
    
    // Passaggio 3: Cancella le vecchie priorità
    await storage.clearOldSparkPriorities(advisorId);
    
    // Passaggio 4: Genera nuove priorità
    // Per questo esempio, generiamo fino a 5 priorità casuali utilizzando i clienti e le notizie
    const priorities: Array<{
      clientId: number;
      title: string;
      description: string;
      priority: number;
      relatedNewsTitle: string;
      relatedNewsUrl: string;
    }> = [];
    
    // Seleziona fino a 5 clienti casuali
    const selectedClients = getRandomItems(clients, Math.min(5, clients.length));
    
    // Crea una priorità per ciascun cliente selezionato
    for (let i = 0; i < selectedClients.length; i++) {
      const client = selectedClients[i];
      const relatedNews = getRandomItems(news, 1)[0] as { title: string; url: string };
      
      // Genera una priorità sensata basata sui dati del cliente e sulla notizia
      priorities.push({
        clientId: client.id,
        title: generatePriorityTitle(client, relatedNews),
        description: generatePriorityDescription(client, relatedNews),
        priority: i + 1, // Priorità da 1 a 5
        relatedNewsTitle: relatedNews.title,
        relatedNewsUrl: relatedNews.url
      });
    }
    
    // Passaggio 5: Salva le nuove priorità nel database
    const createdPriorities = await Promise.all(
      priorities.map(priority => 
        storage.createSparkPriority({
          ...priority,
          isNew: true,
          createdBy: advisorId
        })
      )
    );
    
    // Passaggio 6: Recupera le priorità aggiornate con i nomi dei clienti
    const enhancedPriorities = await Promise.all(
      createdPriorities.map(async (priority) => {
        if (!priority.clientId) {
          return {
            ...priority,
            clientName: "Cliente generale"
          };
        }
        
        const client = await storage.getClient(priority.clientId);
        return {
          ...priority,
          clientName: client ? `${client.firstName} ${client.lastName}` : "Cliente sconosciuto"
        };
      })
    );
    
    // Ordina le priorità per numero di priorità (prima le più alte)
    const sortedPriorities = enhancedPriorities.sort((a, b) => a.priority - b.priority);
    
    return res.json({
      success: true,
      message: "Priorità Spark generate con successo",
      priorities: sortedPriorities
    });
  } catch (error) {
    console.error("Errore nella generazione delle priorità Spark:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Errore nella generazione delle priorità" 
    });
  }
}

/**
 * Marca una priorità come "non nuova"
 * POST /api/spark/priorities/:id/read
 */
export async function markPriorityAsRead(req: Request, res: Response) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false, 
        message: "Utente non autenticato" 
      });
    }
    
    const priorityId = parseInt(req.params.id);
    
    if (isNaN(priorityId)) {
      return res.status(400).json({
        success: false,
        message: "ID priorità non valido"
      });
    }
    
    // Aggiorna lo stato della priorità
    const updatedPriority = await storage.updateSparkPriorityStatus(priorityId, false);
    
    return res.json({
      success: true,
      priority: updatedPriority
    });
  } catch (error) {
    console.error("Errore nell'aggiornamento della priorità Spark:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Errore nell'aggiornamento della priorità" 
    });
  }
}

/**
 * Elimina una priorità
 * DELETE /api/spark/priorities/:id
 */
export async function deletePriority(req: Request, res: Response) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false, 
        message: "Utente non autenticato" 
      });
    }
    
    const priorityId = parseInt(req.params.id);
    
    if (isNaN(priorityId)) {
      return res.status(400).json({
        success: false,
        message: "ID priorità non valido"
      });
    }
    
    // Elimina la priorità
    const success = await storage.deleteSparkPriority(priorityId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: "Priorità non trovata"
      });
    }
    
    return res.json({
      success: true,
      message: "Priorità eliminata con successo"
    });
  } catch (error) {
    console.error("Errore nell'eliminazione della priorità Spark:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Errore nell'eliminazione della priorità" 
    });
  }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Seleziona un numero casuale di elementi da un array
 */
function getRandomItems<T>(items: T[], count: number): T[] {
  const shuffled = [...items].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Genera un titolo per la priorità basato sui dati del cliente e sulla notizia
 */
function generatePriorityTitle(client: Client, news: { title: string; url: string }): string {
  const newsKeywords = extractKeywords(news.title.toLowerCase());
  
  // Se la notizia contiene parole chiave relative a investimenti specifici
  if (newsKeywords.some(keyword => 
    ['tech', 'tecnologia', 'innovazione', 'digitale', 'intelligenza artificiale', 'ai'].includes(keyword)
  )) {
    return `Opportunità tech per ${client.firstName}`;
  }
  
  if (newsKeywords.some(keyword => 
    ['mercato', 'azioni', 'borsa', 'rally', 'crollo', 'bear', 'bull'].includes(keyword)
  )) {
    return `Revisione portafoglio di ${client.firstName}`;
  }
  
  if (newsKeywords.some(keyword => 
    ['tasso', 'tassi', 'interesse', 'fed', 'bce', 'inflazione'].includes(keyword)
  )) {
    return `Aggiornamento strategia di ${client.firstName}`;
  }
  
  if (newsKeywords.some(keyword => 
    ['crypto', 'bitcoin', 'ethereum', 'blockchain'].includes(keyword)
  )) {
    return `Valutazione crypto per ${client.firstName}`;
  }
  
  if (newsKeywords.some(keyword => 
    ['immobiliare', 'casa', 'mutuo', 'real estate'].includes(keyword)
  )) {
    return `Consulenza immobiliare per ${client.firstName}`;
  }
  
  // Titolo generico se non troviamo corrispondenze
  return `Opportunità di mercato per ${client.firstName}`;
}

/**
 * Genera una descrizione per la priorità basata sui dati del cliente e sulla notizia
 */
function generatePriorityDescription(client: Client, news: any): string {
  const newsKeywords = extractKeywords(news.title.toLowerCase());
  
  // Genera una descrizione basata sulla notizia e sugli interessi del cliente
  let description = `Le ultime notizie finanziarie suggeriscono `;
  
  if (newsKeywords.some(keyword => 
    ['tech', 'tecnologia', 'innovazione', 'digitale', 'intelligenza artificiale', 'ai'].includes(keyword)
  )) {
    description += `un'opportunità nel settore tecnologico che potrebbe essere interessante per il portafoglio di ${client.firstName}. `;
    description += `Data la natura degli investimenti attuali, questa notizia potrebbe avere un impatto significativo. `;
  } else if (newsKeywords.some(keyword => 
    ['mercato', 'azioni', 'borsa', 'rally', 'crollo', 'bear', 'bull'].includes(keyword)
  )) {
    description += `cambiamenti rilevanti nel mercato che potrebbero influenzare il portafoglio di ${client.firstName}. `;
    description += `Sarebbe opportuno rivedere gli investimenti attuali alla luce di questi sviluppi. `;
  } else if (newsKeywords.some(keyword => 
    ['tasso', 'tassi', 'interesse', 'fed', 'bce', 'inflazione'].includes(keyword)
  )) {
    description += `cambiamenti nei tassi d'interesse che potrebbero influenzare la strategia d'investimento di ${client.firstName}. `;
    description += `Una revisione dell'allocazione di asset potrebbe essere necessaria per ottimizzare i rendimenti. `;
  } else if (newsKeywords.some(keyword => 
    ['crypto', 'bitcoin', 'ethereum', 'blockchain'].includes(keyword)
  )) {
    description += `sviluppi nel mercato delle criptovalute che potrebbero essere rilevanti per ${client.firstName}. `;
    description += `Valuta se discutere la possibilità di una piccola allocazione in questa classe di attività. `;
  } else if (newsKeywords.some(keyword => 
    ['immobiliare', 'casa', 'mutuo', 'real estate'].includes(keyword)
  )) {
    description += `sviluppi nel mercato immobiliare che potrebbero interessare ${client.firstName}. `;
    description += `Considera di discutere le implicazioni di questi cambiamenti sul suo portafoglio. `;
  } else {
    description += `opportunità di mercato che potrebbero essere rilevanti per ${client.firstName}. `;
    description += `Considera di programmare un incontro per discutere questi sviluppi. `;
  }
  
  description += `Leggi la notizia correlata per maggiori dettagli.`;
  
  return description;
}

/**
 * Estrae parole chiave da un testo
 */
function extractKeywords(text: string): string[] {
  // Questa è una versione semplificata per l'esempio
  // In una versione reale, si potrebbe utilizzare un'analisi NLP più sofisticata
  const words = text.toLowerCase().split(/\s+/);
  const keywords = words.filter(word => word.length > 3);
  return keywords;
}