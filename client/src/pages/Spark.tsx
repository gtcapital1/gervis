import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Card, CardHeader, CardTitle, CardDescription, 
  CardContent, CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Alert, AlertTitle, AlertDescription 
} from "@/components/ui/alert";
import { 
  RefreshCw, AlertTriangle, 
  Calendar, ExternalLink, Users, Link2, Cpu, Code
} from "lucide-react";
import { 
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { it, enUS } from "date-fns/locale";

// Interfaces for the investment ideas API
interface MatchedClient {
  clientId: number;
  reason: string;
}

interface Client {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

interface InvestmentIdea {
  title: string;
  explanation: string;
  newsUrl: string;
  matchedClients: MatchedClient[];
}

interface TokensUsed {
  total: number;
  prompt: number;
  completion: number;
}

interface InvestmentIdeasResponse {
  success: boolean;
  message: string;
  investmentIdeas: InvestmentIdea[];
  tokensUsed?: TokensUsed;
}

// Interfaccia per la risposta dell'endpoint di debug del prompt
interface PromptDebugResponse {
  success: boolean;
  prompt: string;
  promptLength: number;
  estimatedTokens: number;
}

export default function Spark() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [ideas, setIdeas] = useState<InvestmentIdea[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [tokensUsed, setTokensUsed] = useState<TokensUsed | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [promptData, setPromptData] = useState<PromptDebugResponse | null>(null);
  const [clientsData, setClientsData] = useState<Record<number, Client>>({});
  
  // Funzione per ottenere il locale corretto per date-fns
  const getLocale = () => {
    return i18n.language === "it" ? it : enUS;
  };

  // Query per ottenere i dati dell'utente corrente
  const { data: userData } = useQuery({
    queryKey: ["/api/user"],
    refetchOnWindowFocus: false
  });
  
  // Query per ottenere i dati dei clienti 
  const { data: clientsList } = useQuery({
    queryKey: ["/api/clients"],
    refetchOnWindowFocus: false
  });
  
  // Effect per popolare l'oggetto clientsData con i dati dei clienti
  useEffect(() => {
    if (clientsList?.clients && Array.isArray(clientsList.clients)) {
      const clientsMap: Record<number, Client> = {};
      clientsList.clients.forEach((client: Client) => {
        clientsMap[client.id] = client;
      });
      setClientsData(clientsMap);
    }
  }, [clientsList]);
  
  // Mutazione per generare nuove idee di investimento
  const generateMutation = useMutation({
    mutationFn: () => apiRequest("/api/ideas/generate", { method: "POST" }),
    onMutate: () => {
      setIsGenerating(true);
    },
    onSuccess: (data: InvestmentIdeasResponse) => {
      setIdeas(data.investmentIdeas);
      setLastUpdate(formatDistanceToNow(new Date(), { 
        addSuffix: true,
        locale: getLocale()
      }));
      setTokensUsed(data.tokensUsed || null);
      setTimeout(() => setIsGenerating(false), 500);
    },
    onError: (error: any) => {
      setIsGenerating(false);
      // Salva il messaggio di errore per visualizzarlo nell'UI
      setErrorMessage(error?.message || "Si è verificato un errore imprevisto durante la generazione delle idee di investimento.");
    },
    onSettled: (data, error) => {
      // Nasconde l'errore automaticamente dopo 20 secondi
      if (error) {
        setTimeout(() => setErrorMessage(null), 20000);
      }
    }
  });

  const handleGenerateIdeas = () => {
    generateMutation.mutate();
  };
  
  // Funzione per caricare il prompt di debug
  const loadPromptDebug = async () => {
    setIsLoadingPrompt(true);
    try {
      const response = await apiRequest("/api/ideas/prompt-debug");
      setPromptData(response as PromptDebugResponse);
      setShowPrompt(true);
    } catch (error) {
      
      setErrorMessage("Errore nel caricamento del prompt di debug.");
    } finally {
      setIsLoadingPrompt(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">{t("spark.title")}</h1>
          <p className="text-muted-foreground max-w-2xl mt-2">
            {t("spark.newDescription")}
          </p>
          {lastUpdate && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {t("spark.lastUpdate")}: {lastUpdate}
              </p>
              {tokensUsed && (
                <p className="text-xs text-muted-foreground">
                  <Cpu className="h-3 w-3 inline-block mr-1" /> 
                  Token: {tokensUsed.total} 
                  <span className="mx-1">•</span>
                  <span className="text-primary">{t("spark.promptTokens")}: {tokensUsed.prompt}</span>
                  <span className="mx-1">•</span>
                  <span className="text-green-500">{t("spark.completionTokens")}: {tokensUsed.completion}</span>
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {/* Il pulsante Debug è visibile solo per l'utente gianmarco.trapasso@gmail.com */}
          {userData?.user?.email === "gianmarco.trapasso@gmail.com" && (
            <Button 
              onClick={loadPromptDebug}
              disabled={isLoadingPrompt}
              variant="outline"
              className="flex gap-2"
              title="Visualizza il prompt di debugging"
            >
              <Code className={`h-4 w-4 ${isLoadingPrompt ? "animate-spin" : ""}`} />
              Debug
            </Button>
          )}
          <Button 
            onClick={handleGenerateIdeas} 
            disabled={isGenerating}
            className="flex gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
            {t("spark.generateIdeas")}
          </Button>
        </div>
      </div>

      {/* Messaggio di errore specifico di token, se presente */}
      {errorMessage && (
        <Alert variant="destructive" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("spark.tokenErrorTitle")}</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{errorMessage}</p>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setErrorMessage(null)}
              >
                {t("spark.tokenErrorClose")}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Sezione di debug del prompt */}
      {showPrompt && promptData && (
        <Card className="mt-6">
          <CardHeader className="pb-2">
            <div className="flex justify-between">
              <CardTitle className="text-black">Debug Prompt</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowPrompt(false)}
              >
                Chiudi
              </Button>
            </div>
            <CardDescription>
              <p className="text-black">Lunghezza totale: {promptData.promptLength} caratteri</p>
              <p className="text-black">Token stimati: {promptData.estimatedTokens}</p>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-white p-4 rounded-md overflow-auto max-h-[500px] border border-gray-200">
              <pre className="text-xs whitespace-pre-wrap text-black">{promptData.prompt}</pre>
            </div>
          </CardContent>
        </Card>
      )}

      {isGenerating ? (
        <div className="space-y-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-2/3 mb-2" />
                <Skeleton className="h-3 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full mb-4" />
                <Skeleton className="h-4 w-1/3 mb-2" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : generateMutation.isError && !errorMessage ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("spark.errorTitle")}</AlertTitle>
          <AlertDescription>
            {t("spark.errorGeneratingIdeas")}
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateIdeas}
              className="ml-2"
            >
              {t("spark.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : ideas.length === 0 ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("spark.noIdeasTitle")}</AlertTitle>
          <AlertDescription>
            {t("spark.noIdeasDescription")}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6">
          {ideas.map((idea, index) => (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl leading-tight">
                    {idea.title}
                  </CardTitle>
                </div>
                <CardDescription className="flex items-center gap-1 text-xs mt-1">
                  <Calendar className="h-3 w-3" />
                  {new Date().toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">
                  {idea.explanation}
                </p>
                
                <div className="flex items-center gap-2 mt-2 mb-4 text-sm">
                  <Link2 className="h-4 w-4 text-primary" />
                  <a 
                    href={idea.newsUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    {t("spark.sourceArticle")}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">
                      {t("spark.matchedClients")} ({idea.matchedClients.length})
                    </span>
                  </div>
                  
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="clients">
                      <AccordionTrigger className="text-sm py-2">
                        {t("spark.showClients")}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          {idea.matchedClients.map((client, clientIndex) => {
                            // Trova il nome del cliente dal clientId
                            const clientId = client.clientId;
                            const clientData = clientsData[clientId];
                            const clientName = clientData 
                              ? `${clientData.firstName} ${clientData.lastName}`
                              : `Cliente ${clientId}`;
                            
                            return (
                              <div key={clientIndex} className="border rounded-md p-3">
                                <div className="font-medium text-sm mb-1 text-white">
                                  {clientName}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {client.reason}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
