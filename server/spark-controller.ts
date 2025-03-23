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
import axios from "axios";
import { SparkPriority, Client } from "@shared/schema";
import OpenAI from "openai";

// Inizializzazione di OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    // Utilizziamo l'API esistente per le notizie finanziarie e richiediamo più notizie
    const newsResponse = await axios.get(
      `${process.env.BASE_URL || ""}/api/market/news?category=global&limit=50`
    );
    
    const allNews = newsResponse.data;
    
    if (!allNews || allNews.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Nessuna notizia trovata per generare priorità"
      });
    }
    
    // Passaggio 3: Cancella le vecchie priorità
    await storage.clearOldSparkPriorities(advisorId);
    
    // Passaggio 4: Usa OpenAI per selezionare le 10 notizie più rilevanti e generare idee di investimento
    let selectedNews, investmentIdeas;
    
    try {
      const result = await generateInvestmentIdeasFromNews(allNews);
      selectedNews = result.selectedNews;
      investmentIdeas = result.investmentIdeas;
      
      if (investmentIdeas.length === 0) {
        throw new Error("Nessuna idea di investimento generata");
      }
    } catch (error) {
      console.error("Errore nella generazione delle idee con OpenAI:", error);
      return res.status(500).json({
        success: false,
        message: "Errore nell'analisi delle notizie e nella generazione delle idee di investimento"
      });
    }
    
    // Passaggio 5: Per ogni idea di investimento, trova i clienti più affini
    const priorityPromises = investmentIdeas.map(async (idea, index) => {
      // Trova i clienti più affini a questa idea
      const matchedClients = await findMatchingClientsForIdea(idea, clients);
      
      // Se non ci sono clienti affini, salta questa idea
      if (matchedClients.length === 0) return [];
      
      // Crea una priorità per ogni cliente abbinato a questa idea
      return matchedClients.map((match, clientIndex) => ({
        clientId: match.client.id,
        title: `${idea.title} per ${match.client.firstName}`,
        description: `${idea.description}\n\nAffinità: ${match.reasons}`,
        priority: index + 1, // Priorità basata sull'ordine delle idee
        relatedNewsTitle: selectedNews[idea.newsIndex].title,
        relatedNewsUrl: selectedNews[idea.newsIndex].url,
        isNew: true,
        createdBy: advisorId
      }));
    });
    
    // Attendi che tutte le promesse siano risolte e appiattisci l'array
    const allPriorities = (await Promise.all(priorityPromises)).flat();
    
    // Passaggio 6: Salva le nuove priorità nel database (limitando a max 10)
    const prioritiesToSave = allPriorities.slice(0, 10);
    
    const createdPriorities = await Promise.all(
      prioritiesToSave.map(priority => 
        storage.createSparkPriority(priority)
      )
    );
    
    // Passaggio 7: Recupera le priorità aggiornate con i nomi dei clienti
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
function generatePriorityDescription(client: Client, news: { title: string; url: string }): string {
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
  // Versione semplificata per l'estrazione di keyword
  const words = text.toLowerCase().split(/\s+/);
  const keywords = words.filter(word => word.length > 3);
  return keywords;
}

/**
 * Estrae l'argomento principale da un titolo
 */
function extractMainTopic(title: string): string {
  // Versione semplificata per l'estrazione del tema principale
  const words = title.split(/\s+/);
  if (words.length <= 3) return title;
  return words.slice(0, 3).join(" ") + "...";
}

/**
 * Utilizza OpenAI per selezionare le 10 notizie più rilevanti e generare idee di investimento
 */
