# Guida all'implementazione del componente AI su AWS

## Problema riscontrato
Il componente AI non è visibile nell'ambiente di produzione AWS perché:
1. La cartella `/var/www/gervis/client/src/components/advisor` potrebbe non esistere 
2. Il file `AiClientProfile.tsx` non è presente in questa cartella
3. I file di traduzione mancano delle chiavi necessarie per il componente AI

## Soluzione da implementare

### 1. Creare la cartella advisor se non esiste
```bash
mkdir -p /var/www/gervis/client/src/components/advisor
```

### 2. Creare il file AiClientProfile.tsx
```bash
cat > /var/www/gervis/client/src/components/advisor/AiClientProfile.tsx << 'EOL'
import React, { useState, useEffect } from 'react';
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
```

### 3. Aggiungere le chiavi di traduzione necessarie

Per l'italiano:
```bash
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
  "content_not_formatted_correctly": "I dati non sono disponibili o non sono formattati correttamente. Premi 'Aggiorna' per rigenerare il profilo."
}
EOL
```

Per l'inglese:
```bash
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
  "content_not_formatted_correctly": "Data is not available or not formatted correctly. Press 'Refresh' to regenerate the profile."
}
EOL
```

### 4. Ricompilare l'applicazione
```bash
cd /var/www/gervis && npm run build
```

### 5. Riavviare i servizi
```bash
pm2 restart all
```

## Script in un unico comando

Puoi eseguire queste operazioni con un unico script:

```bash
#!/bin/bash
# Script per implementare il componente AI su AWS

echo "Implementazione del componente AI su AWS..."

# 1. Crea la cartella advisor se non esiste
mkdir -p /var/www/gervis/client/src/components/advisor

# 2. Crea il file AiClientProfile.tsx
cat > /var/www/gervis/client/src/components/advisor/AiClientProfile.tsx << 'EOL'
import React, { useState, useEffect } from 'react';
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

# 3. Aggiungi le chiavi di traduzione per l'italiano
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
  "content_not_formatted_correctly": "I dati non sono disponibili o non sono formattati correttamente. Premi 'Aggiorna' per rigenerare il profilo."
}
EOL

# 4. Aggiungi le chiavi di traduzione per l'inglese
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
  "content_not_formatted_correctly": "Data is not available or not formatted correctly. Press 'Refresh' to regenerate the profile."
}
EOL

# 5. Ricompila l'applicazione
cd /var/www/gervis
npm run build

# 6. Riavvia i servizi
pm2 restart all

echo "Implementazione completata! Il componente AI dovrebbe ora essere visibile."
```

Salva questo script come `deploy-ai-component.sh` sul server AWS, rendilo eseguibile con `chmod +x deploy-ai-component.sh` e poi eseguilo con `sudo ./deploy-ai-component.sh`.

## Verifica dell'implementazione
Dopo aver eseguito lo script, accedi all'applicazione con un account di consulente finanziario e naviga alla pagina dei dettagli di un cliente. Dovresti vedere la scheda "Profilo AI" con i pulsanti "Approfondimenti" e "Suggerimenti".