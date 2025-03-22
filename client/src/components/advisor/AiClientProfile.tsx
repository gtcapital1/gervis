import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCcw, Bot, Sparkles, Brain, BrainCircuit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";

interface AiClientProfileProps {
  clientId: number;
}

interface ProfileEnrichment {
  approfondimenti: string;
  suggerimenti: string;
}

/**
 * Componente che mostra il profilo cliente arricchito con AI
 * Utilizza l'API OpenAI per generare approfondimenti e suggerimenti
 * basati sui log delle interazioni col cliente
 */
export function AiClientProfile({ clientId }: AiClientProfileProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // Query per caricare il profilo AI del cliente
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching
  } = useQuery<{ success: boolean; profile: ProfileEnrichment }>({
    queryKey: ['/api/ai/client-profile', clientId],
    queryFn: () => apiRequest(`/api/ai/client-profile/${clientId}`),
    enabled: !!clientId,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: 60 * 60 * 1000, // Cache per un'ora
  });

  // Funzione per formattare il testo con paragrafi
  const formatTextWithParagraphs = (text: string) => {
    if (!text) return "";
    const paragraphs = text.split('\n').filter(p => p.trim() !== '');
    return paragraphs.map((paragraph, index) => (
      <p key={index} className="mb-2">{paragraph}</p>
    ));
  };

  // Gestione errori
  const handleError = () => {
    if (isError) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Errore sconosciuto';
      
      if (errorMessage.includes('OpenAI') || errorMessage.includes('API')) {
        return (
          <div className="p-4 text-center">
            <BrainCircuit className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t("Configurazione API richiesta")}</h3>
            <p className="text-muted-foreground mb-4">
              {t("Per utilizzare questa funzionalità è necessario configurare l'API OpenAI nel file .env")}
            </p>
            <p className="text-sm text-muted-foreground/70">
              {t("Contatta l'amministratore di sistema per abilitare questa funzionalità.")}
            </p>
          </div>
        );
      }
      
      return (
        <div className="p-4 text-center">
          <Brain className="h-16 w-16 text-destructive/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t("Errore durante la generazione")}</h3>
          <p className="text-muted-foreground mb-2">
            {t("Non è stato possibile generare il profilo AI")}
          </p>
          <p className="text-sm text-destructive mb-4">
            {errorMessage}
          </p>
          <Button onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            {t("Riprova")}
          </Button>
        </div>
      );
    }
    return null;
  };

  // Skeleton loader
  const renderSkeletons = () => (
    <div className="space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );

  // Se c'è un errore, mostra il messaggio di errore appropriato
  if (isError) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bot className="mr-2 h-5 w-5" />
            {t("Profilo Cliente AI")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {handleError()}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Sparkles className="mr-2 h-5 w-5 text-purple-500" />
            {t("Profilo Cliente AI")}
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => refetch()} 
            disabled={isLoading || isRefetching}
          >
            <RefreshCcw className={`mr-2 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            {isRefetching ? t("Aggiornamento...") : t("Aggiorna")}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="insights" className="border-b">
            <AccordionTrigger className="text-lg font-medium">
              {t("Approfondimenti")}
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4 text-muted-foreground">
              {isLoading || isRefetching ? (
                renderSkeletons()
              ) : data?.profile?.approfondimenti ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {formatTextWithParagraphs(data.profile.approfondimenti)}
                </div>
              ) : (
                <p className="text-muted-foreground italic">
                  {t("Nessun approfondimento disponibile. Utilizza il pulsante 'Aggiorna' per generarli.")}
                </p>
              )}
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="suggestions">
            <AccordionTrigger className="text-lg font-medium">
              {t("Suggerimenti")}
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4 text-muted-foreground">
              {isLoading || isRefetching ? (
                renderSkeletons()
              ) : data?.profile?.suggerimenti ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {formatTextWithParagraphs(data.profile.suggerimenti)}
                </div>
              ) : (
                <p className="text-muted-foreground italic">
                  {t("Nessun suggerimento disponibile. Utilizza il pulsante 'Aggiorna' per generarli.")}
                </p>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        
        {!isLoading && !isRefetching && !data?.profile && (
          <div className="text-center py-6">
            <Bot className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t("Profilo AI non generato")}</h3>
            <p className="text-muted-foreground mb-4">
              {t("Genera il profilo AI per ottenere approfondimenti e suggerimenti basati sulle interazioni con il cliente.")}
            </p>
            <Button onClick={() => refetch()} disabled={isRefetching} className="bg-purple-600 hover:bg-purple-700">
              <Sparkles className="mr-2 h-4 w-4" />
              {t("Genera Profilo AI")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}