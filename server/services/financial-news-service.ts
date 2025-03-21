/**
 * Servizio per il recupero di notizie finanziarie da varie fonti
 * Questo modulo gestisce:
 * 1. Recupero di notizie da feed RSS
 * 2. Scraping di Yahoo Finance
 * 3. Memorizzazione in cache delle notizie
 */

import Parser from 'rss-parser';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { log } from '../vite';
import crypto from 'crypto';

// Parser per i feed RSS
const rssParser = new Parser();

// Definizione dell'interfaccia per le notizie finanziarie
export interface FinancialNews {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: Date;
  categories: string[];
  content?: string;
}

// Cache per le notizie per evitare chiamate ripetute
type NewsCache = {
  news: FinancialNews[];
  lastUpdated: Date;
};

const newsCache: NewsCache = {
  news: [],
  lastUpdated: new Date(0) // 1970-01-01, garantisce che il primo controllo aggiorni la cache
};

// Feed RSS da controllare
const RSS_FEEDS = [
  {
    url: 'https://www.teleborsa.it/News/Rss',
    source: 'Teleborsa'
  },
  {
    url: 'https://www.borsaitaliana.it/borsa/notizie/radiocor/finanza.xml',
    source: 'Borsa Italiana'
  },
  {
    url: 'https://www.money.it/spip.php?page=backend',
    source: 'Money.it'
  },
  {
    url: 'https://www.ilsole24ore.com/rss/economia.xml',
    source: 'Il Sole 24 Ore'
  },
  {
    url: 'https://www.repubblica.it/rss/economia/rss2.0.xml',
    source: 'La Repubblica - Economia'
  }
];

/**
 * Recupera le ultime notizie da feed RSS
 */
async function getNewsFromRSS(): Promise<FinancialNews[]> {
  const allNews: FinancialNews[] = [];

  log(`Recupero notizie da ${RSS_FEEDS.length} feed RSS...`, 'financial-news');
  
  // Funzione per processare un singolo feed RSS
  const processFeed = async (feed: { url: string, source: string }): Promise<FinancialNews[]> => {
    try {
      const feedData = await rssParser.parseURL(feed.url);
      
      return feedData.items.map(item => {
        // Genera un ID unico basato sull'URL o sul titolo
        const idBase = item.link || item.title || crypto.randomBytes(16).toString('hex');
        const id = crypto.createHash('md5').update(idBase).digest('hex');
        
        // Parse della data (diversi feed possono usare formati diversi)
        const publishedDate = item.pubDate ? new Date(item.pubDate) : new Date();
        
        return {
          id,
          title: item.title || 'Titolo non disponibile',
          description: item.contentSnippet || item.description || 'Descrizione non disponibile',
          url: item.link || '',
          source: feed.source,
          publishedAt: publishedDate,
          categories: item.categories || [],
          content: item.content || item['content:encoded'] || item.description
        };
      });
    } catch (error) {
      log(`Errore nel recupero del feed ${feed.url}: ${error}`, 'financial-news');
      return [];
    }
  };
  
  // Processa tutti i feed in parallelo
  const newsPromises = RSS_FEEDS.map(processFeed);
  const results = await Promise.all(newsPromises);
  
  // Unisce tutti i risultati in un array unico
  results.forEach(news => allNews.push(...news));
  
  log(`Recuperate ${allNews.length} notizie dai feed RSS`, 'financial-news');
  return allNews;
}

/**
 * Recupera le ultime notizie da Yahoo Finance Italia
 */
async function getNewsFromYahooFinance(): Promise<FinancialNews[]> {
  try {
    log('Recupero notizie da Yahoo Finance Italia...', 'financial-news');
    
    // URL di Yahoo Finance Italia
    const yahooFinanceUrl = 'https://it.finance.yahoo.com/';
    
    // Recupera la pagina HTML
    const response = await axios.get(yahooFinanceUrl);
    const html = response.data;
    
    // Carica HTML in cheerio
    const $ = cheerio.load(html);
    
    // Array per le notizie
    const news: FinancialNews[] = [];
    
    // Seleziona gli elementi delle notizie (potrebbe cambiare se Yahoo aggiorna il layout)
    $('li.js-stream-content').each((index, element) => {
      try {
        const titleEl = $(element).find('h3');
        const linkEl = $(element).find('a');
        const descriptionEl = $(element).find('p');
        
        if (titleEl.length > 0 && linkEl.length > 0) {
          const title = titleEl.text().trim();
          const url = new URL(linkEl.attr('href') || '', 'https://it.finance.yahoo.com').toString();
          const description = descriptionEl.length > 0 ? descriptionEl.text().trim() : '';
          
          // Genera un ID unico
          const id = crypto.createHash('md5').update(url).digest('hex');
          
          news.push({
            id,
            title,
            description,
            url,
            source: 'Yahoo Finance Italia',
            publishedAt: new Date(),
            categories: ['finance', 'markets']
          });
        }
      } catch (error) {
        // Ignora elementi che non possono essere processati correttamente
        log(`Errore nel parsing di un elemento Yahoo Finance: ${error}`, 'financial-news');
      }
    });
    
    log(`Recuperate ${news.length} notizie da Yahoo Finance Italia`, 'financial-news');
    return news;
  } catch (error) {
    log(`Errore nel recupero delle notizie da Yahoo Finance: ${error}`, 'financial-news');
    return [];
  }
}