async function generateInvestmentIdeasFromNews(news: any[]) {
  try {
    // Prepara i dati delle notizie per l'invio a OpenAI (solo titolo e descrizione)
    const newsData = news.map((item, index) => ({
      index,
      title: item.title,
      description: item.description || ''
    }));
    
    // Crea il prompt per OpenAI
    const prompt = `
Sei un analista finanziario esperto. Ti fornirò un elenco di notizie finanziarie recenti.

Il tuo compito è:
1. Selezionare le 10 notizie più rilevanti dal punto di vista degli investimenti
2. Per ogni notizia selezionata, generare un'idea di investimento con:
   - Un titolo breve e accattivante (max 6-8 parole)
   - Una descrizione dettagliata dell'opportunità (2-3 frasi)
   - L'indice della notizia originale da cui deriva l'idea

Ecco le notizie:
${JSON.stringify(newsData, null, 2)}

Rispondi con un JSON strutturato esattamente in questo formato:
{
  "selectedNews": [
    {indice della notizia originale},
    ...
  ],
  "investmentIdeas": [
    {
      "title": "Titolo dell'idea di investimento",
      "description": "Descrizione dettagliata dell'opportunità",
      "newsIndex": indice della notizia originale
    },
    ...
  ]
}
`;

    // Chiamata a OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { "role": "system", "content": "Sei un analista finanziario esperto che identifica opportunità di investimento basate su notizie recenti." },
        { "role": "user", "content": prompt }
      ],
      temperature: 0.3,
      max_tokens: 1500
    });
    
    // Estrai e analizza la risposta
    const content = response.choices[0]?.message?.content || '';
    console.log("Risposta OpenAI:", content);
    
    // Estrai il JSON dalla risposta
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                      content.match(/{[\s\S]*?}/);
                      
    let parsedResponse: { selectedNews: number[], investmentIdeas: any[] };
    
    if (jsonMatch) {
      // Estrai il JSON se è stato trovato tra i backtick
      const jsonContent = jsonMatch[1] || jsonMatch[0];
      parsedResponse = JSON.parse(jsonContent);
    } else {
      // Tenta di analizzare direttamente il contenuto
      parsedResponse = JSON.parse(content);
    }
    
    // Mappa gli indici delle notizie selezionate alle notizie complete
    const selectedNews = parsedResponse.selectedNews.map(index => news[index]);
    
    return {
      selectedNews,
      investmentIdeas: parsedResponse.investmentIdeas
    };
  } catch (error) {
    console.error("Errore nella generazione delle idee di investimento con OpenAI:", error);
    // In caso di errore, restituisci un risultato di fallback basato sulle prime 10 notizie
    const selectedNews = news.slice(0, 10);
    const investmentIdeas = selectedNews.map((newsItem, index) => ({
      title: `Opportunità basata su ${extractMainTopic(newsItem.title)}`,
      description: `Questa opportunità di investimento è basata sulle recenti notizie riguardanti ${extractMainTopic(newsItem.title)}. Considera di analizzare questo trend per potenziali allocazioni.`,
      newsIndex: index
    }));
    
    return { selectedNews, investmentIdeas };
  }
}

/**
 * Utilizza OpenAI per trovare i clienti più affini a una specifica idea di investimento
 */
async function findMatchingClientsForIdea(idea: any, clients: Client[]) {
  try {
    // Per ogni cliente, recupera il profilo AI per l'analisi
    const clientsWithProfiles = await Promise.all(
      clients.map(async (client) => {
        const aiProfile = await storage.getAiProfile(client.id);
        return {
          client,
          aiProfile: aiProfile?.profileData || null
        };
      })
    );
    
    // Filtra i clienti che hanno un profilo AI
    const clientsWithValidProfiles = clientsWithProfiles.filter(item => item.aiProfile);
    
    // Se non ci sono profili validi, usa una logica semplificata basata su interessi personali
    if (clientsWithValidProfiles.length === 0) {
      return findMatchingClientsByInterests(idea, clients);
    }
    
    // Prepara i dati per OpenAI
    const clientData = clientsWithValidProfiles.map(item => ({
      id: item.client.id,
      firstName: item.client.firstName,
      lastName: item.client.lastName,
      riskProfile: item.client.riskProfile,
      experienceLevel: item.client.experienceLevel,
      investmentGoals: item.client.investmentGoals,
      personalInterests: item.client.personalInterests,
      aiProfile: item.aiProfile
    }));
    
    // Crea il prompt per OpenAI
    const prompt = `
Sei un consulente finanziario che deve abbinare un'idea di investimento ai clienti più adatti.

Idea di investimento:
Titolo: ${idea.title}
Descrizione: ${idea.description}

Profili dei clienti:
${JSON.stringify(clientData, null, 2)}

Per ciascun cliente, valuta se l'idea di investimento è adatta in base a:
1. Profilo di rischio
2. Esperienza di investimento
3. Obiettivi di investimento
4. Interessi personali
5. Profilo AI (raccomandazioni, approfondimenti)

Seleziona fino a 3 clienti più compatibili con questa idea e spiega brevemente le ragioni dell'affinità.

Rispondi con un JSON strutturato esattamente in questo formato:
{
  "matchedClients": [
    {
      "clientId": id del cliente,
      "reasons": "Spiegazione breve delle ragioni di compatibilità"
    },
    ...
  ]
}
`;

    // Chiamata a OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { "role": "system", "content": "Sei un consulente finanziario esperto che abbina idee di investimento ai clienti più adatti." },
        { "role": "user", "content": prompt }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });
    
    // Estrai e analizza la risposta
    const content = response.choices[0]?.message?.content || '';
    
    // Estrai il JSON dalla risposta
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                      content.match(/{[\s\S]*?}/);
                      
    let parsedResponse: { matchedClients: { clientId: number, reasons: string }[] };
    
    if (jsonMatch) {
      // Estrai il JSON se è stato trovato tra i backtick
      const jsonContent = jsonMatch[1] || jsonMatch[0];
      parsedResponse = JSON.parse(jsonContent);
    } else {
      // Tenta di analizzare direttamente il contenuto
      parsedResponse = JSON.parse(content);
    }
    
    // Mappa gli ID dei clienti agli oggetti client completi
    return parsedResponse.matchedClients.map(match => ({
      client: clients.find(c => c.id === match.clientId) || clients[0],
      reasons: match.reasons
    }));
  } catch (error) {
    console.error("Errore nell'abbinamento dei clienti con OpenAI:", error);
    // In caso di errore, utilizza una logica semplificata
    return findMatchingClientsByInterests(idea, clients);
  }
}

