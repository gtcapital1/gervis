/**
 * API per notizie finanziarie utilizzando News API
 */

import { Request, Response } from 'express.js';
import fetch from 'node-fetch.js';

// Sistema per eseguire richieste HTTP
async function fetchWithTimeout(url: string, options: any = {}, timeout = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Gervis/1.0)',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        ...(options.headers || {})
      }
    });
    
    clearTimeout(id);
    return {
      data: await response.json(),
      status: response.status,
      ok: response.ok
    };
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// Tipo per le notizie
interface NewsItem {
  title: string;
  description: string;
  url: string;
  urlToImage: string;
  publishedAt: string;
  source: {
    name: string;
    domain?: string;
    country?: string;
  };
  author?: string;
  content?: string;
}

// Funzione per recuperare le notizie finanziarie da News API
export async function getFinancialNews(req: Request, res: Response) {
  try {
    console.log("[INFO] Richiesta notizie finanziarie da News API");
    
    // Configura News API
    const apiKey = process.env.NEWS_API_KEY || process.env.FINANCIAL_NEWS_API_KEY;
    if (!apiKey) {
      console.error("[ERROR] API key per News API non configurata");
      return res.json([]);
    }
    
    // Combina notizie da diverse categorie rilevanti
    console.log("[INFO] Recupero notizie da più categorie per aumentare il numero");
    
    // Prima richiesta: business
    const businessUrl = `https://newsapi.org/v2/top-headlines?category=business&pageSize=50&apiKey=${apiKey}`;
    console.log(`[INFO] 1. Chiamata Business: ${businessUrl.replace(apiKey, 'API_KEY_HIDDEN')}`);
    const businessResponse = await fetchWithTimeout(businessUrl);
    
    // Seconda richiesta: technology (rilevante per mercati)
    const techUrl = `https://newsapi.org/v2/top-headlines?category=technology&pageSize=30&apiKey=${apiKey}`;
    console.log(`[INFO] 2. Chiamata Technology: ${techUrl.replace(apiKey, 'API_KEY_HIDDEN')}`);
    const techResponse = await fetchWithTimeout(techUrl);
    
    // Terza richiesta: general (può contenere notizie finanziarie importanti)
    const generalUrl = `https://newsapi.org/v2/top-headlines?category=general&pageSize=20&apiKey=${apiKey}`;
    console.log(`[INFO] 3. Chiamata General: ${generalUrl.replace(apiKey, 'API_KEY_HIDDEN')}`);
    const generalResponse = await fetchWithTimeout(generalUrl);
    
    // Combinazione dei risultati
    let allArticles: any[] = [];
    
    if (businessResponse.ok && businessResponse.data) {
      const businessData = businessResponse.data as any;
      if (businessData.status === 'ok' && businessData.articles && Array.isArray(businessData.articles)) {
        console.log(`[INFO] Trovati ${businessData.articles.length} articoli business`);
        allArticles = [...allArticles, ...businessData.articles];
      }
    }
    
    if (techResponse.ok && techResponse.data) {
      const techData = techResponse.data as any;
      if (techData.status === 'ok' && techData.articles && Array.isArray(techData.articles)) {
        console.log(`[INFO] Trovati ${techData.articles.length} articoli tech`);
        allArticles = [...allArticles, ...techData.articles];
      }
    }
    
    if (generalResponse.ok && generalResponse.data) {
      const generalData = generalResponse.data as any;
      if (generalData.status === 'ok' && generalData.articles && Array.isArray(generalData.articles)) {
        console.log(`[INFO] Trovati ${generalData.articles.length} articoli general`);
        allArticles = [...allArticles, ...generalData.articles];
      }
    }
    
    console.log(`[INFO] Totale articoli combinati: ${allArticles.length}`);
    
    // Rimuovi duplicati (stesso titolo)
    const uniqueArticles = Array.from(new Map(allArticles.map(item => 
      [item.title, item]
    )).values());
    
    console.log(`[INFO] Articoli dopo rimozione duplicati: ${uniqueArticles.length}`);
    
    // Procedi con la logica esistente considerando uniqueArticles come gli articoli da processare
    if (uniqueArticles.length > 0) {
      console.log(`[INFO] Processamento di ${uniqueArticles.length} articoli`);
      
      // Trasforma i risultati nel formato atteso
      const newsItems: NewsItem[] = uniqueArticles.map((item: any) => ({
        title: item.title || "",
        description: item.description || "",
        url: item.url || "",
        urlToImage: item.urlToImage || "",
        publishedAt: item.publishedAt || new Date().toISOString(),
        source: {
          name: item.source?.name || "News",
          domain: extractDomain(item.url) || "",
          country: ""
        },
        author: item.author || "",
        content: item.content || ""
      }));
      
      // Restituiamo tutte le notizie senza filtrarle per categoria
      console.log(`[INFO] Restituendo tutte le ${newsItems.length} notizie senza filtri`);
      return res.json(newsItems);
      } else {
      console.error("[ERROR] Nessun articolo trovato in tutte le categorie");
      
      // Se non abbiamo articoli, prova con l'endpoint everything come ultima risorsa
      try {
        console.log("[INFO] Tentativo con endpoint everything");
        const everythingUrl = `https://newsapi.org/v2/everything?q=finance OR business&language=en&sortBy=publishedAt&pageSize=50&apiKey=${apiKey}`;
        
        const altResponse = await fetchWithTimeout(everythingUrl);
        
        if (altResponse.ok && altResponse.data) {
          const altApiResponse = altResponse.data as any; 
          
          if (altApiResponse.status === 'ok' && altApiResponse.articles && altApiResponse.articles.length > 0) {
            console.log(`[INFO] Everything: trovati ${altApiResponse.articles.length} articoli`);
            
            const newsItems: NewsItem[] = altApiResponse.articles.map((item: any) => ({
              title: item.title || "",
              description: item.description || "",
              url: item.url || "",
              urlToImage: item.urlToImage || "",
              publishedAt: item.publishedAt || new Date().toISOString(),
              source: {
                name: item.source?.name || "News",
                domain: extractDomain(item.url) || "",
                country: ""
              },
              author: item.author || "",
              content: item.content || ""
            }));
            
            // Restituiamo tutte le notizie alternative senza filtri
            console.log(`[INFO] Restituendo tutte le ${newsItems.length} notizie alternative senza filtri`);
            return res.json(newsItems);
          }
        }
      } catch (error) {
        console.error("[ERROR] Anche il tentativo con everything è fallito:", error);
      }
      
      // Se tutto fallisce, restituisci array vuoto
      return res.json([]);
    }
  } catch (error) {
    console.error("[ERROR] Eccezione:", error);
    return res.json([]);
  }
}

// Funzione per estrarre il dominio da un URL
function extractDomain(url: string): string {
  if (!url) return "";
  try {
    const domain = new URL(url).hostname;
    return domain.startsWith('www.') ? domain.substring(4) : domain;
  } catch (e) {
    return "";
  }
}