/**
 * Recupera tutte le notizie finanziarie da tutte le fonti disponibili
 */
export async function getAllFinancialNews(): Promise<FinancialNews[]> {
  // Controlla se la cache è ancora valida (5 minuti)
  const cacheValidityMinutes = 5;
  const now = new Date();
  const cacheAgeMs = now.getTime() - newsCache.lastUpdated.getTime();
  const cacheAgeMinutes = cacheAgeMs / (1000 * 60);
  
  if (cacheAgeMinutes < cacheValidityMinutes && newsCache.news.length > 0) {
    log(`Usando cache notizie (età: ${cacheAgeMinutes.toFixed(1)} minuti)`, 'financial-news');
    return newsCache.news;
  }
  
  log('Cache notizie scaduta o vuota, recupero nuove notizie...', 'financial-news');
  
  // Recupera le notizie da tutte le fonti
  const [rssNews, yahooNews] = await Promise.all([
    getNewsFromRSS(),
    getNewsFromYahooFinance()
  ]);
  
  // Unisce tutte le notizie e rimuove eventuali duplicati (basati sull'ID)
  const allNews = [...rssNews, ...yahooNews];
  const uniqueNewsMap = new Map<string, FinancialNews>();
  
  allNews.forEach(news => {
    uniqueNewsMap.set(news.id, news);
  });
  
  // Converte la mappa in array
  const uniqueNews = Array.from(uniqueNewsMap.values());
  
  // Ordina per data di pubblicazione (più recenti prima)
  const sortedNews = uniqueNews.sort((a, b) => {
    return b.publishedAt.getTime() - a.publishedAt.getTime();
  });
  
  // Aggiorna la cache
  newsCache.news = sortedNews;
  newsCache.lastUpdated = now;
  
  log(`Recuperate e memorizzate ${sortedNews.length} notizie uniche in totale`, 'financial-news');
  return sortedNews;
}

/**
 * Recupera i dettagli completi di una notizia specifica
 */
export async function getNewsDetails(newsId: string): Promise<FinancialNews | null> {
  // Prima cerca nella cache
  const cachedNews = newsCache.news.find(news => news.id === newsId);
  
  if (!cachedNews) {
    log(`Notizia con ID ${newsId} non trovata in cache`, 'financial-news');
    return null;
  }
  
  // Se abbiamo già il contenuto completo, restituiamo l'oggetto esistente
  if (cachedNews.content) {
    return cachedNews;
  }
  
  // Altrimenti, proviamo a recuperare il contenuto completo
  try {
    log(`Recupero dettagli per la notizia ${newsId} (${cachedNews.title})`, 'financial-news');
    
    // Recupera la pagina HTML
    const response = await axios.get(cachedNews.url);
    const html = response.data;
    
    // Carica HTML in cheerio
    const $ = cheerio.load(html);
    
    // Estraiamo il contenuto principale (strategia generica, potrebbe richiedere adattamenti)
    // Questa è una soluzione di base che cerca di identificare il contenuto principale
    let content = '';
    
    // Cerca nel contenuto principale (strategie multiple)
    const contentSelectors = [
      'article', '.article-content', '.article-body', 
      '.post-content', '.entry-content', '#content',
      '.content', 'main'
    ];
    
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        // Rimuove elementi non necessari come script, stili e commenti
        element.find('script, style, .comments, .sidebar, nav, header, footer').remove();
        
        // Estrae il testo
        content = element.text().trim();
        
        // Se abbiamo trovato un contenuto significativo, interrompiamo il ciclo
        if (content.length > 100) {
          break;
        }
      }
    }
    
    // Se non troviamo un contenuto significativo, usiamo almeno il primo paragrafo
    if (content.length < 100) {
      content = $('p').first().text().trim();
    }
    
    // Aggiorna la cache con il contenuto completo
    cachedNews.content = content || cachedNews.description;
    
    log(`Dettagli recuperati per la notizia ${newsId}`, 'financial-news');
    return cachedNews;
  } catch (error) {
    log(`Errore nel recupero dei dettagli della notizia ${newsId}: ${error}`, 'financial-news');
    
    // In caso di errore, restituisce la notizia senza contenuto completo
    return cachedNews;
  }
}