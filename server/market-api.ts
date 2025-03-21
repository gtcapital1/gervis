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
  country: string;
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
  { symbol: "^GSPC", name: "S&P 500", country: "us" },
  { symbol: "^DJI", name: "Dow Jones", country: "us" },
  { symbol: "^IXIC", name: "NASDAQ", country: "us" },
  { symbol: "^FTSE", name: "FTSE 100", country: "gb" },
  { symbol: "^FTSEMIB.MI", name: "FTSE MIB", country: "it" },
  { symbol: "^GDAXI", name: "DAX", country: "de" },
  { symbol: "^FCHI", name: "CAC 40", country: "fr" },
  { symbol: "^VIX", name: "VIX", country: "us" },
  { symbol: "^HSI", name: "Hang Seng", country: "hk" }
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
        changePercent,
        country: index.country
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

// Suggerimenti di ticker popolari per simulare l'autocompletamento
const POPULAR_TICKERS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "META", name: "Meta Platforms Inc." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "NFLX", name: "Netflix Inc." },
  { symbol: "PYPL", name: "PayPal Holdings Inc." },
  { symbol: "INTC", name: "Intel Corporation" },
  { symbol: "AMD", name: "Advanced Micro Devices Inc." },
  { symbol: "CSCO", name: "Cisco Systems Inc." },
  { symbol: "ADBE", name: "Adobe Inc." },
  { symbol: "DIS", name: "The Walt Disney Company" },
  { symbol: "CMCSA", name: "Comcast Corporation" },
  { symbol: "V", name: "Visa Inc." },
  { symbol: "MA", name: "Mastercard Incorporated" },
  { symbol: "JPM", name: "JPMorgan Chase & Co." },
  { symbol: "BAC", name: "Bank of America Corporation" },
  { symbol: "WMT", name: "Walmart Inc." },
  { symbol: "JNJ", name: "Johnson & Johnson" },
  { symbol: "PG", name: "Procter & Gamble Co." },
  { symbol: "HD", name: "The Home Depot Inc." },
  { symbol: "VZ", name: "Verizon Communications Inc." },
  { symbol: "T", name: "AT&T Inc." },
  { symbol: "KO", name: "The Coca-Cola Company" },
  { symbol: "PEP", name: "PepsiCo Inc." },
  { symbol: "ENI.MI", name: "Eni S.p.A." },
  { symbol: "ENEL.MI", name: "Enel S.p.A." },
  { symbol: "ISP.MI", name: "Intesa Sanpaolo S.p.A." },
  { symbol: "UCG.MI", name: "UniCredit S.p.A." },
  { symbol: "STM.MI", name: "STMicroelectronics N.V." },
  { symbol: "TIT.MI", name: "Telecom Italia S.p.A." },
  { symbol: "FCA.MI", name: "Stellantis N.V." }
];

// Funzione per ottenere suggerimenti ticker in base alla query
export async function getTickerSuggestions(req: Request, res: Response) {
  try {
    const query = req.query.q as string;
    
    if (!query || query.length < 1) {
      return res.json([]);
    }
    
    // Filtra i ticker che corrispondono alla query (ignora case)
    const suggestions = POPULAR_TICKERS.filter(ticker => 
      ticker.symbol.toLowerCase().includes(query.toLowerCase()) || 
      ticker.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5); // Limita a 5 risultati
    
    res.json(suggestions);
  } catch (error) {
    console.error("Errore nel recupero dei suggerimenti ticker:", error);
    res.status(500).json({ error: "Errore nel recupero dei suggerimenti ticker" });
  }
}

// Funzione per validare se un ticker esiste
export async function validateTicker(req: Request, res: Response) {
  try {
    const { symbol } = req.body;
    
    if (!symbol) {
      return res.status(400).json({ error: "Simbolo ticker non fornito" });
    }
    
    // Verifichiamo se il ticker esiste nella nostra lista
    const tickerExists = POPULAR_TICKERS.some(ticker => 
      ticker.symbol.toLowerCase() === symbol.toLowerCase()
    );
    
    // Se esiste nella lista, lo consideriamo valido
    // Altrimenti consideriamo comunque valido (per facilità d'uso)
    const isValid = true;
    
    // Recupera il nome completo se disponibile
    const tickerInfo = POPULAR_TICKERS.find(ticker => 
      ticker.symbol.toLowerCase() === symbol.toLowerCase()
    );
    
    // Simuliamo un ritardo di risposta per rendere l'applicazione più realistica
    setTimeout(() => {
      res.json({ 
        valid: isValid, 
        symbol: symbol.toUpperCase(),
        name: tickerInfo ? tickerInfo.name : symbol.toUpperCase()
      });
    }, 300);
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