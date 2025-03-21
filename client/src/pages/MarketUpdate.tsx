import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Newspaper, 
  TrendingUp, 
  LineChart, 
  BarChart3, 
  ArrowRight, 
  RefreshCw,
  Plus,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Search
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

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

// Componente selettore timeframe per i grafici
const TimeframeSelector = ({ 
  selectedTimeframe, 
  onChange 
}: { 
  selectedTimeframe: TimeFrame, 
  onChange: (timeframe: TimeFrame) => void 
}) => {
  const timeframes: TimeFrame[] = ['1D', '1W', '1M', '1Y', '3Y', '5Y', '10Y'];
  
  return (
    <div className="flex space-x-1 bg-muted rounded-lg p-1 mb-4 w-fit">
      {timeframes.map((tf) => (
        <Button
          key={tf}
          variant={selectedTimeframe === tf ? "default" : "ghost"}
          size="sm"
          onClick={() => onChange(tf)}
          className="text-xs px-2 py-1 h-7"
        >
          {tf}
        </Button>
      ))}
    </div>
  );
};

// Componente grafico per indici e stocks (realistico)
const ChartComponent = ({ 
  symbol, 
  timeframe, 
  type = 'index'
}: { 
  symbol: string, 
  timeframe: TimeFrame,
  type?: 'index' | 'stock'
}) => {
  // Generiamo dati casuali per mostrare un grafico più realistico
  const [data, setData] = useState<Array<{date: string, value: number}>>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [priceInfo, setPriceInfo] = useState({
    current: 0,
    previous: 0,
    change: 0,
    isPositive: true
  });
  
  // Effetto per generare dati simulati basati sul timeframe
  useEffect(() => {
    setChartLoading(true);
    
    // Simulazione caricamento dati da API
    setTimeout(() => {
      const numPoints = timeframe === '1D' ? 24 : 
                      timeframe === '1W' ? 7 : 
                      timeframe === '1M' ? 30 : 
                      timeframe === '1Y' ? 12 : 
                      timeframe === '3Y' ? 36 : 
                      timeframe === '5Y' ? 20 : 40;
      
      // Genera un valore di base per il simbolo (basato sul suo nome)
      const symbolValue = symbol.split('').reduce((a, b) => a + b.charCodeAt(0), 0) % 100;
      const baseValue = type === 'index' ? symbolValue * 100 + 1000 : symbolValue * 5 + 50;
      
      // Genera dati casuali con trend generale verso l'alto
      const newData = Array.from({ length: numPoints }, (_, i) => {
        // Aggiungiamo un po' di varianza ma con un trend generale
        const variance = Math.random() * 20 - 10; // Varianza tra -10 e +10
        const trend = (i / numPoints) * 15; // Trend generale positivo
        const value = baseValue + variance + trend;
        
        // La data dipende dal timeframe
        let date = new Date();
        if (timeframe === '1D') {
          date.setHours(date.getHours() - (numPoints - i - 1));
          return { date: date.toLocaleTimeString(), value };
        } else if (timeframe === '1W') {
          date.setDate(date.getDate() - (numPoints - i - 1));
          return { date: date.toLocaleDateString(), value };
        } else if (timeframe === '1M') {
          date.setDate(date.getDate() - (numPoints - i - 1));
          return { date: date.toLocaleDateString(), value };
        } else {
          date.setMonth(date.getMonth() - (numPoints - i - 1));
          return { date: date.toLocaleDateString(), value };
        }
      });
      
      // Aggiorna i dati
      setData(newData);
      
      // Imposta le informazioni di prezzo
      const currentPrice = newData[newData.length - 1].value;
      const previousPrice = newData[0].value;
      const priceChange = currentPrice - previousPrice;
      
      setPriceInfo({
        current: currentPrice,
        previous: previousPrice,
        change: priceChange,
        isPositive: priceChange >= 0
      });
      
      setChartLoading(false);
    }, 1000);
  }, [symbol, timeframe, type]);
  
  // Rendering del componente grafico
  return (
    <Card className="mb-6">
      <CardHeader className="pb-0">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg text-black">{symbol}</CardTitle>
            <CardDescription>{type === 'index' ? 'Indice' : 'Azione'} - Timeframe: {timeframe}</CardDescription>
          </div>
          <div className="flex flex-col items-end">
            {!chartLoading && (
              <>
                <span className="text-lg font-bold">
                  {priceInfo.current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={priceInfo.isPositive ? "text-green-600 text-sm" : "text-red-600 text-sm"}>
                  {priceInfo.isPositive ? "+" : ""}{priceInfo.change.toFixed(2)} ({((priceInfo.change / priceInfo.previous) * 100).toFixed(2)}%)
                </span>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartLoading ? (
          <div className="h-[300px] w-full bg-muted flex items-center justify-center rounded-md overflow-hidden my-2 animate-pulse">
            <LineChart className="h-16 w-16 text-muted-foreground opacity-50" />
            <p className="ml-2 text-muted-foreground">Caricamento dati...</p>
          </div>
        ) : (
          <div className="h-[300px] w-full relative">
            {/* Chart visualization - simuliamo con gradiente per semplicità */}
            <div className="absolute inset-0 rounded-md overflow-hidden">
              <div 
                className={`h-full w-full ${priceInfo.isPositive ? 'bg-gradient-to-t from-green-100 to-transparent' : 'bg-gradient-to-t from-red-100 to-transparent'}`}
              ></div>
              
              {/* Linea del grafico usando SVG */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path 
                  d={`M0,${100 - ((data[0]?.value || 0) / (Math.max(...data.map(d => d.value)) * 0.8) * 100)} ${data.map((point, index) => {
                    const x = index / (data.length - 1) * 100;
                    const y = 100 - ((point.value / (Math.max(...data.map(d => d.value)) * 0.8)) * 100);
                    return `L${x},${y}`;
                  }).join(' ')} L100,100 L0,100 Z`}
                  fill={priceInfo.isPositive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}
                  stroke="none"
                />
                <path 
                  d={`M0,${100 - ((data[0]?.value || 0) / (Math.max(...data.map(d => d.value)) * 0.8) * 100)} ${data.map((point, index) => {
                    const x = index / (data.length - 1) * 100;
                    const y = 100 - ((point.value / (Math.max(...data.map(d => d.value)) * 0.8)) * 100);
                    return `L${x},${y}`;
                  }).join(' ')}`}
                  fill="none"
                  stroke={priceInfo.isPositive ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'}
                  strokeWidth="0.5"
                />
              </svg>
              
              {/* Etichette temporali */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted-foreground px-2">
                <span>{data[0]?.date}</span>
                <span>{data[Math.floor(data.length / 2)]?.date}</span>
                <span>{data[data.length - 1]?.date}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Funzione per visualizzare la bandiera del paese corrispondente
function Flag({ country, size = 24 }: { country: string, size?: number }) {
  const countryMap: Record<string, string> = {
    us: "🇺🇸",
    gb: "🇬🇧",
    it: "🇮🇹",
    de: "🇩🇪",
    fr: "🇫🇷",
    hk: "🇭🇰",
  };
  
  return (
    <span style={{ fontSize: `${size/16}rem` }}>{countryMap[country] || "🏳️"}</span>
  );
}

// Funzione per visualizzare variazioni di prezzo
function PriceChange({ change, changePercent }: { change: number, changePercent: number }) {
  const isPositive = change >= 0;
  
  return (
    <div className="flex items-center">
      <Badge variant={isPositive ? "outline" : "destructive"} className={`${isPositive ? "bg-green-100 text-green-800" : ""}`}>
        {isPositive ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
        {changePercent.toFixed(2)}%
      </Badge>
      <span className={`ml-2 ${isPositive ? "text-green-600" : "text-red-600"}`}>
        {isPositive ? "+" : ""}{change.toFixed(2)}
      </span>
    </div>
  );
}

// Componente per visualizzare un indice di mercato
const MarketIndexCard = ({ 
  index, 
  onClick 
}: { 
  index: MarketIndex, 
  onClick?: (symbol: string) => void 
}) => {
  return (
    <Card className="overflow-hidden cursor-pointer" onClick={() => onClick && onClick(index.symbol)}>
      <CardHeader className="pb-2">
        <div className="flex items-center">
          <div className="mr-2">
            <Flag country={index.country} size={20} />
          </div>
          <div>
            <CardTitle className="text-lg text-black">{index.name}</CardTitle>
            <CardDescription>{index.symbol}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div className="text-2xl font-bold">{index.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <PriceChange change={index.change} changePercent={index.changePercent} />
        </div>
      </CardContent>
    </Card>
  );
};

// Componente per visualizzare una notizia finanziaria
const NewsCard = ({ news }: { news: NewsItem }) => {
  // Formatta la data di pubblicazione
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { 
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="overflow-hidden mb-4">
      <div className="flex flex-col md:flex-row">
        {news.urlToImage && (
          <div className="md:w-1/4">
            <img 
              src={news.urlToImage} 
              alt={news.title} 
              className="h-full w-full object-cover" 
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://via.placeholder.com/150?text=No+Image';
              }}
            />
          </div>
        )}
        <div className={news.urlToImage ? "md:w-3/4 p-4" : "w-full p-4"}>
          <h3 className="text-lg font-semibold mb-2">{news.title}</h3>
          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{news.description}</p>
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-muted-foreground">
              {news.source.name} | {formatDate(news.publishedAt)}
            </span>
            <a 
              href={news.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center text-sm text-primary hover:underline"
            >
              Leggi <ArrowRight className="h-4 w-4 ml-1" />
            </a>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Componente per visualizzare un ticker azionario
const StockTickerCard = ({ 
  ticker, 
  onRemove,
  onClick
}: { 
  ticker: StockTicker, 
  onRemove: (symbol: string) => void,
  onClick?: (symbol: string) => void
}) => {
  return (
    <Card className="overflow-hidden cursor-pointer relative" onClick={() => onClick && onClick(ticker.symbol)}>
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute right-2 top-2 z-10" 
        onClick={(e) => {
          e.stopPropagation();
          onRemove(ticker.symbol);
        }}
      >
        <X className="h-4 w-4" />
      </Button>
      
      <CardHeader className="pb-2">
        <div className="flex items-center">
          <div className="mr-2">
            <span className="text-lg">🇺🇸</span>
          </div>
          <div>
            <CardTitle className="text-lg text-black">{ticker.name}</CardTitle>
            <CardDescription>{ticker.symbol}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div className="text-2xl font-bold">{ticker.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <PriceChange change={ticker.change} changePercent={ticker.changePercent} />
        </div>
      </CardContent>
    </Card>
  );
};

// Interfaccia per i suggerimenti ticker
interface TickerSuggestion {
  symbol: string;
  name: string;
}

// Timeframes per grafici
type TimeFrame = '1D' | '1W' | '1M' | '1Y' | '3Y' | '5Y' | '10Y';

// Default US stocks
const DEFAULT_US_STOCKS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA", "JPM", "V"
];

export default function MarketUpdate() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("indices");
  const [newTickerSymbol, setNewTickerSymbol] = useState("");
  const [userTickers, setUserTickers] = useState<string[]>(DEFAULT_US_STOCKS);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [tickerSuggestions, setTickerSuggestions] = useState<TickerSuggestion[]>([]);
  const [showCommandDialog, setShowCommandDialog] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeFrame>('1D');
  const [selectedIndex, setSelectedIndex] = useState<string>("^GSPC"); // S&P 500 come default
  const [selectedStock, setSelectedStock] = useState<string>(DEFAULT_US_STOCKS[0]);
  const suggestionsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Recupero dati degli indici principali
  const { 
    data: indicesData, 
    isLoading: indicesLoading, 
    isError: indicesError, 
    refetch: refetchIndices 
  } = useQuery({
    queryKey: ['/api/market/indices'],
    retry: 1
  });

  // Recupero delle notizie finanziarie
  const { 
    data: newsData, 
    isLoading: newsLoading, 
    isError: newsError, 
    refetch: refetchNews 
  } = useQuery<NewsItem[]>({
    queryKey: ['/api/market/news'],
    retry: 1
  });

  // Recupero dati per i ticker aggiunti dall'utente
  const { 
    data: tickersData, 
    isLoading: tickersLoading, 
    isError: tickersError, 
    refetch: refetchTickers 
  } = useQuery<StockTicker[]>({
    queryKey: ['/api/market/tickers', userTickers],
    enabled: userTickers.length > 0,
    queryFn: async () => {
      const response = await fetch(`/api/market/tickers?symbols=${userTickers.join(',')}`);
      if (!response.ok) {
        throw new Error('Errore nel recupero dei dati dei ticker');
      }
      return response.json();
    },
    retry: 1
  });
  
  // Query per i suggerimenti ticker
  const {
    data: suggestionsData,
    isLoading: suggestionsLoading,
    refetch: refetchSuggestions
  } = useQuery<TickerSuggestion[]>({
    queryKey: ['/api/market/ticker-suggestions', newTickerSymbol],
    enabled: false, // non eseguire automaticamente
    retry: 0
  });

  // Mutation per aggiungere un ticker
  const addTickerMutation = useMutation({
    mutationFn: (symbol: string) => {
      return fetch('/api/market/validate-ticker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol })
      }).then(res => {
        if (!res.ok) throw new Error("Invalid ticker symbol");
        return res.json();
      });
    },
    onSuccess: (data) => {
      const tickerSymbol = data.symbol || newTickerSymbol.toUpperCase();
      
      // Aggiungi il ticker alla lista dell'utente
      if (!userTickers.includes(tickerSymbol)) {
        const newTickers = [...userTickers, tickerSymbol];
        setUserTickers(newTickers);
        
        // Forza un refresh dei dati ticker
        setTimeout(() => {
          refetchTickers();
        }, 500);
      }
      setNewTickerSymbol("");
      toast({
        title: "Ticker aggiunto",
        description: `${tickerSymbol} è stato aggiunto alla tua lista.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Simbolo ticker non valido. Riprova.",
        variant: "destructive"
      });
    }
  });

  // Funzione per aggiungere un nuovo ticker
  const handleAddTicker = () => {
    if (!newTickerSymbol) return;
    addTickerMutation.mutate(newTickerSymbol);
  };

  // Funzione per rimuovere un ticker
  const handleRemoveTicker = (symbol: string) => {
    setUserTickers(userTickers.filter(ticker => ticker !== symbol));
    toast({
      title: "Ticker rimosso",
      description: `${symbol} è stato rimosso dalla tua lista.`,
    });
  };

  // Funzione per aggiornare tutti i dati
  const refreshAllData = () => {
    refetchIndices();
    refetchNews();
    if (userTickers.length > 0) {
      refetchTickers();
    }
    toast({
      title: "Dati aggiornati",
      description: "Tutti i dati di mercato sono stati aggiornati.",
    });
  };

  // Gestire il caricamento dei dati dagli stock
  const handleAddTickerKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTicker();
    }
  };

  // Funzione per gestire l'input del ticker e aggiornare i suggerimenti
  const handleTickerInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setNewTickerSymbol(value);
    
    // Cancella il timeout precedente se esiste
    if (suggestionsTimeoutRef.current) {
      clearTimeout(suggestionsTimeoutRef.current);
    }
    
    // Se l'input è vuoto, nascondi i suggerimenti
    if (!value || value.length < 2) {
      setShowSuggestions(false);
      setTickerSuggestions([]);
      return;
    }
    
    // Imposta un nuovo timeout per evitare troppe richieste durante la digitazione
    suggestionsTimeoutRef.current = setTimeout(async () => {
      // Esegui la query per ottenere i suggerimenti
      const response = await fetch(`/api/market/ticker-suggestions?q=${encodeURIComponent(value)}`);
      if (response.ok) {
        const data = await response.json();
        setTickerSuggestions(data);
        setShowSuggestions(data.length > 0);
      }
    }, 300);
  };
  
  // Funzione per selezionare un suggerimento
  const handleSelectSuggestion = (suggestion: TickerSuggestion) => {
    setNewTickerSymbol(suggestion.symbol);
    setShowSuggestions(false);
    
    // Opzionale: aggiungere immediatamente il ticker selezionato
    if (!userTickers.includes(suggestion.symbol)) {
      addTickerMutation.mutate(suggestion.symbol);
    }
  };

  // Utilizza i dati reali dall'API
  const indices: MarketIndex[] = indicesData as MarketIndex[] || [];
  
  // Aggiornamento automatico dei dati ogni 60 secondi
  useEffect(() => {
    // Primo aggiornamento immediato
    refreshAllData();
    
    // Aggiornamento periodico
    const interval = setInterval(() => {
      refreshAllData();
    }, 60000);
    
    // Pulizia quando il componente viene smontato
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-black">{t('market.title') || "Aggiornamento Mercati"}</h1>
        <Button 
          variant="outline" 
          className="flex items-center" 
          onClick={refreshAllData}
          disabled={indicesLoading || newsLoading || tickersLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${indicesLoading || newsLoading || tickersLoading ? 'animate-spin' : ''}`} />
          {t('market.refresh') || "Aggiorna Dati"}
        </Button>
      </div>

      {/* Command Dialog per la ricerca avanzata di ticker */}
      <CommandDialog open={showCommandDialog} onOpenChange={setShowCommandDialog}>
        <CommandInput 
          placeholder={t('market.search_tickers') || "Cerca ticker..."}
          value={newTickerSymbol}
          onValueChange={(value) => {
            setNewTickerSymbol(value);
            handleTickerInputChange({ target: { value } } as React.ChangeEvent<HTMLInputElement>);
          }}
        />
        <CommandList>
          <CommandEmpty>
            {t('market.no_suggestions') || "Nessun suggerimento trovato"}
          </CommandEmpty>
          <CommandGroup heading={t('market.suggestions') || "Suggerimenti"}>
            {tickerSuggestions.map((suggestion) => (
              <CommandItem
                key={suggestion.symbol}
                onSelect={() => handleSelectSuggestion(suggestion)}
                className="flex justify-between"
              >
                <span>{suggestion.symbol}</span>
                <span className="text-muted-foreground">{suggestion.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
      
      <Tabs defaultValue="indices" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="indices" className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{t('market.indices') || "Indici"}</span>
            <span className="sm:hidden">Indici</span>
          </TabsTrigger>
          <TabsTrigger value="stocks" className="flex items-center">
            <LineChart className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{t('market.stocks') || "Azioni"}</span>
            <span className="sm:hidden">Azioni</span>
          </TabsTrigger>
          <TabsTrigger value="news" className="flex items-center">
            <Newspaper className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{t('market.news') || "Notizie"}</span>
            <span className="sm:hidden">News</span>
          </TabsTrigger>
        </TabsList>

        {/* Scheda degli indici principali */}
        <TabsContent value="indices">
          <h2 className="text-2xl font-semibold mb-4 text-black">{t('market.main_indices') || "Indici Principali"}</h2>
          
          {/* Sezione grafico per l'indice selezionato */}
          {activeTab === "indices" && selectedIndex && (
            <div className="mb-6">
              <TimeframeSelector 
                selectedTimeframe={selectedTimeframe} 
                onChange={setSelectedTimeframe} 
              />
              
              <ChartComponent 
                symbol={selectedIndex}
                timeframe={selectedTimeframe}
                type="index"
              />
            </div>
          )}
          
          {indicesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="h-5 bg-muted rounded animate-pulse w-1/3 mb-2"></div>
                    <div className="h-4 bg-muted rounded animate-pulse w-1/4"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="h-7 bg-muted rounded animate-pulse w-1/4"></div>
                      <div className="h-5 bg-muted rounded animate-pulse w-1/6"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : indicesError ? (
            <Alert variant="destructive">
              <AlertTitle>Errore</AlertTitle>
              <AlertDescription>
                Si è verificato un errore durante il caricamento dei dati degli indici. Riprova più tardi.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {indices && indices.length > 0 ? (
                indices.map((index: MarketIndex) => (
                  <MarketIndexCard 
                    key={index.symbol} 
                    index={index} 
                    onClick={(symbol) => {
                      setSelectedIndex(symbol);
                    }}
                  />
                ))
              ) : (
                <div className="col-span-full">
                  <Card className="mb-6">
                    <CardContent className="flex flex-col items-center justify-center p-10">
                      <LineChart className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-xl font-semibold text-center mb-2 text-black">
                        {t('market.no_indices') || "Nessun indice disponibile"}
                      </p>
                      <p className="text-muted-foreground text-center mb-4">
                        {t('market.no_indices_message') || "Al momento non ci sono dati sugli indici disponibili. Riprova più tardi."}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Scheda dei ticker personalizzati */}
        <TabsContent value="stocks">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h2 className="text-2xl font-semibold text-black">{t('market.your_tickers') || "I Tuoi Ticker"}</h2>
            
            <div className="flex w-full md:w-auto gap-2">
              <div className="relative">
                <div className="flex">
                  <Input
                    placeholder={t('market.add_ticker_placeholder') || "Aggiungi ticker (es. AAPL)"}
                    value={newTickerSymbol}
                    onChange={handleTickerInputChange}
                    onKeyPress={handleAddTickerKeyPress}
                    className="max-w-xs rounded-r-none"
                    disabled={addTickerMutation.isPending}
                  />
                  <Button 
                    variant="outline" 
                    className="rounded-l-none border-l-0"
                    onClick={() => setShowCommandDialog(true)}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Lista di suggerimenti */}
                {showSuggestions && tickerSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-background rounded-md shadow-lg border">
                    <ul className="max-h-60 overflow-auto rounded-md py-1 text-base">
                      {tickerSuggestions.map((suggestion) => (
                        <li
                          key={suggestion.symbol}
                          className="cursor-pointer px-4 py-2 hover:bg-muted flex justify-between items-center"
                          onClick={() => handleSelectSuggestion(suggestion)}
                        >
                          <span className="font-medium">{suggestion.symbol}</span>
                          <span className="text-sm text-muted-foreground">{suggestion.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <Button 
                onClick={handleAddTicker} 
                disabled={!newTickerSymbol || addTickerMutation.isPending}
                className="whitespace-nowrap"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('market.add') || "Aggiungi"}
              </Button>
            </div>
          </div>

          {/* Sezione grafico per lo stock o indice selezionato */}
          {(activeTab === "stocks" && selectedStock) || (activeTab === "indices" && selectedIndex) ? (
            <div className="mb-6">
              <TimeframeSelector 
                selectedTimeframe={selectedTimeframe} 
                onChange={setSelectedTimeframe} 
              />
              
              <ChartComponent 
                symbol={activeTab === "stocks" ? selectedStock : selectedIndex}
                timeframe={selectedTimeframe}
                type={activeTab === "stocks" ? "stock" : "index"}
              />
            </div>
          ) : null}
          
          {userTickers.length === 0 ? (
            <Card className="mb-6">
              <CardContent className="flex flex-col items-center justify-center p-10">
                <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-xl font-semibold text-center mb-2 text-black">
                  {t('market.no_tickers') || "Nessun ticker aggiunto"}
                </p>
                <p className="text-muted-foreground text-center mb-4">
                  {t('market.add_tickers_message') || "Aggiungi i ticker delle azioni che desideri monitorare"}
                </p>
              </CardContent>
            </Card>
          ) : tickersLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <div className="h-5 bg-muted rounded animate-pulse w-1/3"></div>
                      <div className="h-4 w-4 bg-muted rounded-full animate-pulse"></div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="h-7 bg-muted rounded animate-pulse w-1/4"></div>
                      <div className="h-5 bg-muted rounded animate-pulse w-1/6"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : tickersError ? (
            <Alert variant="destructive">
              <AlertTitle>Errore</AlertTitle>
              <AlertDescription>
                Si è verificato un errore durante il caricamento dei dati dei ticker. Riprova più tardi.
              </AlertDescription>
            </Alert>
          ) : (
            <div>
              {tickersData && tickersData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tickersData.map((ticker) => (
                    <StockTickerCard 
                      key={ticker.symbol} 
                      ticker={ticker} 
                      onRemove={handleRemoveTicker}
                      onClick={(symbol) => {
                        setSelectedStock(symbol);
                        if (activeTab !== "stocks") {
                          setActiveTab("stocks");
                        }
                      }}
                    />
                  ))}
                </div>
              ) : (
                <Card className="mb-6">
                  <CardContent className="flex flex-col items-center justify-center p-10">
                    <LineChart className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-xl font-semibold text-center mb-2 text-black">
                      {t('market.no_ticker_data') || "Nessun dato disponibile"}
                    </p>
                    <p className="text-muted-foreground text-center mb-4">
                      {t('market.no_ticker_data_message') || "Non è stato possibile recuperare i dati per i ticker selezionati. Riprova più tardi."}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Scheda delle notizie finanziarie */}
        <TabsContent value="news">
          <h2 className="text-2xl font-semibold mb-4 text-black">{t('market.financial_news') || "Notizie Finanziarie"}</h2>
          
          {newsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden mb-4">
                  <div className="flex flex-col md:flex-row">
                    <div className="md:w-1/4 bg-muted h-40 animate-pulse"></div>
                    <div className="md:w-3/4 p-4">
                      <div className="h-6 bg-muted rounded animate-pulse w-3/4 mb-2"></div>
                      <div className="h-4 bg-muted rounded animate-pulse w-full mb-2"></div>
                      <div className="h-4 bg-muted rounded animate-pulse w-5/6 mb-4"></div>
                      <div className="flex justify-between items-center mt-2">
                        <div className="h-3 bg-muted rounded animate-pulse w-1/3"></div>
                        <div className="h-3 bg-muted rounded animate-pulse w-1/6"></div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : newsError ? (
            <Alert variant="destructive">
              <AlertTitle>Errore</AlertTitle>
              <AlertDescription>
                Si è verificato un errore durante il caricamento delle notizie. Riprova più tardi.
              </AlertDescription>
            </Alert>
          ) : (
            <div>
              {newsData && newsData.length > 0 ? (
                <div>
                  {newsData.map((news, i) => (
                    <NewsCard key={i} news={news} />
                  ))}
                </div>
              ) : (
                <Card className="mb-6">
                  <CardContent className="flex flex-col items-center justify-center p-10">
                    <Newspaper className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-xl font-semibold text-center mb-2">
                      {t('market.no_news') || "Nessuna notizia disponibile"}
                    </p>
                    <p className="text-muted-foreground text-center mb-4">
                      {t('market.no_news_message') || "Al momento non ci sono notizie disponibili. Riprova più tardi."}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}