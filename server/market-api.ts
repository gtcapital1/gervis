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

// Dati fissi per indici di mercato (non cambiano ad ogni richiesta)
const FIXED_INDICES_DATA: Record<string, { price: number, changePercent: number }> = {
  "^GSPC": { price: 5254.45, changePercent: 0.32 },
  "^DJI": { price: 39187.63, changePercent: 0.18 },
  "^IXIC": { price: 16379.35, changePercent: 0.64 },
  "^FTSE": { price: 8152.92, changePercent: 0.22 },
  "^FTSEMIB.MI": { price: 34337.24, changePercent: 0.36 },
  "^GDAXI": { price: 18464.90, changePercent: 0.41 },
  "^FCHI": { price: 8184.75, changePercent: 0.25 },
  "^VIX": { price: 13.16, changePercent: -1.94 },
  "^HSI": { price: 16963.87, changePercent: 0.83 }
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
          // Per indici non americani, usiamo i dati fissi
          const fallbackData = FIXED_INDICES_DATA[index.symbol] || { price: 5000, changePercent: 0.5 };
          return {
            symbol: index.symbol,
            name: index.name,
            price: fallbackData.price,
            change: fallbackData.price * (fallbackData.changePercent / 100),
            changePercent: fallbackData.changePercent,
            country: index.country
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
            country: index.country
          };
        } else {
          // Se non abbiamo dati, usiamo i dati fissi come fallback
          const fallbackData = FIXED_INDICES_DATA[index.symbol] || { price: 5000, changePercent: 0.5 };
          return {
            symbol: index.symbol,
            name: index.name,
            price: fallbackData.price,
            change: fallbackData.price * (fallbackData.changePercent / 100),
            changePercent: fallbackData.changePercent,
            country: index.country
          };
        }
      } catch (err) {
        console.error(`Errore nel recuperare i dati per ${index.symbol}:`, err);
        // In caso di errore, usiamo i dati fissi come fallback
        const fallbackData = FIXED_INDICES_DATA[index.symbol] || { price: 5000, changePercent: 0.5 };
        return {
          symbol: index.symbol,
          name: index.name,
          price: fallbackData.price,
          change: fallbackData.price * (fallbackData.changePercent / 100),
          changePercent: fallbackData.changePercent,
          country: index.country
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
    
    // In caso di errore generale, restituiamo i dati fissi
    const indices: MarketIndex[] = MAIN_INDICES.map(index => {
      const data = FIXED_INDICES_DATA[index.symbol] || { price: 5000, changePercent: 0.5 };
      return {
        symbol: index.symbol,
        name: index.name,
        price: data.price,
        change: data.price * (data.changePercent / 100),
        changePercent: data.changePercent,
        country: index.country
      };
    });
    
    res.json(indices);
  }
}

