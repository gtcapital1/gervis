import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Newspaper, 
  ArrowRight, 
  Calendar,
  Clock,
  Bookmark,
  Share2,
  ExternalLink,
  TrendingUp,
  Globe
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";

interface NewsItem {
  title: string;
  description: string;
  url: string;
  urlToImage: string;
  publishedAt: string;
  source: {
    name: string;
    domain?: string;
  };
  author?: string;
  content?: string;
}

// Componente per visualizzare una notizia finanziaria con design moderno
const NewsCard = ({ news, index }: { news: NewsItem; index: number }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Formatta la data di pubblicazione
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { 
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  // Formatta l'ora di pubblicazione
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('it-IT', { 
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Placeholder per immagine non disponibile
  const placeholderImage = "https://via.placeholder.com/800x450?text=Notizia+Finanziaria";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card 
        className="overflow-hidden mb-6 transition-all duration-200 hover:shadow-lg"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 h-full">
          {/* Immagine (se disponibile) */}
          <div className="md:col-span-1 bg-muted h-48 md:h-full overflow-hidden">
            <div className="h-full w-full relative">
              <img 
                src={news.urlToImage || placeholderImage} 
                alt={news.title}
                className={`w-full h-full object-cover transition-transform duration-500 ${isHovered ? 'scale-105' : 'scale-100'}`}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = placeholderImage;
                }}
              />
              <div className="absolute bottom-0 left-0 p-2">
                <Badge className="bg-primary/80 hover:bg-primary">{news.source.name}</Badge>
              </div>
            </div>
          </div>
          
          {/* Contenuto */}
          <div className="md:col-span-2 p-4 flex flex-col justify-between h-full">
            <div>
              <h3 className="text-lg font-semibold mb-2 line-clamp-2">{news.title}</h3>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{news.description}</p>
            </div>
            
            <div className="mt-4">
              <div className="flex items-center justify-between flex-wrap">
                <div className="flex items-center space-x-4 text-xs text-muted-foreground mb-2">
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    <span>{formatDate(news.publishedAt)}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>{formatTime(news.publishedAt)}</span>
                  </div>
                  {news.author && (
                    <div className="hidden md:flex items-center">
                      <span className="font-medium">{news.author.substring(0, 20)}{news.author.length > 20 ? '...' : ''}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-1">
            <a 
              href={news.url} 
              target="_blank" 
              rel="noopener noreferrer" 
                    className="flex items-center p-2 text-xs font-medium bg-primary text-white rounded-md hover:bg-primary/80 transition-colors"
            >
                    Leggi <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </div>
        </div>
      </div>
          </div>
        </div>
    </Card>
    </motion.div>
  );
};

export default function MarketUpdate() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [newsView, setNewsView] = useState<'grid' | 'list'>('list');

  // Fetch financial news
  const { 
    data: newsData, 
    isLoading: newsLoading, 
    error: newsError,
    refetch: refetchNews 
  } = useQuery({
    queryKey: ['financial_news'],
    queryFn: async () => {
      const response = await fetch(`/api/market/news`);
        if (!response.ok) {
        throw new Error('Failed to fetch news');
      }
      return response.json() as Promise<NewsItem[]>;
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return (
    <div className="container px-4 py-8 mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-black">
              {t('market.financial_news') || "Notizie Finanziarie"}
            </h1>
            <p className="text-muted-foreground mt-2">
              Le ultime notizie dal mondo dell'economia e della finanza
            </p>
          </div>
          
          <div className="flex items-center">
            {/* Selezione vista */}
            <div className="flex items-center space-x-0">
          <Button 
                variant={newsView === 'grid' ? "default" : "outline"} 
                size="sm" 
                onClick={() => setNewsView('grid')}
                className="rounded-l-md rounded-r-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><rect width="7" height="7" x="3" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="14" rx="1"></rect><rect width="7" height="7" x="3" y="14" rx="1"></rect></svg>
                Griglia
                  </Button>
              <Button 
                variant={newsView === 'list' ? "default" : "outline"} 
                size="sm" 
                onClick={() => setNewsView('list')}
                className="rounded-l-none rounded-r-md"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><line x1="8" x2="21" y1="6" y2="6"></line><line x1="8" x2="21" y1="12" y2="12"></line><line x1="8" x2="21" y1="18" y2="18"></line><line x1="3" x2="3.01" y1="6" y2="6"></line><line x1="3" x2="3.01" y1="12" y2="12"></line><line x1="3" x2="3.01" y1="18" y2="18"></line></svg>
                Lista
              </Button>
            </div>
          </div>
            </div>
            </div>
          
      {/* Notizie finanziarie */}
      <div>
        {newsLoading ? (
          <div className={`grid grid-cols-1 ${newsView === 'grid' ? 'md:grid-cols-2 lg:grid-cols-2' : ''} gap-6`}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="overflow-hidden">
                <div className="h-48 bg-muted animate-pulse"></div>
                <CardContent className="p-4">
                  <div className="h-6 bg-muted rounded animate-pulse w-3/4 mb-4"></div>
                  <div className="h-4 bg-muted rounded animate-pulse w-full mb-2"></div>
                  <div className="h-4 bg-muted rounded animate-pulse w-full mb-2"></div>
                  <div className="h-4 bg-muted rounded animate-pulse w-2/3 mb-4"></div>
                  <div className="flex justify-between items-center mt-4">
                    <div className="h-3 bg-muted rounded animate-pulse w-1/3"></div>
                    <div className="h-8 bg-muted rounded animate-pulse w-20"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : newsError ? (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><circle cx="12" cy="12" r="10"></circle><line x1="12" x2="12" y1="8" y2="12"></line><line x1="12" x2="12.01" y1="16" y2="16"></line></svg>
              Errore
            </AlertTitle>
              <AlertDescription>
              Si è verificato un errore durante il caricamento delle notizie. Riprova più tardi o controlla la tua connessione.
              </AlertDescription>
            </Alert>
          ) : (
          <>
              {newsData && newsData.length > 0 ? (
              <div className={`grid grid-cols-1 ${newsView === 'grid' ? 'md:grid-cols-2 lg:grid-cols-2' : ''} gap-6`}>
                  {newsData.map((news, i) => (
                  <NewsCard key={i} news={news} index={i} />
                  ))}
                </div>
              ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="mb-6 border border-dashed">
                  <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                    <div className="rounded-full bg-muted p-4 mb-4">
                      <Newspaper className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-xl mb-2">
                      {t('market.no_news') || "Nessuna notizia disponibile"}
                    </CardTitle>
                    <CardDescription className="text-center max-w-md mb-6">
                      {t('market.no_news_message') || "Al momento non ci sono notizie disponibili. Riprova più tardi o amplia i tuoi filtri di ricerca."}
                    </CardDescription>
                    <Button onClick={() => refetchNews()} variant="outline" className="gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M3 21v-5h5"></path></svg>
                      Aggiorna
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </>
              )}
            </div>
    </div>
  );
}