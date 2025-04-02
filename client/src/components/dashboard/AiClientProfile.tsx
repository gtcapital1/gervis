// This file defines the AiClientProfile component.
// It fetches and displays AI-generated insights and recommendations for a client based on their profile data.

import React, { useState, useEffect, ReactNode } from 'react';
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

// Interfaccia per gli elementi di approfondimento e suggerimenti
interface ProfileItem {
  title: string;
  description: string;
  actions?: string[]; // Azioni consigliate (nuovo formato)
}

// Interfaccia per i dati di profilo arricchito
interface ProfileData {
  // Solo formato unificato
  raccomandazioni: ProfileItem[] | string;
}

// Interfaccia per la risposta dell'API
interface ProfileResponse {
  success: boolean;
  data?: ProfileData;
  cached?: boolean;
  lastGenerated?: string;
  upToDate?: boolean;
  message?: string;
}

export function AiClientProfile({ clientId }: AiClientProfileProps) {
  const { t } = useTranslation('client');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [profileRequested, setProfileRequested] = useState(true); // Inizia con true per caricare automaticamente
  const [isUpToDate, setIsUpToDate] = useState(false);
  const [upToDateMessage, setUpToDateMessage] = useState("");

  // Esegui la query per ottenere i dati del profilo arricchito solo quando richiesto
  const { data, isLoading, isError, error, refetch } = useQuery<ProfileResponse>({
    queryKey: ['/api/ai/client-profile', clientId, refreshTrigger],
    queryFn: async () => {
      // Reset stato "up to date" quando iniziamo una nuova richiesta
      setIsUpToDate(false);
      setUpToDateMessage("");
      
      // Determina se è una richiesta di refresh o una richiesta iniziale
      const isRefreshRequest = profileRequested && refreshTrigger > 0;
      const url = isRefreshRequest 
        ? `/api/ai/client-profile/${clientId}?refresh=true`
        : `/api/ai/client-profile/${clientId}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      
      
      
      // Verifica se i dati sono già aggiornati
      if (result.upToDate) {
        setIsUpToDate(true);
        setUpToDateMessage(result.message || "Profilo AI è già aggiornato con tutte le informazioni raccolte");
      }
      
      // Log dettagliato della struttura dei dati
      if (result.data) {
        // Controlla il nuovo formato raccomandazioni
        if (result.data.raccomandazioni) {
          
          
          
          
          // Prova a esaminare il primo elemento se è un array
          if (Array.isArray(result.data.raccomandazioni) && result.data.raccomandazioni.length > 0) {
            
            
            
            if (typeof result.data.raccomandazioni[0] === 'object') {
              
              
              
            }
          }
        } else {
          // Fallback per il vecchio formato
          
          
          
          
          
          
          
          
          // Prova a esaminare il primo elemento se è un array
          if (Array.isArray(result.data.approfondimenti) && result.data.approfondimenti.length > 0) {
            
            
            
            if (typeof result.data.approfondimenti[0] === 'object') {
              
              
            }
          }
        }
      }
      
      
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

  // Funzione per formattare il contenuto in base al tipo
  const formatContent = (content: ProfileItem[] | string | any): ReactNode => {
    // Se è null o undefined
    if (content === null || content === undefined) {
      return null;
    }
    
    // Se è una stringa
    if (typeof content === 'string') {
      // Controlla se la stringa potrebbe essere JSON
      if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(content);
          return formatContent(parsed); // Richiama ricorsivamente sulla versione parsata
        } catch (e) {
          // Non è JSON valido, continua a trattarlo come stringa
          
        }
      }
      
      return (
        <div>
          {content.split('\n').map((paragraph, index) => (
            <p key={index} className={index > 0 ? 'mt-2' : ''}>
              {paragraph}
            </p>
          ))}
        </div>
      );
    }
    
    // Se è un array
    if (Array.isArray(content)) {
      
      
      
      // Rimuoviamo questa condizione che mostra elementi generici
      // e lasciamo che il codice successivo gestisca gli oggetti nell'array
      
      // Se l'array contiene oggetti, formattali in modo speciale
      if (content.length > 0 && typeof content[0] === 'object') {
        
        
        
        return (
          <ul className="space-y-4 list-none pl-0">
            {content.map((item, index) => {
              
              
              // Estrai le proprietà rilevanti dagli oggetti
              const title = item.title || item.titolo || '';
              const description = item.description || item.descrizione || item.content || item.contenuto || '';
              const actions = item.actions || [];
              
              
              
              
              
              return (
                <li key={index} className="border-l-2 border-primary bg-white text-gray-900 pl-3 py-3 px-4 rounded-md shadow-sm">
                  {title && <h4 className="font-semibold text-sm text-blue-400">{title}</h4>}
                  <p className="text-sm text-gray-900 mt-2">{description || JSON.stringify(item)}</p>
                  
                  {/* Mostra le azioni raccomandate se presenti */}
                  {Array.isArray(actions) && actions.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-700">
                      <h5 className="text-xs font-medium text-blue-400 uppercase tracking-wide mb-2">Azioni consigliate</h5>
                      <ul className="space-y-1">
                        {actions.map((action, actionIndex) => (
                          <li key={actionIndex} className="text-sm flex items-start text-gray-900">
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              width="24" 
                              height="24" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                              className="h-4 w-4 mr-2 text-blue-400 mt-0.5 shrink-0"
                            >
                              <path d="M5 12h14"/>
                              <path d="m12 5 7 7-7 7"/>
                            </svg>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        );
      } else {
        // Array di valori primitivi
        
        return (
          <ul className="space-y-2 list-disc pl-5">
            {content.map((item, index) => (
              <li key={index} className="text-sm">
                {typeof item === 'string' ? item : JSON.stringify(item)}
              </li>
            ))}
          </ul>
        );
      }
    }
    
    // Se è un oggetto
    if (typeof content === 'object') {
      // Se ha una struttura logica con titolo/descrizione
      if (content.title || content.titolo || content.description || content.descrizione) {
        return (
          <div className="border-l-2 border-gray-700 bg-white text-gray-900 pl-3 py-2 px-3 rounded-md shadow-sm mb-2">
            {(content.title || content.titolo) && (
              <h4 className="font-semibold text-sm text-blue-400">{content.title || content.titolo}</h4>
            )}
            <p className="text-sm text-gray-900 mt-1">
              {content.description || content.descrizione || content.content || content.contenuto || ''}
            </p>
          </div>
        );
      }
      
      try {
        // Fallback: converti l'oggetto in una struttura leggibile
        const formattedText = JSON.stringify(content, null, 2);
        return (
          <div className="space-y-2">
            {Object.entries(content).map(([key, value], index) => (
              <div key={index} className="border-l-2 border-gray-700 bg-white text-gray-900 pl-3 py-2 px-3 rounded-md shadow-sm mb-2">
                <h4 className="font-semibold text-sm capitalize text-blue-400">{key.replace(/_/g, ' ')}</h4>
                <div className="text-sm text-gray-900 mt-1">
                  {typeof value === 'string' ? value : JSON.stringify(value)}
                </div>
              </div>
            ))}
          </div>
        );
      } catch (e) {
        
        return <p className="text-red-500">Errore durante la visualizzazione del contenuto</p>;
      }
    }
    
    // Fallback per altri tipi
    return <p>{String(content)}</p>;
  };

  // Se sta caricando, mostra uno skeleton
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sigmund</CardTitle>
          <CardDescription>
            Analisi e raccomandazioni basate su intelligenza artificiale
          </CardDescription>
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
          <CardDescription>
            Analisi e raccomandazioni basate su intelligenza artificiale
          </CardDescription>
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
          <CardDescription>
            Analisi e raccomandazioni basate su intelligenza artificiale
          </CardDescription>
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
  if (!data?.data?.raccomandazioni) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sigmund</CardTitle>
          <CardDescription>
            Analisi e raccomandazioni basate su intelligenza artificiale
          </CardDescription>
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
        <CardDescription>
          Analisi e raccomandazioni basate su intelligenza artificiale
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isUpToDate && (
          <Alert className="bg-green-50 border-green-200 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-green-600"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <AlertTitle className="text-green-800">{t('up_to_date')}</AlertTitle>
            <AlertDescription className="text-green-700">
              {upToDateMessage}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Mostra la data dell'ultimo aggiornamento */}
        {data?.lastGenerated && (
          <div className="text-xs text-muted-foreground flex items-center mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3 w-3 mr-1"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Ultimo aggiornamento: {new Date(data.lastGenerated).toLocaleString('it-IT', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        )}

        {/* Mostra le raccomandazioni unificate */}
        <div className="space-y-4">
          <div className="space-y-6">
            {formatContent(data?.data?.raccomandazioni)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}