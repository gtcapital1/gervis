import React, { useState, useEffect } from "react";
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
  Minus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

// Componente per visualizzare un indice di mercato
const MarketIndexCard = ({ index }: { index: MarketIndex }) => {
  const isPositive = index.change >= 0;
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">{index.name}</CardTitle>
          <Badge variant={isPositive ? "success" : "destructive"} className="ml-2">
            {isPositive ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
            {index.changePercent.toFixed(2)}%
          </Badge>
        </div>
        <CardDescription>{index.symbol}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div className="text-2xl font-bold">{index.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className={isPositive ? "text-green-600" : "text-red-600"}>
            {isPositive ? "+" : ""}{index.change.toFixed(2)}
          </div>
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
const StockTickerCard = ({ ticker, onRemove }: { ticker: StockTicker, onRemove: (symbol: string) => void }) => {
  const isPositive = ticker.change >= 0;
  
  return (
    <Card className="overflow-hidden mb-3">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg flex items-center">
              {ticker.name}
              <Badge variant="outline" className="ml-2">{ticker.symbol}</Badge>
            </CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onRemove(ticker.symbol)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div className="text-2xl font-bold">{ticker.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="flex items-center">
            <span className={isPositive ? "text-green-600 flex items-center" : "text-red-600 flex items-center"}>
              {isPositive ? <ArrowUpRight className="h-4 w-4 mr-1" /> : <ArrowDownRight className="h-4 w-4 mr-1" />}
              {isPositive ? "+" : ""}{ticker.change.toFixed(2)} ({ticker.changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function MarketUpdate() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("indices");
  const [newTickerSymbol, setNewTickerSymbol] = useState("");
  const [userTickers, setUserTickers] = useState<string[]>([]);

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
    retry: 1
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
      // Aggiungi il ticker alla lista dell'utente
      if (!userTickers.includes(newTickerSymbol.toUpperCase())) {
        setUserTickers([...userTickers, newTickerSymbol.toUpperCase()]);
      }
      setNewTickerSymbol("");
      toast({
        title: "Ticker aggiunto",
        description: `${newTickerSymbol.toUpperCase()} è stato aggiunto alla tua lista.`,
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

  // Esempio di indici principali per testing (sarà sostituito da dati reali dall'API)
  const mockIndices: MarketIndex[] = [
    { symbol: "^GSPC", name: "S&P 500", price: 5218.34, change: 23.45, changePercent: 0.45 },
    { symbol: "^DJI", name: "Dow Jones", price: 39258.70, change: -103.35, changePercent: -0.26 },
    { symbol: "^IXIC", name: "NASDAQ", price: 16340.87, change: 98.26, changePercent: 0.61 },
    { symbol: "^FTSE", name: "FTSE 100", price: 7930.96, change: 12.31, changePercent: 0.16 },
    { symbol: "^FTSEMIB", name: "FTSE MIB", price: 33746.24, change: -82.75, changePercent: -0.24 },
    { symbol: "^GDAXI", name: "DAX", price: 17721.22, change: 101.07, changePercent: 0.57 }
  ];

  // Questo codice sarà sostituito quando l'API sarà creata
  const indices = indicesData || mockIndices;
  
  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t('market.title') || "Aggiornamento Mercati"}</h1>
        <Button 
          variant="outline" 
          className="flex items-center" 
          onClick={refreshAllData}
          disabled={indicesLoading || newsLoading || tickersLoading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('market.refresh') || "Aggiorna Dati"}
        </Button>
      </div>

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
          <h2 className="text-2xl font-semibold mb-4">{t('market.main_indices') || "Indici Principali"}</h2>
          
          {indicesLoading ? (
            <div className="grid gap-4">
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
              {indices.map(index => (
                <MarketIndexCard key={index.symbol} index={index} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Scheda dei ticker personalizzati */}
        <TabsContent value="stocks">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h2 className="text-2xl font-semibold">{t('market.your_tickers') || "I Tuoi Ticker"}</h2>
            
            <div className="flex w-full md:w-auto gap-2">
              <Input
                placeholder={t('market.add_ticker_placeholder') || "Aggiungi ticker (es. AAPL)"}
                value={newTickerSymbol}
                onChange={(e) => setNewTickerSymbol(e.target.value.toUpperCase())}
                onKeyPress={handleAddTickerKeyPress}
                className="max-w-xs"
                disabled={addTickerMutation.isPending}
              />
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

          {userTickers.length === 0 ? (
            <Card className="mb-6">
              <CardContent className="flex flex-col items-center justify-center p-10">
                <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-xl font-semibold text-center mb-2">
                  {t('market.no_tickers') || "Nessun ticker aggiunto"}
                </p>
                <p className="text-muted-foreground text-center mb-4">
                  {t('market.add_tickers_message') || "Aggiungi i ticker delle azioni che desideri monitorare"}
                </p>
              </CardContent>
            </Card>
          ) : tickersLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden mb-3">
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
              {/* Per test: genera dati mock basati sui ticker utente */}
              {userTickers.map(symbol => {
                // Genera un prezzo casuale tra 10 e 1000
                const price = Math.random() * 990 + 10;
                // Genera una variazione casuale tra -5% e 5%
                const changePercent = (Math.random() * 10) - 5;
                const change = price * (changePercent / 100);
                
                const mockTicker: StockTicker = {
                  symbol,
                  name: symbol, // Idealmente qui ci sarebbe il nome completo dell'azienda
                  price,
                  change,
                  changePercent
                };
                
                return (
                  <StockTickerCard 
                    key={symbol} 
                    ticker={mockTicker} 
                    onRemove={handleRemoveTicker} 
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Scheda delle notizie finanziarie */}
        <TabsContent value="news">
          <h2 className="text-2xl font-semibold mb-4">{t('market.financial_news') || "Notizie Finanziarie"}</h2>
          
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
              {/* Per il test mostriamo mock data - sarà sostituita dai dati reali quando l'API sarà implementata */}
              <div>
                {[...Array(5)].map((_, i) => (
                  <NewsCard
                    key={i}
                    news={{
                      title: `Notizia finanziaria di esempio ${i + 1}`,
                      description: "Questa è una descrizione di esempio per una notizia finanziaria. I dettagli saranno sostituiti da dati reali provenienti da NewsAPI.",
                      url: "https://example.com",
                      urlToImage: i % 2 === 0 ? "https://via.placeholder.com/300x200?text=Financial+News" : "",
                      publishedAt: new Date().toISOString(),
                      source: {
                        name: "Fonte Finanziaria"
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}