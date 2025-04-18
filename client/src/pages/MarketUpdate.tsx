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
  Search,
  Globe,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
// Importazione per debug autenticazione
import { useAuth } from "@/hooks/use-auth";

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

// I componenti TimeframeSelector e ChartComponent sono stati rimossi

// Funzione per visualizzare la bandiera del paese corrispondente
function CountryFlag({ country, size = 24 }: { country: string, size?: number }) {
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
function PriceChange({ change, changePercent }: { change: number | null, changePercent: number | null }) {
  if (change === null || changePercent === null) return null;
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
            <CountryFlag country={index.country} size={20} />
          </div>
          <div>
            <CardTitle className="text-lg text-white">{index.name}</CardTitle>
            <CardDescription>{index.symbol}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div className="text-2xl font-bold">
    {index.dataUnavailable || index.price === null ? "N/A" : `${index.currency || ""}${index.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
  </div>
          {index.dataUnavailable ? <span className="text-muted-foreground">N/A</span> : <PriceChange change={index.change} changePercent={index.changePercent} />}
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
    <Card className="overflow-hidden mb-3">
      <div className="flex flex-col md:flex-row">
        {/* Rimossa l'immagine come richiesto dall'utente */}
        <div className="w-full p-3">
          <h3 className="text-md font-medium mb-1">{news.title}</h3>
          <p className="text-xs text-muted-foreground mb-1 line-clamp-1">{news.description}</p>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-muted-foreground">
              {news.source.name} | {formatDate(news.publishedAt)}
            </span>
            <a 
              href={news.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center text-xs text-primary hover:underline"
            >
              Leggi <ArrowRight className="h-3 w-3 ml-1" />
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
            <CardTitle className="text-lg text-white">{ticker.name}</CardTitle>
            <CardDescription>{ticker.symbol}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div className="text-2xl font-bold">
            {ticker.dataUnavailable || ticker.price === null ? 
              "N/A" : 
              `${ticker.currency || "$"}${ticker.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            }
          </div>
          {ticker.dataUnavailable ? 
            <span className="text-muted-foreground">N/A</span> : 
            <PriceChange change={ticker.change} changePercent={ticker.changePercent} />
          }
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
  // Hook per verifica stato autenticazione
  const { user, isLoading: authLoading } = useAuth();
  
  // Logging informazioni di debug quando montato
  useEffect(() => {
    
  }, [user]);
  
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("stocks");
  const [newTickerSymbol, setNewTickerSymbol] = useState("");
  const [userTickers, setUserTickers] = useState<string[]>(DEFAULT_US_STOCKS);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [tickerSuggestions, setTickerSuggestions] = useState<TickerSuggestion[]>([]);
  const [showCommandDialog, setShowCommandDialog] = useState(false);
  // Rimosso perché il grafico è stato eliminato
  // const [selectedTimeframe, setSelectedTimeframe] = useState<TimeFrame>('1D');
  const [selectedIndex, setSelectedIndex] = useState<string>("^GSPC"); // S&P 500 come default
  const [selectedStock, setSelectedStock] = useState<string>(DEFAULT_US_STOCKS[0]);
  const [newsFilter, setNewsFilter] = useState<'global' | 'italia'>('global');
  const suggestionsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Recupero dati degli indici principali
  const { 
    data: indicesData, 
    isLoading: indicesLoading, 
    isError: indicesError, 
    refetch: refetchIndices 
  } = useQuery({
    queryKey: ['/api/market/indices'],
    retry: 1,
    queryFn: async ({ queryKey }) => {
      try {
        const response = await fetch(`/api/market/indices?_t=${Date.now()}`);
        if (!response.ok) {
          throw new Error('Errore nel recupero degli indici di mercato');
        }
        return response.json();
      } catch (error) {
        
        throw error;
      }
    }
  });

  // Recupero delle notizie finanziarie
  const { 
    data: newsData, 
    isLoading: newsLoading, 
    isError: newsError, 
    refetch: refetchNews 
  } = useQuery<NewsItem[]>({
    queryKey: ['/api/market/news', newsFilter],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/market/news?filter=${newsFilter}&_t=${Date.now()}`);
        if (!response.ok) {
          throw new Error('Errore nel recupero delle notizie finanziarie');
        }
        return response.json();
      } catch (error) {
        
        throw error;
      }
    },
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
      try {
        const response = await fetch(`/api/market/tickers?symbols=${userTickers.join(',')}&_t=${Date.now()}`);
        if (!response.ok) {
          throw new Error('Errore nel recupero dei dati dei ticker');
        }
        return response.json();
      } catch (error) {
        
        throw error;
      }
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
    // Log di debug per monitorare lo stato dell'utente durante refresh dati
    
    
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
    if (autoRefreshEnabled) {
      refreshIntervalRef.current = setInterval(() => {
        refreshAllData();
      }, 60000); // 60 secondi
    }
    
    // Pulizia quando il componente viene smontato
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [autoRefreshEnabled]); // Si riattiva quando cambia l'impostazione di autoRefresh

  return (
    <div className="container py-6 px-6 md:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-black">{t('market.title') || "Aggiornamento Mercati"}</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center mr-2">
            <label className="text-sm mr-2 text-muted-foreground">
              {t('market.auto_refresh') || "Aggiornamento auto"}:
            </label>
            <div className="relative inline-flex items-center">
              <input
                type="checkbox"
                className="sr-only"
                checked={autoRefreshEnabled}
                onChange={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                id="auto-refresh-toggle"
              />
              <div
                className={`block w-10 h-6 rounded-full transition-colors ${autoRefreshEnabled ? 'bg-primary' : 'bg-gray-300'}`}
                onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              />
              <div
                className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${autoRefreshEnabled ? 'transform translate-x-4' : ''}`}
                onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              />
            </div>
          </div>
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
      
      <Tabs defaultValue="stocks" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="stocks" className="flex items-center">
            <LineChart className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{t('market.stocks') || "Azioni"}</span>
            <span className="sm:hidden">Azioni</span>
          </TabsTrigger>
          <TabsTrigger value="indices" className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{t('market.indices') || "Indici"}</span>
            <span className="sm:hidden">Indici</span>
          </TabsTrigger>
          <TabsTrigger value="news" className="flex items-center">
            <Newspaper className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{t('market.news') || "Notizie"}</span>
            <span className="sm:hidden">News</span>
          </TabsTrigger>
        </TabsList>

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
                  <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border p-2 max-h-60 overflow-y-auto">
                    {tickerSuggestions.map((suggestion) => (
                      <div 
                        key={suggestion.symbol} 
                        className="flex justify-between items-center p-2 hover:bg-gray-100 rounded cursor-pointer"
                        onClick={() => {
                          setNewTickerSymbol(suggestion.symbol);
                          setShowSuggestions(false);
                          handleAddTicker();
                        }}
                      >
                        <div>
                          <div className="font-medium">{suggestion.symbol}</div>
                          <div className="text-xs text-muted-foreground truncate">{suggestion.name}</div>
                        </div>
                        <Badge variant="outline">{suggestion.symbol}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <Button 
                variant="default" 
                className="flex items-center" 
                onClick={handleAddTicker}
                disabled={!newTickerSymbol || addTickerMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('market.add') || "Aggiungi"}
              </Button>
            </div>
          </div>
          
          {tickersLoading ? (
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

        {/* Scheda degli indici principali */}
        <TabsContent value="indices">
          <h2 className="text-2xl font-semibold mb-4 text-black">{t('market.main_indices') || "Indici Principali"}</h2>
          
          {/* Sezione grafico rimossa */}
          
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

        {/* Scheda delle notizie finanziarie */}
        <TabsContent value="news">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <h2 className="text-2xl font-semibold text-black">{t('market.financial_news') || "Notizie Finanziarie"}</h2>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filtra notizie:</span>
              <div className="flex rounded-md border overflow-hidden">
                <Button 
                  variant={newsFilter === 'global' ? "default" : "ghost"}
                  size="sm"
                  className={`rounded-none rounded-l-md ${newsFilter === 'global' ? 'text-white' : 'text-black'}`}
                  onClick={() => setNewsFilter('global')}
                >
                  <span className="mr-1">🌎</span>
                  Globali
                </Button>
                <Button 
                  variant={newsFilter === 'italia' ? "default" : "ghost"}
                  size="sm"
                  className={`rounded-none rounded-r-md ${newsFilter === 'italia' ? 'text-white' : 'text-black'}`}
                  onClick={() => setNewsFilter('italia')}
                >
                  <span className="mr-1">🇮🇹</span>
                  Italia
                </Button>
              </div>
            </div>
          </div>
          
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