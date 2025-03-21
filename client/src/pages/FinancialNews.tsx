import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader, RefreshCcw, ArrowRight, ChevronRight, Mail, FileText, PieChart, AlertTriangle, ThumbsUp, ThumbsDown, Scale, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

// Interfaccia per le notizie finanziarie
interface FinancialNews {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  categories: string[];
  content?: string;
}

// Interfaccia per i risultati di analisi
interface NewsAnalysisResult {
  summary: string;
  keyTopics: string[];
  relevantInvestmentCategories: string[];
  marketImpact: 'positive' | 'negative' | 'neutral';
  confidenceScore: number;
  actionRecommendation: string;
}

// Interfaccia per le raccomandazioni ai clienti
interface ClientRecommendation {
  clientId: number;
  clientName: string;
  clientEmail: string;
  relevanceScore: number;
  newsId: string;
  newsTitle: string;
  analysisResult: NewsAnalysisResult;
  emailContent: string;
}

// Interfaccia per i risultati di analisi di massa
interface BulkAnalysisResult {
  newsId: string;
  newsTitle: string;
  newsSource: string;
  newsUrl: string;
  recommendationsCount: number;
  recommendations: ClientRecommendation[];
}

export default function FinancialNews() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<ClientRecommendation | null>(null);
  
  // Recupera tutte le notizie finanziarie
  const { data: newsData, isLoading: isLoadingNews, refetch: refetchNews } = useQuery<{ success: boolean; news: FinancialNews[] }>({
    queryKey: ['/api/financial-news'],
    refetchOnWindowFocus: false,
  });
  
  // Mutazione per l'analisi di una notizia specifica
  const analyzeNewsMutation = useMutation({
    mutationFn: (newsId: string) => {
      return apiRequest(`/api/financial-news/${newsId}/analysis`, {
        method: 'POST',
        body: JSON.stringify({ minimumRelevanceScore: 50 }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Analisi completata",
        description: "L'analisi della notizia è stata completata con successo."
      });
    },
    onError: (error) => {
      toast({
        title: "Errore nell'analisi",
        description: `Si è verificato un errore durante l'analisi: ${error}`,
        variant: "destructive"
      });
    }
  });
  
  // Mutazione per l'analisi di tutte le notizie
  const analyzeBulkMutation = useMutation({
    mutationFn: () => {
      return apiRequest('/api/financial-news/analysis-all', {
        method: 'POST',
        body: JSON.stringify({ 
          minimumRelevanceScore: 70,
          maxNewsToAnalyze: 5
        }),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Analisi di massa completata",
        description: `Analizzate ${data.totalNewsAnalyzed} notizie, trovate ${data.relevantNewsCount} notizie rilevanti.`
      });
    },
    onError: (error) => {
      toast({
        title: "Errore nell'analisi di massa",
        description: `Si è verificato un errore durante l'analisi: ${error}`,
        variant: "destructive"
      });
    }
  });
  
  // Funzione per formattare una data
  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
  
  // Componente per visualizzare una singola notizia
  function NewsCard({ news }: { news: FinancialNews }) {
    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex justify-between">
            <Badge variant="outline" className="mb-2">{news.source}</Badge>
            <Badge variant={
              news.publishedAt && new Date(news.publishedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000 
                ? "default" 
                : "secondary"
            }>
              {news.publishedAt ? formatDate(news.publishedAt) : "Data non disponibile"}
            </Badge>
          </div>
          <CardTitle className="text-lg font-semibold">{news.title}</CardTitle>
          <CardDescription className="line-clamp-2 mt-1">{news.description}</CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-between pt-0">
          <a 
            href={news.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-sm text-blue-500 hover:text-blue-700 flex items-center"
          >
            Leggi la notizia <ChevronRight className="h-4 w-4 ml-1" />
          </a>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setSelectedNewsId(news.id);
              analyzeNewsMutation.mutate(news.id);
            }}
            disabled={analyzeNewsMutation.isPending && selectedNewsId === news.id}
          >
            {analyzeNewsMutation.isPending && selectedNewsId === news.id ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Analisi in corso...
              </>
            ) : (
              <>
                <PieChart className="h-4 w-4 mr-2" />
                Analizza per i clienti
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  // Componente per visualizzare i risultati dell'analisi
  function AnalysisResults() {
    // Mostra messaggio di caricamento durante l'analisi
    if (analyzeNewsMutation.isPending) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader className="h-8 w-8 animate-spin mb-4 text-blue-500" />
          <p className="text-lg font-medium">Analisi in corso...</p>
          <p className="text-sm text-muted-foreground mt-2">
            Stiamo analizzando la notizia e trovando clienti rilevanti. Questo processo può richiedere fino a 30 secondi.
          </p>
        </div>
      );
    }
    
    // Mostra i risultati dell'analisi
    if (analyzeNewsMutation.data) {
      const { recommendations } = analyzeNewsMutation.data;
      
      // Se non ci sono raccomandazioni
      if (!recommendations || recommendations.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-8 w-8 mb-4 text-orange-500" />
            <p className="text-lg font-medium">Nessun cliente rilevante trovato</p>
            <p className="text-sm text-muted-foreground mt-2">
              Non abbiamo trovato clienti per cui questa notizia sia particolarmente rilevante.
              Prova a selezionare un'altra notizia o a modificare gli interessi dei tuoi clienti.
            </p>
          </div>
        );
      }
      
      // Mostra le raccomandazioni per i clienti
      return (
        <div className="py-4">
          <h3 className="text-lg font-semibold mb-4">Clienti potenzialmente interessati ({recommendations.length})</h3>
          
          {recommendations.map((recommendation) => (
            <Card key={recommendation.clientId} className="mb-4">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">{recommendation.clientName}</CardTitle>
                  <Badge variant={
                    recommendation.relevanceScore > 75 ? "default" : 
                    recommendation.relevanceScore > 50 ? "secondary" : "outline"
                  }>
                    Rilevanza: {recommendation.relevanceScore}%
                  </Badge>
                </div>
                <CardDescription>{recommendation.clientEmail}</CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="col-span-2 md:col-span-1">
                    <h4 className="text-sm font-medium">Argomenti chiave</h4>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {recommendation.analysisResult.keyTopics.map((topic, index) => (
                        <Badge key={index} variant="outline" className="text-xs">{topic}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <h4 className="text-sm font-medium">Categorie di investimento</h4>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {recommendation.analysisResult.relevantInvestmentCategories.map((category, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {category === 'retirement' ? 'Pensione' :
                           category === 'wealth_growth' ? 'Crescita patrimoniale' :
                           category === 'income_generation' ? 'Generazione reddito' :
                           category === 'capital_preservation' ? 'Conservazione capitale' :
                           category === 'estate_planning' ? 'Pianificazione patrimoniale' :
                           category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="bg-muted p-2 rounded text-sm mt-2">
                  <div className="flex items-center mb-1">
                    <h4 className="text-sm font-medium mr-2">Impatto di mercato:</h4>
                    {recommendation.analysisResult.marketImpact === 'positive' ? (
                      <Badge variant="default" className="bg-green-500"><ThumbsUp className="h-3 w-3 mr-1" /> Positivo</Badge>
                    ) : recommendation.analysisResult.marketImpact === 'negative' ? (
                      <Badge variant="destructive"><ThumbsDown className="h-3 w-3 mr-1" /> Negativo</Badge>
                    ) : (
                      <Badge variant="secondary"><Scale className="h-3 w-3 mr-1" /> Neutrale</Badge>
                    )}
                  </div>
                  <p className="text-xs">{recommendation.analysisResult.actionRecommendation}</p>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setSelectedRecommendation(recommendation)}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Visualizza email consigliata
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      );
    }
    
    // Stato predefinito quando non c'è ancora nessuna analisi
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <PieChart className="h-8 w-8 mb-4 text-blue-500" />
        <p className="text-lg font-medium">Seleziona una notizia da analizzare</p>
        <p className="text-sm text-muted-foreground mt-2">
          Clicca su "Analizza per i clienti" in una notizia per trovare i clienti
          per cui quella notizia potrebbe essere rilevante.
        </p>
      </div>
    );
  }
  
  // Componente per visualizzare i risultati dell'analisi di massa
  function BulkAnalysisResults() {
    // Mostra messaggio di caricamento durante l'analisi
    if (analyzeBulkMutation.isPending) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader className="h-8 w-8 animate-spin mb-4 text-blue-500" />
          <p className="text-lg font-medium">Analisi di massa in corso...</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-md text-center">
            Stiamo analizzando le notizie più recenti e trovando clienti rilevanti.
            Questo processo può richiedere fino a un minuto perché vengono analizzate multiple notizie.
          </p>
        </div>
      );
    }
    
    // Mostra i risultati dell'analisi di massa
    if (analyzeBulkMutation.data) {
      const { allRecommendations, totalNewsAnalyzed, relevantNewsCount } = analyzeBulkMutation.data;
      
      // Se non ci sono raccomandazioni
      if (!allRecommendations || allRecommendations.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-8 w-8 mb-4 text-orange-500" />
            <p className="text-lg font-medium">Nessuna correlazione rilevante trovata</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-md text-center">
              Abbiamo analizzato {totalNewsAnalyzed} notizie, ma non abbiamo trovato correlazioni
              significative con gli interessi dei tuoi clienti. Riprova più tardi quando saranno
              disponibili nuove notizie o modifica gli interessi dei clienti.
            </p>
          </div>
        );
      }
      
      // Mostra le raccomandazioni per tutte le notizie
      return (
        <div className="py-4">
          <div className="flex items-center mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold">Risultati dell'analisi di massa</h3>
              <p className="text-sm text-muted-foreground">Analizzate {totalNewsAnalyzed} notizie, trovate {relevantNewsCount} notizie rilevanti</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => analyzeBulkMutation.reset()}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Ricomincia
            </Button>
          </div>
          
          {allRecommendations.map((newsResult) => (
            <Card key={newsResult.newsId} className="mb-6">
              <CardHeader className="pb-3">
                <div className="flex justify-between">
                  <Badge variant="outline" className="mb-2">{newsResult.newsSource}</Badge>
                  <Badge variant="default">
                    {newsResult.recommendationsCount} client{newsResult.recommendationsCount !== 1 ? 'i' : 'e'}
                  </Badge>
                </div>
                <CardTitle className="text-base">{newsResult.newsTitle}</CardTitle>
                <CardDescription className="mt-1">
                  <a 
                    href={newsResult.newsUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-sm text-blue-500 hover:text-blue-700 flex items-center"
                  >
                    Leggi la notizia <ChevronRight className="h-4 w-4 ml-1" />
                  </a>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <h4 className="text-sm font-medium mb-2">Clienti potenzialmente interessati</h4>
                <div className="space-y-2">
                  {newsResult.recommendations.map((recommendation) => (
                    <div key={recommendation.clientId} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div>
                        <p className="font-medium">{recommendation.clientName}</p>
                        <p className="text-xs text-muted-foreground">{recommendation.clientEmail}</p>
                      </div>
                      <div className="flex items-center">
                        <Badge className="mr-2" variant={
                          recommendation.relevanceScore > 75 ? "default" : 
                          recommendation.relevanceScore > 50 ? "secondary" : "outline"
                        }>
                          {recommendation.relevanceScore}%
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedRecommendation(recommendation)}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }
    
    // Stato predefinito quando non c'è ancora nessuna analisi di massa
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <PieChart className="h-8 w-8 mb-4 text-blue-500" />
        <p className="text-lg font-medium">Analisi di massa non ancora avviata</p>
        <p className="text-sm text-muted-foreground mt-2 max-w-md text-center">
          Clicca su "Analizza tutte le notizie" per trovare automaticamente le correlazioni
          più rilevanti tra le notizie recenti e gli interessi dei tuoi clienti.
        </p>
        <Button 
          className="mt-4" 
          onClick={() => analyzeBulkMutation.mutate()}
          disabled={analyzeBulkMutation.isPending}
        >
          {analyzeBulkMutation.isPending ? (
            <>
              <Loader className="h-4 w-4 mr-2 animate-spin" />
              Analisi in corso...
            </>
          ) : (
            <>
              <PieChart className="h-4 w-4 mr-2" />
              Analizza tutte le notizie
            </>
          )}
        </Button>
      </div>
    );
  }
  
  // Dialogo per visualizzare l'email consigliata
  function EmailDialog() {
    if (!selectedRecommendation) return null;
    
    const { clientName, clientEmail, newsTitle, emailContent } = selectedRecommendation;
    
    return (
      <Dialog open={!!selectedRecommendation} onOpenChange={(open) => !open && setSelectedRecommendation(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Email consigliata per {clientName}</DialogTitle>
            <DialogDescription>
              Notizia: {newsTitle}
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-muted p-4 rounded-md">
            <div className="mb-2 space-y-1">
              <div><strong>A:</strong> {clientEmail}</div>
              <div><strong>Oggetto:</strong> Aggiornamento finanziario: {newsTitle}</div>
            </div>
            <Separator className="my-2" />
            <ScrollArea className="h-[300px] rounded-md">
              <div className="whitespace-pre-line p-2">
                {emailContent}
              </div>
            </ScrollArea>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSelectedRecommendation(null)}>
              Chiudi
            </Button>
            {/* Qui in futuro si potrebbe aggiungere la funzionalità per inviare l'email */}
            <Button>
              <Send className="h-4 w-4 mr-2" />
              Copia testo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  
  // Rendering principale
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">AI Assistant Finanziario</h1>
          <p className="text-muted-foreground">
            Analizza notizie finanziarie e trova informazioni rilevanti per i tuoi clienti
          </p>
        </div>
        <Button variant="outline" onClick={() => refetchNews()}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          Aggiorna notizie
        </Button>
      </div>
      
      <Alert className="mb-6">
        <AlertTitle>Come funziona l'assistente AI</AlertTitle>
        <AlertDescription>
          L'AI analizza le notizie finanziarie e le mette in relazione con gli interessi e i profili di investimento dei tuoi clienti.
          Puoi analizzare singole notizie o effettuare un'analisi di massa per trovare automaticamente le correlazioni più rilevanti.
        </AlertDescription>
      </Alert>
      
      <Tabs defaultValue="news">
        <TabsList className="mb-4">
          <TabsTrigger value="news">Notizie e Analisi</TabsTrigger>
          <TabsTrigger value="bulk">Analisi di Massa</TabsTrigger>
        </TabsList>
        
        <TabsContent value="news" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Notizie Finanziarie</h2>
              
              {isLoadingNews ? (
                <div className="flex items-center justify-center h-40">
                  <Loader className="h-6 w-6 animate-spin" />
                </div>
              ) : newsData?.news && newsData.news.length > 0 ? (
                <ScrollArea className="h-[70vh] pr-4">
                  {newsData.news.map((news) => (
                    <NewsCard key={news.id} news={news} />
                  ))}
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center h-40">
                  <p className="text-muted-foreground">Nessuna notizia disponibile al momento.</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => refetchNews()}>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Ricarica
                  </Button>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Analisi e Raccomandazioni</h2>
              <Card className="min-h-[70vh]">
                <CardContent className="pt-6">
                  <AnalysisResults />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="bulk" className="mt-0">
          <Card>
            <CardContent className="pt-6">
              <BulkAnalysisResults />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Dialogo per l'email */}
      <EmailDialog />
    </div>
  );
}