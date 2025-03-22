#!/bin/bash
# Script per correggere l'errore "Unexpected token '<', "<!doctype "... is not valid JSON"
# negli endpoint AI su AWS

echo "Inizio correzione dell'endpoint AI che restituisce HTML invece di JSON..."

# 1. Verifica che l'endpoint API funzioni correttamente
echo "Verifica dell'endpoint API AI..."

# Controlla se la chiave API è configurata
if ! grep -q "OPENAI_API_KEY" /var/www/gervis/.env; then
  echo "⚠️ ATTENZIONE: La chiave API OpenAI (OPENAI_API_KEY) non sembra essere configurata nel file .env"
  echo "Aggiungi la chiave API nel file .env e riavvia l'applicazione."
  exit 1
fi

# Modifica il file AiClientProfile.tsx per usare la libreria axios con gestione errori migliorata
echo "Modificando il componente AiClientProfile per migliorare la gestione degli errori..."

cat > /var/www/gervis/client/src/components/advisor/AiClientProfile.tsx << 'EOL'
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCcw, Link2, KeyRound } from 'lucide-react';
import axios from 'axios';

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
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [debugResponse, setDebugResponse] = useState<string>("");

  // Esegui la query per ottenere i dati del profilo arricchito
  const { data, isLoading, isError, error } = useQuery<{ success: boolean; data?: ProfileData }>({
    queryKey: ['/api/ai/client-profile', clientId, refreshTrigger],
    queryFn: async () => {
      try {
        console.log(`[AI Debug] Richiesta profilo per cliente ${clientId}`);
        // Utilizziamo axios che ha una migliore gestione degli errori
        const timestamp = new Date().getTime(); // Anti-cache
        const response = await axios.get(`/api/ai/client-profile/${clientId}?_t=${timestamp}`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        console.log(`[AI Debug] Risposta ricevuta`, response.data);
        return response.data;
      } catch (err) {
        // Gestione dettagliata dell'errore
        if (axios.isAxiosError(err)) {
          if (err.response) {
            // Il server ha risposto con un codice di errore
            const responseData = err.response.data;
            const responseType = err.response.headers['content-type'] || '';
            
            // Log dettagliati per debug
            console.error(`[AI Debug] Errore API (${err.response.status}):`, {
              status: err.response.status,
              statusText: err.response.statusText,
              contentType: responseType
            });

            // Se è HTML, lo registriamo per debug
            if (responseType.includes('text/html')) {
              setDebugResponse(typeof responseData === 'string' ? responseData.substring(0, 300) + '...' : 'Risposta HTML non testuale');
              throw new Error(`Il server ha restituito HTML invece di JSON (status ${err.response.status}). Possibile errore di autenticazione o server.`);
            }
            
            // Errore JSON standard
            const errorMessage = responseData?.message || err.response.statusText;
            throw new Error(`Errore ${err.response.status}: ${errorMessage}`);
          } else if (err.request) {
            // Nessuna risposta ricevuta
            console.error('[AI Debug] Nessuna risposta dal server:', err.request);
            throw new Error('Nessuna risposta dal server. Verifica la connessione di rete.');
          } else {
            // Errore di configurazione
            console.error('[AI Debug] Errore di configurazione axios:', err.message);
            throw new Error(`Errore di configurazione: ${err.message}`);
          }
        } else {
          // Errore non Axios
          console.error('[AI Debug] Errore non-Axios:', err);
          throw err;
        }
      }
    },
    retry: 1,
  });

  // Funzione per aggiornare manualmente il profilo
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Funzione per mostrare/nascondere info di debug
  const toggleDebugInfo = () => {
    setShowDebugInfo(prev => !prev);
  };

  // Test dell'endpoint di status AI
  const testAiStatus = async () => {
    try {
      const timestamp = new Date().getTime();
      const response = await axios.get(`/api/ai/debug-status?_t=${timestamp}`);
      console.log('[AI Debug] Test status:', response.data);
      setDebugResponse(JSON.stringify(response.data, null, 2));
      setShowDebugInfo(true);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setDebugResponse(`Errore ${err.response.status}: ${JSON.stringify(err.response.data)}`);
      } else {
        setDebugResponse(`Errore sconosciuto: ${err}`);
      }
      setShowDebugInfo(true);
    }
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
          <CardTitle className="flex justify-between items-center">
            <span>{t('ai_profile')}</span>
            <div className="flex space-x-2">
              <Button onClick={toggleDebugInfo} variant="outline" size="sm">
                <Link2 className="mr-2 h-4 w-4" />
                {showDebugInfo ? t('hide_debug') : t('show_debug')}
              </Button>
              <Button onClick={testAiStatus} variant="outline" size="sm">
                <KeyRound className="mr-2 h-4 w-4" />
                {t('test_api')}
              </Button>
            </div>
          </CardTitle>
          <CardDescription>{t('ai_profile_description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>{t('error')}</AlertTitle>
            <AlertDescription>
              {(error as Error)?.message || t('error_generating_profile')}
            </AlertDescription>
          </Alert>
          
          {showDebugInfo && debugResponse && (
            <div className="mt-4 p-3 bg-slate-100 rounded-md overflow-x-auto text-xs">
              <h4 className="font-medium mb-1">Debug Info:</h4>
              <pre className="whitespace-pre-wrap break-words">{debugResponse}</pre>
            </div>
          )}
          
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
          <CardTitle className="flex justify-between items-center">
            <span>{t('ai_profile')}</span>
            <div className="flex space-x-2">
              <Button onClick={toggleDebugInfo} variant="outline" size="sm">
                <Link2 className="mr-2 h-4 w-4" />
                {showDebugInfo ? t('hide_debug') : t('show_debug')}
              </Button>
              <Button onClick={testAiStatus} variant="outline" size="sm">
                <KeyRound className="mr-2 h-4 w-4" />
                {t('test_api')}
              </Button>
            </div>
          </CardTitle>
          <CardDescription>{t('ai_profile_description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTitle>{t('no_content_available')}</AlertTitle>
            <AlertDescription>
              {t('content_not_formatted_correctly')}
            </AlertDescription>
          </Alert>
          
          {showDebugInfo && debugResponse && (
            <div className="mt-4 p-3 bg-slate-100 rounded-md overflow-x-auto text-xs">
              <h4 className="font-medium mb-1">Debug Info:</h4>
              <pre className="whitespace-pre-wrap break-words">{debugResponse}</pre>
            </div>
          )}
          
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

# Aggiorna le chiavi di traduzione
echo "Aggiornando le chiavi di traduzione per il debug..."

# Italiano
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
  "ai_profile_requires_onboarding": "Il profilo AI richiede che il cliente abbia completato il processo di onboarding per generare approfondimenti basati sui dati raccolti.",
  "show_debug": "Mostra diagnostica",
  "hide_debug": "Nascondi diagnostica",
  "test_api": "Testa API"
}
EOL

# Inglese
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
  "ai_profile_requires_onboarding": "The AI profile requires that the client has completed the onboarding process to generate insights based on the collected data.",
  "show_debug": "Show Diagnostics",
  "hide_debug": "Hide Diagnostics",
  "test_api": "Test API"
}
EOL

# Modifica l'endpoint di debug di OpenAI per gestire meglio gli errori
echo "Migliorando l'endpoint di debug OpenAI..."

cat > /var/www/gervis/server/routes-ai.ts.new << 'EOL'
/**
 * Routes per l'integrazione AI
 * Questo file contiene gli endpoint necessari per l'integrazione con OpenAI
 * per generare approfondimenti e suggerimenti basati sui dati del cliente.
 */
import { Request, Response } from 'express';
import { generateEnrichedProfile, verifyOpenAIConfiguration } from './ai-services';
import { storage } from './storage';

// Middleware di autenticazione
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ success: false, message: "Non autenticato" });
}

