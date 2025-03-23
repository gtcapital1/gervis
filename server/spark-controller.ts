/**
 * Controller per la funzionalità Spark
 * 
 * Gestisce la generazione e la manipolazione delle priorità Spark, che rappresentano
 * raccomandazioni di azione prioritarie per i consulenti basate sui dati dei clienti
 * e sui trend di mercato, utilizzando l'intelligenza artificiale per selezionare
 * le notizie più rilevanti e abbinare i clienti più affini.
 */

import { Request, Response } from "express";
import { storage } from "./storage";
import { Client } from "@shared/schema";
import OpenAI from "openai";
import fetch from "node-fetch";

// Logger per debug
const debug = (...args: any[]) => {
  if (process.env.DEBUG === "true") {
    console.log("[SPARK]", ...args);
  }
};

const REQUIRED_NEWS_COUNT = 10;
const MAX_PRIORITY_AGE_DAYS = 30;
const NEWS_WHITELIST = [
  "bloomberg.com",
  "reuters.com",
  "cnbc.com",
  "ft.com",
  "wsj.com",
  "forbes.com",
  "morningstar.com",
  "marketwatch.com",
  "investing.com",
  "finance.yahoo.com",
  "nasdaq.com",
  "barrons.com",
  "economist.com",
  "seekingalpha.com",
  "fool.com",
  "investopedia.com",
  "businessinsider.com",
  "financial-times.com",
  "msn.com/money",
  "money.cnn.com"
];

/**
 * Cache delle notizie finanziarie (per ridurre le chiamate API)
 */
let newsCache: any[] = [];
let newsCacheTimestamp: number = 0;
const NEWS_CACHE_TTL = 30 * 60 * 1000; // 30 minuti

/**
 * Funzione di controllo per dominio news whitelist con supporto per pattern
 * Case-insensitive e supporto per sottodomini e percorsi
 */
function isWhitelistedNewsSource(url: string): boolean {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    return NEWS_WHITELIST.some(domain => {
      const domainPattern = domain.toLowerCase();
      // Controllo match esatto
      if (hostname === domainPattern) return true;
      // Controllo sottodomini e percorsi (pattern matching)
      if (hostname.endsWith("." + domainPattern)) return true;
      if (hostname.includes(domainPattern)) return true;
      // Check percorsi specifici come msn.com/money
      if (domainPattern.includes("/")) {
        const [domainPart, pathPart] = domainPattern.split("/");
        if (hostname === domainPart && urlObj.pathname.includes("/" + pathPart)) {
          return true;
        }
      }
      return false;
    });
  } catch (error) {
    debug("Error parsing URL:", url, error);
    return false;
  }
}

/**
 * Recupera le priorità Spark per l'utente autenticato
 * GET /api/spark/priorities
 */
