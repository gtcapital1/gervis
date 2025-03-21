/**
 * API per dati di mercato e notizie finanziarie
 * Fornisce accesso a:
 * - Indici di mercato principali
 * - Ticker personalizzati
 * - Notizie finanziarie
 */

import axios from 'axios';
import { Request, Response } from 'express';

// Sistema di cache in memoria per ridurre le chiamate API e garantire stabilità dei dati
const cacheStore: Record<string, { data: any, expiry: number }> = {};

function getFromCache(key: string): any | null {
  const cached = cacheStore[key];
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  return null;
}

function saveToCache(key: string, data: any, ttlMs: number): void {
  cacheStore[key] = {
    data,
    expiry: Date.now() + ttlMs
  };
}

// Tipi per i dati di mercato
interface MarketIndex {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  country: string;
  dataUnavailable?: boolean;
  currency?: string;
}

interface StockTicker {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  currency?: string;
  dataUnavailable?: boolean;
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

// Dati fissi per indici di mercato (non cambiano ad ogni richiesta)
const FIXED_INDICES_DATA: Record<string, { price: number, changePercent: number, currency: string }> = {
  "^GSPC": { price: 5071.63, changePercent: 0.42, currency: "$" },
  "^DJI": { price: 38239.85, changePercent: 0.68, currency: "$" },
  "^IXIC": { price: 15927.90, changePercent: 0.32, currency: "$" },
  "^FTSE": { price: 7930.96, changePercent: 0.18, currency: "£" },
  "^FTSEMIB.MI": { price: 33987.03, changePercent: 0.85, currency: "€" },
  "^GDAXI": { price: 17842.85, changePercent: 0.23, currency: "€" },
  "^FCHI": { price: 8142.72, changePercent: 0.54, currency: "€" },
  "^VIX": { price: 14.08, changePercent: -2.36, currency: "$" },
  "^HSI": { price: 16512.92, changePercent: -0.43, currency: "HK$" }
};

// Funzione per recuperare i dati degli indici principali
export async function getMarketIndices(req: Request, res: Response) {
  try {
    // Utilizziamo la Financial Modeling Prep API per ottenere dati reali
    const apiKey = process.env.FINANCIAL_API_KEY;
    
    // Verifichiamo che la chiave API sia disponibile
    if (!apiKey) {
      console.error("Chiave API Financial Modeling Prep non trovata");
      throw new Error("API key not found");
    }
    
    // Per migliorare la stabilità, utilizziamo un sistema di cache in memoria
    // che mantiene i dati per un certo periodo di tempo (30 minuti)
    const cacheKey = 'market_indices';
    const cachedData = getFromCache(cacheKey);
    
    if (cachedData) {
      return res.json(cachedData);
    }
    
    // Prepariamo le richieste per tutti gli indici
    const fetchPromises = MAIN_INDICES.map(async (index) => {
      try {
        // Il piano gratuito di Financial Modeling Prep è limitato solo alle azioni americane
        // Quindi controlliamo se l'indice è americano
        if (index.country !== 'us') {
          // Per indici non americani, mostriamo N/A invece di dati fissi
          return {
            symbol: index.symbol,
            name: index.name,
            price: null,
            change: null,
            changePercent: null,
            country: index.country,
            dataUnavailable: true
          };
        }
        
        // Normalizziamo il simbolo per la API per indici americani
        let apiSymbol = index.symbol;
        
        // Rimuoviamo il prefisso ^ che potrebbe esserci nel simbolo
        if (apiSymbol.startsWith("^")) {
          apiSymbol = apiSymbol.substring(1);
        }
        
        const url = `https://financialmodelingprep.com/api/v3/quote/${apiSymbol}?apikey=${apiKey}`;
        const response = await axios.get(url);
        
        if (response.data && response.data.length > 0) {
          const data = response.data[0];
          return {
            symbol: index.symbol,
            name: index.name,
            price: parseFloat(data.price.toFixed(2)),
            change: parseFloat(data.change.toFixed(2)),
            changePercent: parseFloat(data.changesPercentage.toFixed(2)),
            country: index.country,
            currency: "$"
          };
        } else {
          // Se non abbiamo dati, mostriamo N/A
          return {
            symbol: index.symbol,
            name: index.name,
            price: null,
            change: null,
            changePercent: null,
            country: index.country,
            dataUnavailable: true
          };
        }
      } catch (err) {
        console.error(`Errore nel recuperare i dati per ${index.symbol}:`, err);
        // In caso di errore, mostriamo N/A
        return {
          symbol: index.symbol,
          name: index.name,
          price: null,
          change: null,
          changePercent: null,
          country: index.country,
          dataUnavailable: true
        };
      }
    });
    
    // Attendiamo che tutte le richieste siano completate
    const indices = await Promise.all(fetchPromises);
    
    // Salviamo nella cache
    saveToCache(cacheKey, indices, 30 * 60 * 1000); // Cache valida per 30 minuti
    
    res.json(indices);
  } catch (error) {
    console.error("Errore nel recupero degli indici di mercato:", error);
    
    // In caso di errore generale, mostriamo N/A per tutti gli indici
    const indices: MarketIndex[] = MAIN_INDICES.map(index => {
      return {
        symbol: index.symbol,
        name: index.name,
        price: null,
        change: null,
        changePercent: null,
        country: index.country,
        dataUnavailable: true
      };
    });
    
    res.json(indices);
  }
}

// Dati fissi per ticker popolari (fallback in caso di API non disponibile)
const FIXED_TICKER_DATA: Record<string, { price: number, changePercent: number, currency: string }> = {
  "AAPL": { price: 169.96, changePercent: 0.24, currency: "$" },
  "MSFT": { price: 416.78, changePercent: 0.32, currency: "$" },
  "GOOGL": { price: 146.95, changePercent: 0.41, currency: "$" },
  "AMZN": { price: 176.84, changePercent: 0.65, currency: "$" },
  "META": { price: 486.18, changePercent: 0.72, currency: "$" },
  "TSLA": { price: 171.05, changePercent: -0.42, currency: "$" },
  "NVDA": { price: 879.19, changePercent: 0.84, currency: "$" },
  "NFLX": { price: 612.32, changePercent: 0.28, currency: "$" },
  "PYPL": { price: 62.41, changePercent: -0.16, currency: "$" },
  "INTC": { price: 40.96, changePercent: -0.35, currency: "$" },
  "AMD": { price: 170.48, changePercent: 0.64, currency: "$" },
  "CSCO": { price: 48.56, changePercent: 0.12, currency: "$" },
  "ADBE": { price: 465.32, changePercent: 0.54, currency: "$" },
  "DIS": { price: 114.92, changePercent: 0.38, currency: "$" },
  "V": { price: 277.45, changePercent: 0.28, currency: "$" },
  "MA": { price: 458.19, changePercent: 0.31, currency: "$" },
  "JPM": { price: 196.62, changePercent: 0.48, currency: "$" },
  "BAC": { price: 36.54, changePercent: 0.21, currency: "$" },
  "WMT": { price: 59.87, changePercent: 0.15, currency: "$" },
  "JNJ": { price: 152.05, changePercent: -0.14, currency: "$" },
  "PG": { price: 161.24, changePercent: 0.08, currency: "$" },
  "KO": { price: 60.93, changePercent: 0.24, currency: "$" },
  "PEP": { price: 170.85, changePercent: 0.16, currency: "$" },
  "ENI.MI": { price: 14.55, changePercent: 0.42, currency: "€" },
  "ENEL.MI": { price: 6.13, changePercent: 0.26, currency: "€" },
  "ISP.MI": { price: 3.05, changePercent: 0.59, currency: "€" },
  "UCG.MI": { price: 30.17, currency: "€", changePercent: 0.85 },
  "STM.MI": { price: 41.92, changePercent: 0.64, currency: "€" },
  "TIT.MI": { price: 0.235, changePercent: -0.32, currency: "€" }
};

// Funzione per recuperare dati per ticker specifici
export async function getTickerData(req: Request, res: Response) {
  try {
    // Ottieni la lista di ticker dalla query (es. ?symbols=AAPL,MSFT,GOOGL)
    const symbols = req.query.symbols ? (req.query.symbols as string).split(',') : [];
    
    if (!symbols.length) {
      return res.status(400).json({ error: "Nessun ticker specificato" });
    }
    
    // Utilizziamo la Financial Modeling Prep API per ottenere dati reali
    const apiKey = process.env.FINANCIAL_API_KEY;
    
    // Verifichiamo che la chiave API sia disponibile
    if (!apiKey) {
      console.error("Chiave API Financial Modeling Prep non trovata");
      throw new Error("API key not found");
    }
    
    // Verifica se abbiamo dati nella cache
    const cacheKey = `tickers_${symbols.join('_')}`;
    const cachedData = getFromCache(cacheKey);
    
    if (cachedData) {
      return res.json(cachedData);
    }
    
    // Separa i ticker americani da quelli non americani
    // Il piano gratuito di Financial Modeling Prep supporta solo azioni americane
    const usSymbols: string[] = [];
    const nonUsSymbols: string[] = [];
    
    symbols.forEach(symbol => {
      // Consideriamo non-US tutte le azioni con .MI (Milano), .PA (Parigi), ecc.
      if (symbol.includes('.')) {
        nonUsSymbols.push(symbol);
      } else {
        usSymbols.push(symbol);
      }
    });
    
    // Array per i risultati
    let tickers: StockTicker[] = [];
    
    // Per i ticker non americani, mostriamo N/A invece di dati fissi
    nonUsSymbols.forEach(symbol => {
      const tickerInfo = POPULAR_TICKERS.find(t => t.symbol === symbol);
      
      tickers.push({
        symbol,
        name: tickerInfo ? tickerInfo.name : symbol,
        price: null,
        change: null,
        changePercent: null,
        dataUnavailable: true
      });
    });
    
    // Per i ticker americani, proviamo a ottenere dati reali
    if (usSymbols.length > 0) {
      try {
        const symbolsString = usSymbols.join(',');
        const url = `https://financialmodelingprep.com/api/v3/quote/${symbolsString}?apikey=${apiKey}`;
        
        const response = await axios.get(url);
        
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          // Trasformiamo i dati nel formato atteso
          const usTickers: StockTicker[] = response.data.map((item: any) => {
            return {
              symbol: item.symbol,
              name: item.name,
              price: parseFloat(item.price.toFixed(2)),
              change: parseFloat(item.change.toFixed(2)),
              changePercent: parseFloat(item.changesPercentage.toFixed(2)),
              currency: "$"
            };
          });
          
          // Combiniamo i ticker US con quelli non-US
          tickers = [...tickers, ...usTickers];
          
          // Verifichiamo se abbiamo tutti i ticker americani richiesti
          const foundSymbols = usTickers.map(t => t.symbol);
          const missingSymbols = usSymbols.filter(s => !foundSymbols.includes(s));
          
          // Aggiungiamo i ticker americani mancanti come dati non disponibili
          for (const symbol of missingSymbols) {
            const tickerInfo = POPULAR_TICKERS.find(t => t.symbol === symbol);
            
            tickers.push({
              symbol,
              name: tickerInfo ? tickerInfo.name : symbol,
              price: null,
              change: null,
              changePercent: null,
              dataUnavailable: true
            });
          }
        } else {
          // Se non abbiamo dati dall'API, mostriamo N/A per tutti i ticker americani
          for (const symbol of usSymbols) {
            const tickerInfo = POPULAR_TICKERS.find(t => t.symbol === symbol);
            
            tickers.push({
              symbol,
              name: tickerInfo ? tickerInfo.name : symbol,
              price: null,
              change: null,
              changePercent: null,
              dataUnavailable: true
            });
          }
        }
      } catch (apiError) {
        console.error("Errore nella chiamata API per ticker americani:", apiError);
        
        // In caso di errore dell'API, mostriamo N/A per tutti i ticker americani
        for (const symbol of usSymbols) {
          const tickerInfo = POPULAR_TICKERS.find(t => t.symbol === symbol);
          
          tickers.push({
            symbol,
            name: tickerInfo ? tickerInfo.name : symbol,
            price: null,
            change: null,
            changePercent: null,
            dataUnavailable: true
          });
        }
      }
    }
    
    // Salviamo i dati nella cache
    saveToCache(cacheKey, tickers, 30 * 60 * 1000); // Cache valida per 30 minuti
    
    res.json(tickers);
  } catch (error) {
    console.error("Errore nel recupero dei dati dei ticker:", error);
    
    // In caso di errore generale, restituire dati non disponibili
    const tickers: StockTicker[] = (req.query.symbols as string).split(',').map(symbol => {
      const tickerInfo = POPULAR_TICKERS.find(t => t.symbol === symbol);
      
      return {
        symbol,
        name: tickerInfo ? tickerInfo.name : symbol,
        price: null,
        change: null,
        changePercent: null,
        dataUnavailable: true
      };
    });
    
    res.json(tickers);
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

// Funzione per recuperare le notizie finanziarie da Financial Modeling Prep API
export async function getFinancialNews(req: Request, res: Response) {
  try {
    // Ottieni il parametro di filtro per le notizie (globale o italia)
    const filter = req.query.filter as string || 'global';
    const cacheKey = `financial_news_${filter}`;
    
    // Controlla se abbiamo dati cached
    const cachedData = getFromCache(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }
    
    const apiKey = process.env.FINANCIAL_API_KEY;
    if (!apiKey) {
      throw new Error("API key non configurata per Financial Modeling Prep");
    }
    
    let newsItems: NewsItem[] = [];
    let apiUrl = '';
    
    if (filter === 'italia') {
      // Per notizie italiane, utilizziamo i ticker italiani
      apiUrl = `https://financialmodelingprep.com/api/v3/stock_news?tickers=ISP.MI,ENI.MI,ENEL.MI,UCG.MI,TIT.MI&limit=10&apikey=${apiKey}`;
    } else {
      // Per notizie globali
      apiUrl = `https://financialmodelingprep.com/api/v3/stock_news?limit=10&apikey=${apiKey}`;
    }
    
    console.log(`Recupero notizie finanziarie per ${filter}`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Errore API: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (Array.isArray(data)) {
      newsItems = data.map(item => ({
        title: item.title,
        description: item.text,
        url: item.url,
        urlToImage: item.image || "",
        publishedAt: item.publishedDate,
        source: {
          name: item.site
        }
      }));
      
      // Cache dei risultati per 15 minuti (900000 ms)
      saveToCache(cacheKey, newsItems, 900000);
    } else {
      console.error("Formato di risposta API inatteso:", data);
      throw new Error("Formato di risposta API inatteso");
    }
    
    res.json(newsItems);
  } catch (error) {
    console.error("Errore nel recupero delle notizie finanziarie:", error);
    
    // In caso di errore, restituiamo un array vuoto di notizie
    // piuttosto che dati fittizi, seguendo il principio di data integrity
    res.json([]);
  }
}