/**
 * Registra le rotte per l'integrazione AI nell'app Express
 * @param app App Express
 */
export function registerAiRoutes(app: any) {
  /**
   * Endpoint per generare un profilo cliente arricchito con approfondimenti AI
   * Utilizza i dati del cliente e i log delle interazioni per generare
   * approfondimenti e suggerimenti personalizzati.
   */
  app.get("/api/ai/client-profile/:clientId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log(`[DEBUG AI] Richiesta profilo per cliente ${req.params.clientId} da utente ${req.user?.id || 'sconosciuto'}`);
      
      const clientId = parseInt(req.params.clientId);
      if (isNaN(clientId)) {
        console.log(`[DEBUG AI] ID cliente non valido: ${req.params.clientId}`);
        return res.status(400).json({ 
          success: false, 
          message: 'ID cliente non valido' 
        });
      }
      
      // Carica i dati del cliente
      const client = await storage.getClient(clientId);
      if (!client) {
        console.log(`[DEBUG AI] Cliente ${clientId} non trovato`);
        return res.status(404).json({ 
          success: false, 
          message: 'Cliente non trovato' 
        });
      }
      
      // Verifica che l'utente abbia accesso a questo cliente
      if (req.user && 'id' in req.user) {
        const userId = req.user.id;
        console.log(`[DEBUG AI] Verifica accesso per utente ${userId}, advisorId del cliente: ${client.advisorId}`);
        
        // Se l'utente non è admin e il cliente non è assegnato a lui
        if (req.user.role !== 'admin' && client.advisorId !== userId) {
          console.log(`[DEBUG AI] Accesso negato: utente ${userId} (ruolo: ${req.user.role}) non ha accesso al cliente ${clientId}`);
          return res.status(403).json({ 
            success: false, 
            message: 'Non hai i permessi per accedere a questo cliente' 
          });
        }
      }
      
      // Carica i log delle interazioni del cliente
      const logs = await storage.getClientLogs(clientId);
      console.log(`[DEBUG AI] Caricati ${logs.length} log per il cliente ${clientId}`);
      
      // Genera il profilo arricchito
      console.log(`[DEBUG AI] Generazione profilo per cliente ${clientId} in corso...`);
      console.time(`[DEBUG AI] Tempo generazione profilo ${clientId}`);
      
      const enrichedProfile = await generateEnrichedProfile(client, logs);
      
      console.timeEnd(`[DEBUG AI] Tempo generazione profilo ${clientId}`);
      console.log(`[DEBUG AI] Profilo generato con successo:`, {
        approfondimentiLength: enrichedProfile.approfondimenti.length,
        suggerimentiLength: enrichedProfile.suggerimenti.length
      });
      
      res.json({ 
        success: true, 
        data: enrichedProfile
      });
    } catch (error) {
      console.error('Errore nella generazione del profilo AI:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Errore interno del server' 
      });
    }
  });
  
  /**
   * Verifica che la configurazione OpenAI sia valida
   * Questo endpoint è utilizzato principalmente per scopi di diagnostica
   */
  app.get("/api/ai/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log(`[DEBUG AI] Richiesta status da utente ${req.user?.id || 'sconosciuto'}`);
      const isConfigured = await verifyOpenAIConfiguration();
      
      console.log(`[DEBUG AI] Status OpenAI: configurato=${isConfigured}`);
      res.json({ 
        success: true, 
        configured: isConfigured
      });
    } catch (error) {
      console.error('Errore nella verifica della configurazione OpenAI:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Errore interno del server', 
        configured: false
      });
    }
  });
  
  /**
   * Endpoint di debug pubblico per verificare la configurazione OpenAI
   * Non richiede autenticazione per facilitare il debug
   */
  app.get("/api/ai/debug-status", async (req: Request, res: Response) => {
    try {
      console.log("[DEBUG AI] Richiesta debug status OpenAI ricevuta");
      const apiKey = process.env.OPENAI_API_KEY;
      const apiKeyExists = !!apiKey;
      const apiKeyFirstChars = apiKeyExists ? `${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 3)}` : 'Non configurata';
      
      // Verifica di base
      const isConfigured = apiKeyExists && apiKey.startsWith('sk-');
      
      // Informazioni di diagnostica
      const diagnostics = {
        apiKeyExists,
        apiKeyMasked: apiKeyFirstChars,
        apiKeyFormat: apiKeyExists ? apiKey.startsWith('sk-') : false,
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        env: process.env.NODE_ENV || 'undefined'
      };
      
      console.log(`[DEBUG AI] Debug status: ${JSON.stringify({
        apiKeyExists,
        apiKeyMasked: apiKeyFirstChars,
        isConfigured
      })}`);
      
      // Se l'API key esiste, effettua un test opzionale
      let testResult = null;
      if (isConfigured) {
        try {
          console.log("[DEBUG AI] Esecuzione test di verifica OpenAI...");
          testResult = await verifyOpenAIConfiguration();
          console.log(`[DEBUG AI] Test completato: ${testResult}`);
        } catch (testError) {
          console.error("[DEBUG AI] Errore durante il test:", testError);
          testResult = false;
        }
      }
      
      res.json({
        success: true,
        configured: isConfigured,
        testPassed: testResult,
        diagnostics
      });
    } catch (error) {
      console.error('Errore nella verifica debug della configurazione:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Errore interno del server',
        configured: false,
        error: {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.stack : undefined
        }
      });
    }
  });
}
EOL

# Sostituisci il file routes-ai.ts
mv /var/www/gervis/server/routes-ai.ts.new /var/www/gervis/server/routes-ai.ts

# Ricompila l'applicazione
echo "Ricompilazione dell'applicazione in corso..."
cd /var/www/gervis
npm run build
echo "Applicazione ricompilata."

# Riavviare i servizi
echo "Riavvio dei servizi in corso..."
pm2 restart all
echo "Servizi riavviati."

echo "Correzione completata! Il componente AI ora dovrebbe gestire correttamente gli errori HTML e fornire informazioni di debug utili per la risoluzione dei problemi."
echo ""
echo "Suggerimenti per la risoluzione di eventuali problemi persistenti:"
echo "1. Verifica che OPENAI_API_KEY sia configurata correttamente nel file .env"
echo "2. Controlla che l'utente sia autenticato prima di accedere alla pagina del cliente"
echo "3. Assicurati che il cliente sia assegnato all'utente corrente"
echo "4. Se il problema persiste, utilizza i pulsanti di diagnostica nell'interfaccia per raccogliere informazioni aggiuntive"