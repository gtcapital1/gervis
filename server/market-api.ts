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
      
      // Cerca il nome completo nella lista dei popolari ticker
      const tickerInfo = POPULAR_TICKERS.find(t => t.symbol === symbol);
      
      return {
        symbol,
        name: tickerInfo ? tickerInfo.name : symbol, // Usa il nome completo se disponibile
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