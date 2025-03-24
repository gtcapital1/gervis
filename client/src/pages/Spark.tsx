import React, { useState } from "react";
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
  Calendar, ExternalLink, Users, Link2 
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

interface InvestmentIdea {
  title: string;
  explanation: string;
  newsUrl: string;
  matchedClients: MatchedClient[];
}

interface InvestmentIdeasResponse {
  success: boolean;
  message: string;
  investmentIdeas: InvestmentIdea[];
}

export default function Spark() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [ideas, setIdeas] = useState<InvestmentIdea[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  
  // Funzione per ottenere il locale corretto per date-fns
  const getLocale = () => {
    return i18n.language === "it" ? it : enUS;
  };

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
      setTimeout(() => setIsGenerating(false), 500);
    },
    onError: () => {
      setIsGenerating(false);
    }
  });

  const handleGenerateIdeas = () => {
    generateMutation.mutate();
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("spark.title")}</h1>
          <p className="text-muted-foreground max-w-2xl mt-2">
            {t("spark.newDescription")}
          </p>
          {lastUpdate && (
            <p className="text-sm text-muted-foreground mt-1">
              {t("spark.lastUpdate")}: {lastUpdate}
            </p>
          )}
        </div>
        <Button 
          onClick={handleGenerateIdeas} 
          disabled={isGenerating}
          className="flex gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
          {t("spark.generateIdeas")}
        </Button>
      </div>

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
      ) : generateMutation.isError ? (
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
                          {idea.matchedClients.map((client, clientIndex) => (
                            <div key={clientIndex} className="border rounded-md p-3">
                              <div className="font-medium text-sm mb-1">
                                Client ID: {client.clientId}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {client.reason}
                              </div>
                            </div>
                          ))}
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
