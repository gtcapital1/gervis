/**
 * API per dati di mercato e notizie finanziarie
 * Fornisce accesso a:
 * - Indici di mercato principali
 * - Ticker personalizzati
 * - Notizie finanziarie
 */

import axios from 'axios';
import { Request, Response } from 'express';

// Tipi per i dati di mercato
interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

interface StockTicker {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

interface NewsItem {
  title: string;
  description: string;
  url: string;
  urlToImage: string;
  publishedAt: string;
  source: {
    name: string;
  };
}

// Indici principali da monitorare
const MAIN_INDICES = [
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^DJI", name: "Dow Jones" },
  { symbol: "^IXIC", name: "NASDAQ" },
  { symbol: "^FTSE", name: "FTSE 100" },
  { symbol: "^FTSEMIB.MI", name: "FTSE MIB" },
  { symbol: "^GDAXI", name: "DAX" }
];

// Funzione per recuperare i dati degli indici principali
export async function getMarketIndices(req: Request, res: Response) {
  try {
    // Qui dovremmo fare una chiamata API a un servizio come Alpha Vantage, Yahoo Finance, ecc.
    // Per semplicità, genereremo dati di esempio
    
    const indices: MarketIndex[] = MAIN_INDICES.map(index => {
      // Genera un prezzo casuale tra 1000 e 50000
      const price = Math.random() * 49000 + 1000;
      // Genera una variazione casuale tra -2% e 2%
      const changePercent = (Math.random() * 4) - 2;
      const change = price * (changePercent / 100);
      
      return {
        symbol: index.symbol,
        name: index.name,
        price,
        change,
        changePercent
      };
    });
    
    res.json(indices);
  } catch (error) {
    console.error("Errore nel recupero degli indici di mercato:", error);
    res.status(500).json({ error: "Errore nel recupero dei dati degli indici" });
  }
}

// Funzione per recuperare dati per ticker specifici
export async function getTickerData(req: Request, res: Response) {
  try {
    // Ottieni la lista di ticker dalla query (es. ?symbols=AAPL,MSFT,GOOGL)
    const symbols = req.query.symbols ? (req.query.symbols as string).split(',') : [];
    
    if (!symbols.length) {
      return res.status(400).json({ error: "Nessun ticker specificato" });
    }
    
    // Qui dovremmo chiamare un'API di mercato reale
    // Per semplicità, generiamo dati di esempio
    const tickers: StockTicker[] = symbols.map(symbol => {
      // Genera un prezzo casuale tra 10 e 1000
      const price = Math.random() * 990 + 10;
      // Genera una variazione casuale tra -5% e 5%
      const changePercent = (Math.random() * 10) - 5;
      const change = price * (changePercent / 100);
      
      return {
        symbol,
        name: symbol, // Idealmente qui avremmo il nome completo dell'azienda
        price,
        change,
        changePercent
      };
    });
    
    res.json(tickers);
  } catch (error) {
    console.error("Errore nel recupero dei dati dei ticker:", error);
    res.status(500).json({ error: "Errore nel recupero dei dati dei ticker" });
  }
}

// Funzione per validare se un ticker esiste
export async function validateTicker(req: Request, res: Response) {
  try {
    const { symbol } = req.body;
    
    if (!symbol) {
      return res.status(400).json({ error: "Simbolo ticker non fornito" });
    }
    
    // In una vera implementazione, verificheremmo se il ticker esiste consultando un'API
    // Per semplicità, consideriamo validi tutti i ticker
    
    // Simuliamo un ritardo di risposta per rendere l'applicazione più realistica
    setTimeout(() => {
      res.json({ valid: true, symbol });
    }, 500);
  } catch (error) {
    console.error("Errore nella validazione del ticker:", error);
    res.status(500).json({ error: "Errore nella validazione del ticker" });
  }
}

// Funzione per recuperare le notizie finanziarie
export async function getFinancialNews(req: Request, res: Response) {
  try {
    const apiKey = process.env.FINANCIAL_NEWS_API_KEY;
    
    if (!apiKey) {
      console.error("Chiave API News non configurata");
      return res.status(500).json({ error: "Configurazione API mancante" });
    }
    
    // Utilizziamo NewsAPI per ottenere le notizie finanziarie
    // Documentazione: https://newsapi.org/docs/endpoints/top-headlines
    const response = await axios.get('https://newsapi.org/v2/top-headlines', {
      params: {
        apiKey,
        category: 'business',
        language: 'it',
        pageSize: 20,
      }
    });
    
    const newsItems: NewsItem[] = response.data.articles.map((article: any) => ({
      title: article.title,
      description: article.description || "Nessuna descrizione disponibile",
      url: article.url,
      urlToImage: article.urlToImage,
      publishedAt: article.publishedAt,
      source: {
        name: article.source.name || "Fonte sconosciuta"
      }
    }));
    
    res.json(newsItems);
  } catch (error) {
    console.error("Errore nel recupero delle notizie finanziarie:", error);
    res.status(500).json({ error: "Errore nel recupero delle notizie finanziarie" });
  }
}