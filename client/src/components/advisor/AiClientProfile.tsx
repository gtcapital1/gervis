import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';
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
  const { t } = useTranslation();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Esegui la query per ottenere i dati del profilo arricchito
  const { data, isLoading, isError, error } = useQuery<{ success: boolean; data?: ProfileData }>({
    queryKey: ['/api/ai/client-profile', clientId, refreshTrigger],
    queryFn: async () => {
      const response = await fetch(`/api/ai/client-profile/${clientId}`);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    retry: 1,
  });

  // Funzione per aggiornare manualmente il profilo
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Funzione per formattare il testo con paragrafi
  const formatText = (text: string) => {
    if (!text) return null;
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
          <CardTitle>{t('ai_profile')}</CardTitle>
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
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('ai_profile')}</CardTitle>
          <CardDescription>{t('ai_profile_description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>{t('error')}</AlertTitle>
            <AlertDescription>
              {(error as Error)?.message || t('error_generating_profile')}
            </AlertDescription>
          </Alert>
          <div className="mt-4 text-right">
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCcw className="mr-2 h-4 w-4" />
              {t('refresh')}
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
          <CardTitle>{t('ai_profile')}</CardTitle>
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
            <Button onClick={handleRefresh} variant="outline" size="sm">
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
          <span>{t('ai_profile')}</span>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCcw className="mr-2 h-4 w-4" />
            {t('refresh')}
          </Button>
        </CardTitle>
        <CardDescription>{t('ai_profile_description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="insights">
          <TabsList className="mb-4">
            <TabsTrigger value="insights">{t('insights')}</TabsTrigger>
            <TabsTrigger value="suggestions">{t('suggestions')}</TabsTrigger>
          </TabsList>
          <TabsContent value="insights" className="space-y-2">
            {formatText(data.data.approfondimenti)}
          </TabsContent>
          <TabsContent value="suggestions" className="space-y-2">
            {formatText(data.data.suggerimenti)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}