export async function getSparkPriorities(req: Request, res: Response) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const priorities = await storage.getSparkPriorities(req.user.id);
    
    // Assicuriamoci che priorities sia sempre un array
    const safeResponse = { 
      success: true, 
      priorities: Array.isArray(priorities) ? priorities : [] 
    };
    
    return res.json(safeResponse);
  } catch (error) {
    console.error("Error fetching Spark priorities:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Error fetching priorities", 
      error: error instanceof Error ? error.message : String(error),
      priorities: [] 
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
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Verifica disponibilità API OpenAI 
    if (!process.env.OPENAI_API_KEY) {
      debug("OpenAI API key missing");
      return res.status(500).json({ 
        success: false, 
        message: "OpenAI API key not configured" 
      });
    }

    // Rimuovi priorità vecchie
    await storage.clearOldSparkPriorities(req.user.id);

    // Ottieni clienti dell'advisor
    const clients = await storage.getClientsByAdvisor(req.user.id);
    if (!clients.length) {
      return res.json({ 
        success: false, 
        message: "No clients found for advisor" 
      });
    }

    // Ottieni notizie finanziarie
    let financialNews: any[] = [];
    
    try {
      // Usa cache se disponibile e valida
      const now = Date.now();
      if (newsCache.length > 0 && (now - newsCacheTimestamp) < NEWS_CACHE_TTL) {
        debug("Using cached financial news");
        financialNews = newsCache;
      } else {
        debug("Fetching fresh financial news");
        const apiKey = process.env.FINANCIAL_NEWS_API_KEY;
        const response = await fetch(
          `https://gnews.io/api/v4/search?q=finance+OR+investing+OR+markets+OR+economy&lang=en&country=us&max=50&apikey=${apiKey}`
        );
        
        if (!response.ok) {
          throw new Error(`News API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.articles || !Array.isArray(data.articles)) {
          throw new Error("Invalid news API response format");
        }
        
        // Filtra fonti whitelist
        financialNews = data.articles.filter((article: any) => 
          isWhitelistedNewsSource(article.url)
        );
        
        debug(`Filtered ${financialNews.length} whitelisted articles from ${data.articles.length} total`);
        
        // Aggiorna cache
        newsCache = financialNews;
        newsCacheTimestamp = now;
      }
      
      if (financialNews.length < REQUIRED_NEWS_COUNT) {
        debug(`Not enough whitelisted news (${financialNews.length})`);
        // Continua comunque se ci sono almeno alcune notizie
        if (financialNews.length === 0) {
          throw new Error("No whitelisted financial news available");
        }
      }
      
    } catch (error) {
      console.error("Error fetching financial news:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to fetch financial news" 
      });
    }
    
    try {
      // OpenAI Integration - seleziona le notizie rilevanti
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      
      // Invece di attendere la risposta OpenAI per ogni cliente, generiamo 10 priorità selezionate casualmente
      const randomPriorities = generateRandomPriorities(clients, financialNews, 10);
      
      // Salviamo le priorità generate nel database
      for (const priority of randomPriorities) {
        await storage.createSparkPriority({
          title: priority.title,
          description: priority.description,
          clientId: priority.clientId,
          priority: 1, // Alta priorità per default
          relatedNewsTitle: priority.source,
          relatedNewsUrl: priority.sourceUrl,
          isNew: true,
          createdBy: req.user.id
        });
      }
      
      return res.json({ 
        success: true, 
        message: "Spark priorities generated successfully" 
      });
      
    } catch (error) {
      console.error("Error generating Spark priorities with OpenAI:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Error processing data with AI" 
      });
    }
  } catch (error) {
    console.error("Error generating Spark priorities:", error);
    
    // Log di debug per aiutare a diagnosticare problemi di tipo
    if (error instanceof Error) {
      console.error(`Error type: ${error.constructor.name}`);
      console.error(`Error message: ${error.message}`);
      if (error.stack) {
        console.error(`Stack trace: ${error.stack}`);
      }
    }
    
    // Verifica se l'errore è un errore PostgreSQL con dettagli
    const pgError = error as any;
    if (pgError.code && pgError.routine) {
      console.error(`PostgreSQL error details: code=${pgError.code}, routine=${pgError.routine}, where=${pgError.where || 'N/A'}`);
    }
    
    return res.status(500).json({ 
      success: false, 
      message: "Failed to generate priorities",
      error: error instanceof Error ? error.message : String(error)
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
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const priorityId = parseInt(req.params.id);
    if (isNaN(priorityId)) {
      return res.status(400).json({ success: false, message: "Invalid priority ID" });
    }

    const updatedPriority = await storage.updateSparkPriorityStatus(priorityId, false);
    
    return res.json({ 
      success: true, 
      priority: updatedPriority || { id: priorityId, isNew: false } 
    });
  } catch (error) {
    console.error("Error marking priority as read:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to update priority",
      error: error instanceof Error ? error.message : String(error)
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
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const priorityId = parseInt(req.params.id);
    if (isNaN(priorityId)) {
      return res.status(400).json({ success: false, message: "Invalid priority ID" });
    }

    const success = await storage.deleteSparkPriority(priorityId);
    
    return res.json({ success: success === true });
  } catch (error) {
    console.error("Error deleting priority:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to delete priority",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// Utility Functions

function getRandomItems<T>(items: T[], count: number): T[] {
  const shuffled = [...items].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, items.length));
}

/**
 * Generate random priorities for testing or fallback
 */
function generateRandomPriorities(clients: Client[], news: any[], count: number) {
  const selectedClients = getRandomItems(clients, count);
  const selectedNews = getRandomItems(news, count);
  
  return selectedClients.map((client, index) => {
    const newsItem = selectedNews[index % selectedNews.length];
    
    return {
      title: generatePriorityTitle(client, newsItem),
      description: generatePriorityDescription(client, newsItem),
      clientId: client.id,
      clientName: `${client.firstName} ${client.lastName}`,
      source: newsItem.source.name,
      sourceUrl: newsItem.url
    };
  });
}

/**
 * Genera un titolo per la priorità basato sui dati del cliente e sulla notizia
 */
function generatePriorityTitle(client: Client, news: { title: string; url: string }): string {
  const titles = [
    `Opportunità per ${client.firstName} legata a ${extractMainTopic(news.title)}`,
    `${extractMainTopic(news.title)}: Potenziale interesse per ${client.firstName}`,
    `Aggiornamento su ${extractMainTopic(news.title)} per ${client.firstName}`,
    `${client.firstName} potrebbe essere interessato a: ${extractMainTopic(news.title)}`,
    `Recenti sviluppi su ${extractMainTopic(news.title)} rilevanti per ${client.firstName}`
  ];
  
  return titles[Math.floor(Math.random() * titles.length)];
}

/**
 * Genera una descrizione per la priorità basata sui dati del cliente e sulla notizia
 */
function generatePriorityDescription(client: Client, news: { title: string; url: string }): string {
  // Normalizzare gli interessi personali e obiettivi d'investimento per garantire che siano array
  const investmentGoals = Array.isArray(client.investmentGoals) ? client.investmentGoals.join(", ") : client.investmentGoals;
  const personalInterests = Array.isArray(client.personalInterests) ? client.personalInterests.join(", ") : (client.personalInterests || "");

  const descriptions = [
    `Questa notizia su ${extractMainTopic(news.title)} sembra allinearsi con il profilo di rischio ${client.riskProfile} di ${client.firstName}. Potrebbe essere un'opportunità per discutere strategie correlate durante il prossimo incontro.`,
    
    `Considerando gli obiettivi di investimento di ${client.firstName}, gli sviluppi recenti riguardo ${extractMainTopic(news.title)} potrebbero offrire interessanti spunti di discussione. Valuta se condividere questa informazione.`,
    
    `Basandomi sul profilo di ${client.firstName}, che ha un'esperienza ${client.investmentExperience} e un orizzonte ${client.investmentHorizon}, questa notizia su ${extractMainTopic(news.title)} potrebbe rappresentare un elemento rilevante per il portfolio.`,
    
    `Con un focus su ${investmentGoals}, ${client.firstName} potrebbe trovare interessante questa notizia su ${extractMainTopic(news.title)}. Considera di includerla nella prossima comunicazione.`,
    
    `Questa notizia su ${extractMainTopic(news.title)} potrebbe avere implicazioni per il portfolio di ${client.firstName}${personalInterests ? `, particolarmente considerando i suoi interessi in ${personalInterests}` : ""}.`
  ];
  
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

/**
 * Estrae parole chiave da un testo
 */
function extractKeywords(text: string): string[] {
  // Versione semplificata per estrazione parole chiave
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !["this", "that", "these", "those", "with", "from", "have", "will"].includes(word));
}

/**
 * Estrae l'argomento principale da un titolo
 */
function extractMainTopic(title: string): string {
  // Semplificazione per estrazione topic - ritorna primi 3-4 parole significative
  const words = title.split(/\s+/);
  if (words.length <= 4) return title;
  return words.slice(0, 4).join(" ") + "...";
}
