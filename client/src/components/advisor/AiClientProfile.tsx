import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCcw, Brain, Sparkles } from 'lucide-react';
import { httpRequest } from '@/lib/queryClient';

interface AiClientProfileProps {
  clientId: number;
}

// Interfaccia per i dati di profilo arricchito
interface ProfileData {
  approfondimenti: string;
  suggerimenti: string;
}

export function AiClientProfile({ clientId }: AiClientProfileProps) {
  const { t } = useTranslation('client');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [profileRequested, setProfileRequested] = useState(false);

  // Esegui la query per ottenere i dati del profilo arricchito solo quando richiesto
  const { data, isLoading, isError, error, refetch } = useQuery<{ success: boolean; data?: ProfileData }>({
    queryKey: ['/api/ai/client-profile', clientId, refreshTrigger],
    queryFn: async () => {
      const response = await fetch(`/api/ai/client-profile/${clientId}`);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      console.log("AI Profile data:", result);
      return result;
    },
    retry: 1,
    enabled: profileRequested, // Non eseguire la query automaticamente
  });

  // Funzione per generare o aggiornare il profilo manualmente
  const handleGenerateProfile = () => {
    if (!profileRequested) {
      setProfileRequested(true);
    } else {
      setRefreshTrigger(prev => prev + 1);
      refetch();
    }
  };

  // Funzione per formattare il testo con paragrafi
  const formatText = (text: string | null | undefined) => {
    if (!text || typeof text !== 'string') return null;
    return text.split('\n').map((paragraph, index) => (
      <p key={index} className={index > 0 ? 'mt-2' : ''}>
        {paragraph}
      </p>
    ));
  };

  // Se sta caricando, mostra uno skeleton
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sigmund</CardTitle>
          <CardDescription>{t('ai_profile_description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Se c'è un errore, mostra un messaggio di errore
  if (isError) {
    // Estrai il messaggio di errore
    const errorMessage = (error as Error)?.message || t('error_generating_profile');
    const isQuotaError = errorMessage.includes("Credito OpenAI esaurito") || errorMessage.includes("quota");
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sigmund</CardTitle>
          <CardDescription>{t('ai_profile_description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>{isQuotaError ? t('quota_error_title') : t('error')}</AlertTitle>
            <AlertDescription>
              {isQuotaError ? t('quota_error_description') : errorMessage}
            </AlertDescription>
          </Alert>
          {!isQuotaError && (
            <div className="mt-4 text-right">
              <Button onClick={handleGenerateProfile} variant="outline" size="sm">
                <RefreshCcw className="mr-2 h-4 w-4" />
                {t('refresh')}
              </Button>
            </div>
          )}
          {isQuotaError && (
            <div className="mt-4 text-xs text-muted-foreground bg-amber-50 p-2 rounded-md border border-amber-200">
              <p className="font-semibold text-amber-700">{t('quota_error_help')}</p>
              <ol className="list-decimal ml-4 mt-1 text-amber-700">
                <li>Verifica il credito disponibile nel tuo account OpenAI</li>
                <li>Aggiorna il piano di fatturazione se necessario</li>
                <li>Oppure aggiorna la chiave API nelle impostazioni</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Se il profilo non è stato richiesto, mostra un messaggio per generarlo
  if (!profileRequested) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sigmund</CardTitle>
          <CardDescription>{t('ai_profile_description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-6">
            <Brain className="h-20 w-20 text-blue-300" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">
                {t('generate_profile_title')}
              </h3>
              <p className="text-muted-foreground max-w-md">
                {t('generate_profile_description')}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {t('token_usage_estimate')}
              </p>
            </div>
            <Button 
              onClick={handleGenerateProfile} 
              className="mt-4"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {t('generate_profile')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Se non ci sono dati o i dati non sono formattati correttamente
  if (!data?.data?.approfondimenti || !data?.data?.suggerimenti) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sigmund</CardTitle>
          <CardDescription>{t('ai_profile_description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTitle>{t('no_content_available')}</AlertTitle>
            <AlertDescription>
              {t('content_not_formatted_correctly')}
            </AlertDescription>
          </Alert>
          <div className="mt-4 text-right">
            <Button onClick={handleGenerateProfile} variant="outline" size="sm">
              <RefreshCcw className="mr-2 h-4 w-4" />
              {t('refresh')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Altrimenti, mostra il profilo arricchito
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Sigmund</span>
          <Button onClick={handleGenerateProfile} variant="outline" size="sm">
            <RefreshCcw className="mr-2 h-4 w-4" />
            {t('refresh')}
          </Button>
        </CardTitle>
        <CardDescription>{t('ai_profile_description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">{t('insights')}</h3>
          <div className="space-y-2">
            {formatText(data.data.approfondimenti)}
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">{t('suggestions')}</h3>
          <div className="space-y-2">
            {formatText(data.data.suggerimenti)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}