/**
 * Fallback: Trova i clienti più affini basandosi su interessi personali e profilo di rischio
 */
function findMatchingClientsByInterests(idea: any, clients: Client[]) {
  // Estrai parole chiave dall'idea
  const keywords = extractKeywords(idea.title + " " + idea.description);
  
  // Mappa degli interessi personali a possibili keyword correlate
  const interestKeywordMap: {[key: string]: string[]} = {
    "technology": ["tech", "tecnologia", "digitale", "innovazione", "ai", "intelligenza artificiale"],
    "real_estate": ["immobiliare", "casa", "mutuo", "real estate", "costruzione"],
    "financial_markets": ["mercato", "azioni", "borsa", "investimenti", "finanza"],
    "entrepreneurship": ["startup", "business", "impresa", "azienda"],
    "science": ["ricerca", "scienza", "brevetto", "scoperta"],
    "environment": ["sostenibile", "verde", "clima", "ambiente", "rinnovabile", "esg"],
    "health": ["salute", "farmaceutica", "medicina", "healthcare", "benessere"]
  };
  
  // Cerca di identificare gli interessi rilevanti per l'idea
  const relevantInterests: string[] = [];
  for (const [interest, relatedKeywords] of Object.entries(interestKeywordMap)) {
    if (keywords.some(k => relatedKeywords.some(rk => k.includes(rk) || rk.includes(k)))) {
      relevantInterests.push(interest);
    }
  }
  
  // Punteggia i clienti in base a interessi personali e profilo di rischio
  const scoredClients = clients.map(client => {
    let score = 0;
    
    // Punteggio per interessi personali
    if (client.personalInterests) {
      const clientInterests = JSON.parse(client.personalInterests as string);
      for (const interest of relevantInterests) {
        if (clientInterests.includes(interest)) {
          score += 2;
        }
      }
    }
    
    // Punteggio per profilo di rischio (per idee aggressive, preferire profili di rischio più alti)
    const aggressiveKeywords = ["opportunità", "crescita", "emergente", "rivoluzionario", "innovativo"];
    const isAggressiveIdea = keywords.some(k => aggressiveKeywords.some(ak => k.includes(ak)));
    
    if (isAggressiveIdea) {
      if (client.riskProfile === "aggressive") score += 3;
      else if (client.riskProfile === "growth") score += 2;
      else if (client.riskProfile === "balanced") score += 1;
    } else {
      if (client.riskProfile === "conservative") score += 2;
      else if (client.riskProfile === "moderate") score += 2;
      else if (client.riskProfile === "balanced") score += 1;
    }
    
    return { client, score };
  });
  
  // Ordina per punteggio e prendi i migliori 3
  const topClients = scoredClients
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .filter(item => item.score > 0);  // Solo clienti con qualche affinità
  
  // Genera le ragioni per l'affinità
  return topClients.map(item => ({
    client: item.client,
    reasons: `Compatibile con profilo di rischio (${item.client.riskProfile}) e interessi personali`
  }));
}