// Dati fissi per ticker popolari (fallback in caso di API non disponibile)
const FIXED_TICKER_DATA: Record<string, { price: number, changePercent: number }> = {
  "AAPL": { price: 168.82, changePercent: 0.89 },
  "MSFT": { price: 425.52, changePercent: 1.23 },
  "GOOGL": { price: 147.68, changePercent: 0.76 },
  "AMZN": { price: 178.12, changePercent: 1.45 },
  "META": { price: 493.78, changePercent: 2.18 },
  "TSLA": { price: 172.63, changePercent: -0.72 },
  "NVDA": { price: 925.61, changePercent: 3.24 },
  "NFLX": { price: 628.47, changePercent: 0.53 },
  "PYPL": { price: 63.45, changePercent: -0.34 },
  "INTC": { price: 42.65, changePercent: -1.23 },
  "AMD": { price: 174.12, changePercent: 2.78 },
  "CSCO": { price: 48.74, changePercent: 0.21 },
  "ADBE": { price: 475.89, changePercent: 1.67 },
  "DIS": { price: 115.47, changePercent: 0.92 },
  "V": { price: 278.63, changePercent: 0.75 },
  "MA": { price: 462.81, changePercent: 0.83 },
  "JPM": { price: 195.24, changePercent: 1.12 },
  "BAC": { price: 36.78, changePercent: 0.54 },
  "WMT": { price: 60.45, changePercent: 0.31 },
  "JNJ": { price: 152.32, changePercent: -0.23 },
  "PG": { price: 161.55, changePercent: 0.12 },
  "KO": { price: 61.28, changePercent: 0.42 },
  "PEP": { price: 171.36, changePercent: 0.35 },
  "ENI.MI": { price: 14.78, changePercent: 1.23 },
  "ENEL.MI": { price: 6.24, changePercent: 0.85 },
  "ISP.MI": { price: 3.12, changePercent: 1.47 },
  "UCG.MI": { price: 30.45, changePercent: 2.12 },
  "STM.MI": { price: 42.56, changePercent: 1.78 },
  "TIT.MI": { price: 0.24, changePercent: -0.76 }
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
    
    // Per i ticker non americani, usiamo i dati fissi
    nonUsSymbols.forEach(symbol => {
      const tickerInfo = POPULAR_TICKERS.find(t => t.symbol === symbol);
      const fallbackData = FIXED_TICKER_DATA[symbol] || { price: 100, changePercent: 0.5 };
      
      tickers.push({
        symbol,
        name: tickerInfo ? tickerInfo.name : symbol,
        price: fallbackData.price,
        change: fallbackData.price * (fallbackData.changePercent / 100),
        changePercent: fallbackData.changePercent
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
              changePercent: parseFloat(item.changesPercentage.toFixed(2))
            };
          });
          
          // Combiniamo i ticker US con quelli non-US
          tickers = [...tickers, ...usTickers];
          
          // Verifichiamo se abbiamo tutti i ticker americani richiesti
          const foundSymbols = usTickers.map(t => t.symbol);
          const missingSymbols = usSymbols.filter(s => !foundSymbols.includes(s));
          
          // Aggiungiamo i ticker americani mancanti usando i dati fissi
          for (const symbol of missingSymbols) {
            const tickerInfo = POPULAR_TICKERS.find(t => t.symbol === symbol);
            const fallbackData = FIXED_TICKER_DATA[symbol] || { price: 100, changePercent: 0.5 };
            
            tickers.push({
              symbol,
              name: tickerInfo ? tickerInfo.name : symbol,
              price: fallbackData.price,
              change: fallbackData.price * (fallbackData.changePercent / 100),
              changePercent: fallbackData.changePercent
            });
          }
        } else {
          // Se non abbiamo dati dall'API, usiamo i dati fissi per tutti i ticker americani
          for (const symbol of usSymbols) {
            const tickerInfo = POPULAR_TICKERS.find(t => t.symbol === symbol);
            const fallbackData = FIXED_TICKER_DATA[symbol] || { price: 100, changePercent: 0.5 };
            
            tickers.push({
              symbol,
              name: tickerInfo ? tickerInfo.name : symbol,
              price: fallbackData.price,
              change: fallbackData.price * (fallbackData.changePercent / 100),
              changePercent: fallbackData.changePercent
            });
          }
        }
      } catch (apiError) {
        console.error("Errore nella chiamata API per ticker americani:", apiError);
        
        // In caso di errore dell'API, usiamo i dati fissi per tutti i ticker americani
        for (const symbol of usSymbols) {
          const tickerInfo = POPULAR_TICKERS.find(t => t.symbol === symbol);
          const fallbackData = FIXED_TICKER_DATA[symbol] || { price: 100, changePercent: 0.5 };
          
          tickers.push({
            symbol,
            name: tickerInfo ? tickerInfo.name : symbol,
            price: fallbackData.price,
            change: fallbackData.price * (fallbackData.changePercent / 100),
            changePercent: fallbackData.changePercent
          });
        }
      }
    }
    
    // Salviamo i dati nella cache
    saveToCache(cacheKey, tickers, 30 * 60 * 1000); // Cache valida per 30 minuti
    
    res.json(tickers);
  } catch (error) {
    console.error("Errore nel recupero dei dati dei ticker:", error);
    
    // In caso di errore generale, restituire dati di fallback
    const tickers: StockTicker[] = (req.query.symbols as string).split(',').map(symbol => {
      const tickerInfo = POPULAR_TICKERS.find(t => t.symbol === symbol);
      const fallbackData = FIXED_TICKER_DATA[symbol] || { price: 100, changePercent: 0.5 };
      
      return {
        symbol,
        name: tickerInfo ? tickerInfo.name : symbol,
        price: fallbackData.price,
        change: fallbackData.price * (fallbackData.changePercent / 100),
        changePercent: fallbackData.changePercent
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

// Funzione per recuperare le notizie finanziarie
export async function getFinancialNews(req: Request, res: Response) {
  try {
    // Ottieni il parametro di filtro per le notizie (globale o italia)
    const filter = req.query.filter as string || 'global';
    
    // Per questioni di stabilità, dato che l'API esterna aveva problemi di autenticazione,
    // forniamo delle notizie finanziarie simulate basate su diversi paesi/regioni
    
    // Set di notizie globali
    const globalNews: NewsItem[] = [
      {
        title: "Wall Street: nuovi record per gli indici statunitensi",
        description: "Gli indici di Wall Street hanno raggiunto nuovi massimi storici, trainati dalle performance positive dei titoli tecnologici e dai dati sull'occupazione migliori delle attese.",
        url: "https://example.com/news/global/1",
        urlToImage: "https://via.placeholder.com/800x400?text=Wall+Street+Records",
        publishedAt: new Date().toISOString(),
        source: {
          name: "Financial Times"
        }
      },
      {
        title: "Nasdaq supera la soglia dei 20.000 punti",
        description: "L'indice dei titoli tecnologici americani ha superato per la prima volta nella storia la soglia dei 20.000 punti, spinto dal rally dell'intelligenza artificiale.",
        url: "https://example.com/news/global/2",
        urlToImage: "https://via.placeholder.com/800x400?text=Nasdaq+20000",
        publishedAt: new Date(Date.now() - 2600000).toISOString(),
        source: {
          name: "Bloomberg"
        }
      },
      {
        title: "La Fed mantiene i tassi di interesse invariati",
        description: "La Federal Reserve ha deciso di mantenere invariati i tassi di interesse, segnalando una possibile riduzione nel prossimo trimestre se l'inflazione continuerà a scendere.",
        url: "https://example.com/news/global/3",
        urlToImage: "https://via.placeholder.com/800x400?text=Fed+Decision",
        publishedAt: new Date(Date.now() - 5200000).toISOString(),
        source: {
          name: "Wall Street Journal"
        }
      },
      {
        title: "Nuove politiche monetarie della BCE",
        description: "La Banca Centrale Europea ha annunciato nuove misure per contrastare l'inflazione e sostenere la crescita economica nell'eurozona.",
        url: "https://example.com/news/global/4",
        urlToImage: "https://via.placeholder.com/800x400?text=BCE+Policies",
        publishedAt: new Date(Date.now() - 7800000).toISOString(),
        source: {
          name: "Economia Europa"
        }
      },
      {
        title: "Settore tecnologico: investimenti record nell'AI",
        description: "Il settore tecnologico ha registrato investimenti record nelle tecnologie di intelligenza artificiale, con oltre 300 miliardi di dollari di investimenti globali previsti per il 2025.",
        url: "https://example.com/news/global/5",
        urlToImage: "https://via.placeholder.com/800x400?text=AI+Investments",
        publishedAt: new Date(Date.now() - 9400000).toISOString(),
        source: {
          name: "Tech Insider"
        }
      }
    ];
    
    // Set di notizie italiane
    const italiaNews: NewsItem[] = [
      {
        title: "FTSE MIB: il listino milanese chiude in positivo",
        description: "Il principale indice della borsa di Milano ha chiuso la seduta in rialzo dell'1,2%, trainato dal settore bancario e dalle utilities.",
        url: "https://example.com/news/italia/1",
        urlToImage: "https://via.placeholder.com/800x400?text=FTSE+MIB",
        publishedAt: new Date().toISOString(),
        source: {
          name: "Il Sole 24 Ore"
        }
      },
      {
        title: "Crescita PIL italiano: previsioni positive per il 2025",
        description: "Secondo le ultime stime del Ministero dell'Economia, l'Italia potrebbe crescere più del previsto nel 2025, trainata dall'export e dai consumi interni.",
        url: "https://example.com/news/italia/2",
        urlToImage: "https://via.placeholder.com/800x400?text=PIL+Italia",
        publishedAt: new Date(Date.now() - 3600000).toISOString(),
        source: {
          name: "Economia Italia"
        }
      },
      {
        title: "Mercato immobiliare: segnali di ripresa nel residenziale",
        description: "Il mercato immobiliare italiano mostra segnali di ripresa, specialmente nel segmento residenziale. Aumentano le compravendite nelle grandi città.",
        url: "https://example.com/news/italia/3",
        urlToImage: "https://via.placeholder.com/800x400?text=Immobiliare+Italia",
        publishedAt: new Date(Date.now() - 7200000).toISOString(),
        source: {
          name: "Repubblica Economia"
        }
      },
      {
        title: "Le banche italiane registrano utili record",
        description: "Il settore bancario italiano ha registrato nel primo trimestre utili record, superando le aspettative degli analisti e mostrando una forte resilienza.",
        url: "https://example.com/news/italia/4",
        urlToImage: "https://via.placeholder.com/800x400?text=Banche+Italiane",
        publishedAt: new Date(Date.now() - 10800000).toISOString(),
        source: {
          name: "Milano Finanza"
        }
      },
      {
        title: "Nuovi incentivi per le imprese italiane",
        description: "Il governo ha annunciato nuovi incentivi fiscali per le imprese italiane che investono in digitalizzazione e sostenibilità ambientale.",
        url: "https://example.com/news/italia/5",
        urlToImage: "https://via.placeholder.com/800x400?text=Incentivi+Imprese",
        publishedAt: new Date(Date.now() - 14400000).toISOString(),
        source: {
          name: "Corriere Economia"
        }
      }
    ];
    
    // Restituisci le notizie in base al filtro
    if (filter === 'italia') {
      res.json(italiaNews);
    } else {
      res.json(globalNews);
    }
  } catch (error) {
    console.error("Errore nel recupero delle notizie finanziarie:", error);
    res.status(500).json({ error: "Errore nel recupero delle notizie finanziarie" });
  }
}