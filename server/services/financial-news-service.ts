/**
 * Servizio per il recupero di notizie finanziarie da varie fonti
 * Questo modulo gestisce:
 * 1. Recupero di notizie da feed RSS
 * 2. Scraping di Yahoo Finance
 * 3. Memorizzazione in cache delle notizie
 */

import axios from 'axios';
import cheerio from 'cheerio';
import Parser from 'rss-parser';
import { log } from '../vite';

// Interfaccia per definire una notizia finanziaria
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

// Cache per le notizie (evita troppe chiamate API)
const newsCache: {
  lastUpdated: Date;
  news: FinancialNews[];
} = {
  lastUpdated: new Date(0), // Data di inizio epoca = necessita aggiornamento
  news: []
};

// Configurazione dei feed RSS
const RSS_FEEDS = [
  {
    url: 'https://www.repubblica.it/rss/economia/rss2.0.xml',
    source: 'Repubblica Economia'
  },
  {
    url: 'https://www.ilsole24ore.com/rss/finanza.xml',
    source: 'Il Sole 24 Ore'
  },
  {
    url: 'https://www.borsaitaliana.it/borsa/notizie/radiocor/finanzarss.xml',
    source: 'Borsa Italiana'
  }
];

// Parser per RSS
const rssParser = new Parser();

/**
 * Recupera le ultime notizie da feed RSS
 */
async function getNewsFromRSS(): Promise<FinancialNews[]> {
  const newsPromises = RSS_FEEDS.map(async (feed) => {
    try {
      const feedContent = await rssParser.parseURL(feed.url);
      
      return feedContent.items.map(item => ({
        id: item.guid || item.link || `${feed.source}-${item.title}-${new Date().getTime()}`,
        title: item.title || 'Titolo non disponibile',
        description: item.contentSnippet || item.description || 'Descrizione non disponibile',
        url: item.link || '',
        source: feed.source,
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        categories: item.categories || [],
        content: item.content
      }));
    } catch (error) {
      log(`Errore nel recupero del feed RSS ${feed.url}: ${error}`, 'financial-news');
      return [];
    }
  });

  const results = await Promise.all(newsPromises);
  return results.flat();
}

/**
 * Recupera le ultime notizie da Yahoo Finance Italia
 */
async function getNewsFromYahooFinance(): Promise<FinancialNews[]> {
  try {
    const response = await axios.get('https://it.finance.yahoo.com/');
    const $ = cheerio.load(response.data);
    const news: FinancialNews[] = [];

    // Seleziona gli elementi di notizie
    $('li.js-stream-content').each((index, element) => {
      const titleElement = $(element).find('h3');
      const linkElement = $(element).find('a');
      const summaryElement = $(element).find('p');
      
      if (titleElement.length && linkElement.length) {
        const title = titleElement.text().trim();
        const url = linkElement.attr('href') || '';
        const description = summaryElement.length ? summaryElement.text().trim() : '';
        
        if (title && url) {
          news.push({
            id: `yahoo-finance-${index}-${new Date().getTime()}`,
            title,
            description,
            url: url.startsWith('http') ? url : `https://it.finance.yahoo.com${url}`,
            source: 'Yahoo Finance',
            publishedAt: new Date(),
            categories: ['finance', 'market'],
          });
        }
      }
    });

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
  const cacheValidityInMinutes = 30; // Aggiorna la cache ogni 30 minuti
  const now = new Date();
  const cacheAge = (now.getTime() - newsCache.lastUpdated.getTime()) / (1000 * 60);
  
  // Se la cache è valida, restituisci i dati dalla cache
  if (cacheAge < cacheValidityInMinutes && newsCache.news.length > 0) {
    log(`Utilizzando notizie in cache (${newsCache.news.length} articoli, età: ${cacheAge.toFixed(1)} minuti)`, 'financial-news');
    return newsCache.news;
  }
  
  // Altrimenti, recupera nuove notizie
  log('Recuperando nuove notizie finanziarie dalle fonti...', 'financial-news');
  
  try {
    // Recupera notizie da diverse fonti in parallelo
    const [rssNews, yahooNews] = await Promise.all([
      getNewsFromRSS(),
      getNewsFromYahooFinance()
    ]);
    
    // Combina le notizie da tutte le fonti
    const allNews = [...rssNews, ...yahooNews];
    
    // Ordina per data di pubblicazione (più recenti prima)
    const sortedNews = allNews.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    
    // Aggiorna la cache
    newsCache.news = sortedNews;
    newsCache.lastUpdated = now;
    
    log(`Recuperate ${sortedNews.length} notizie finanziarie (${rssNews.length} da RSS, ${yahooNews.length} da Yahoo)`, 'financial-news');
    
    return sortedNews;
  } catch (error) {
    log(`Errore nel recupero delle notizie finanziarie: ${error}`, 'financial-news');
    // In caso di errore, restituisci la cache anche se non è aggiornata
    return newsCache.news;
  }
}

/**
 * Recupera i dettagli completi di una notizia specifica
 */
export async function getNewsDetails(newsId: string): Promise<FinancialNews | null> {
  // Cerca prima nella cache
  const cachedNews = newsCache.news.find(news => news.id === newsId);
  if (!cachedNews) {
    return null;
  }
  
  // Se abbiamo già i contenuti completi, restituisci quelli
  if (cachedNews.content) {
    return cachedNews;
  }
  
  // Altrimenti, cerca di recuperare il contenuto completo
  try {
    const response = await axios.get(cachedNews.url);
    const $ = cheerio.load(response.data);
    
    // La logica per estrarre il contenuto dipende dal sito
    let content = '';
    
    if (cachedNews.source === 'Yahoo Finance') {
      content = $('.caas-body').text();
    } else if (cachedNews.source === 'Repubblica Economia') {
      content = $('.article-body').text();
    } else if (cachedNews.source === 'Il Sole 24 Ore') {
      content = $('.articolo-body').text();
    } else if (cachedNews.source === 'Borsa Italiana') {
      content = $('.column-content').text();
    } else {
      // Strategia generica: cerca div con classe content o article
      content = $('.content, .article, article, [itemprop="articleBody"]').text();
    }
    
    // Aggiorna la cache con il contenuto completo
    const updatedNews = { ...cachedNews, content: content.trim() };
    const newsIndex = newsCache.news.findIndex(n => n.id === newsId);
    if (newsIndex >= 0) {
      newsCache.news[newsIndex] = updatedNews;
    }
    
    return updatedNews;
  } catch (error) {
    log(`Errore nel recupero dei dettagli della notizia ${newsId}: ${error}`, 'financial-news');
    return cachedNews;  // Restituisci la versione in cache senza contenuto completo
  }
}