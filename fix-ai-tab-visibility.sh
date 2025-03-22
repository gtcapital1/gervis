#!/bin/bash
# Script per correggere la visibilità della scheda del profilo AI nell'interfaccia utente

echo "Inizio correzione della visibilità del tab AI..."

# 1. Verifica che la cartella advisor esista
echo "Verificando la cartella advisor..."
if [ ! -d "/var/www/gervis/client/src/components/advisor" ]; then
    echo "La cartella advisor non esiste, creazione in corso..."
    mkdir -p /var/www/gervis/client/src/components/advisor
    echo "Cartella advisor creata."
fi

# 2. Verifica che il file AiClientProfile.tsx esista
echo "Verificando il file AiClientProfile.tsx..."
if [ ! -f "/var/www/gervis/client/src/components/advisor/AiClientProfile.tsx" ]; then
    echo "File AiClientProfile.tsx mancante, creazione in corso..."
    cat > /var/www/gervis/client/src/components/advisor/AiClientProfile.tsx << 'EOL'
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';

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
EOL
    echo "File AiClientProfile.tsx creato."
fi

# 3. Verifica e aggiorna il file di traduzione italiano
echo "Aggiornando il file di traduzione italiano..."
cat > /var/www/gervis/client/src/i18n/locales/it/client.json << 'EOL'
{
  "ai_profile": "Profilo AI",
  "ai_profile_description": "Approfondimenti e suggerimenti generati dall'intelligenza artificiale basati sui dati del cliente",
  "insights": "Approfondimenti",
  "suggestions": "Suggerimenti",
  "refresh": "Aggiorna",
  "error": "Errore",
  "error_generating_profile": "Si è verificato un errore durante la generazione del profilo AI",
  "no_content_available": "Nessun contenuto disponibile",
  "content_not_formatted_correctly": "I dati non sono disponibili o non sono formattati correttamente. Premi 'Aggiorna' per rigenerare il profilo.",
  "complete_onboarding_first": "Completa il processo di onboarding",
  "ai_profile_requires_onboarding": "Il profilo AI richiede che il cliente abbia completato il processo di onboarding per generare approfondimenti basati sui dati raccolti."
}
EOL

# 4. Verifica e aggiorna il file di traduzione inglese
echo "Aggiornando il file di traduzione inglese..."
cat > /var/www/gervis/client/src/i18n/locales/en/client.json << 'EOL'
{
  "ai_profile": "AI Profile",
  "ai_profile_description": "AI-generated insights and suggestions based on client data",
  "insights": "Insights",
  "suggestions": "Suggestions",
  "refresh": "Refresh",
  "error": "Error",
  "error_generating_profile": "An error occurred while generating the AI profile",
  "no_content_available": "No content available",
  "content_not_formatted_correctly": "Data is not available or not formatted correctly. Press 'Refresh' to regenerate the profile.",
  "complete_onboarding_first": "Complete the onboarding process",
  "ai_profile_requires_onboarding": "The AI profile requires that the client has completed the onboarding process to generate insights based on the collected data."
}
EOL

# 5. Ricompilare l'applicazione
echo "Ricompilazione dell'applicazione in corso..."
cd /var/www/gervis
npm run build
echo "Applicazione ricompilata."

# 6. Riavviare i servizi
echo "Riavvio dei servizi in corso..."
pm2 restart all
echo "Servizi riavviati."

echo "Correzione della visibilità del tab AI completata! Il componente dovrebbe ora essere visibile nella pagina di dettaglio del cliente."