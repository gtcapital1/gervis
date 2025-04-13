// This file defines the AiClientProfile component.
// It fetches and displays AI-generated insights and recommendations for a client based on their profile data.

import React, { useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCcw, Brain, Sparkles, Mail } from 'lucide-react';
import { httpRequest } from '@/lib/queryClient';
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface AiClientProfileProps {
  clientId: number;
}

// Interfaccia per gli elementi di approfondimento e suggerimenti
interface ProfileItem {
  title: string;
  description: string;
  actions?: string[]; // Azioni consigliate
}

// Interfacce per il formato aggiornato
interface ClienteProfilo {
  descrizione: string;  // Campo unico con riassunto completo
}

interface OpportunitaBusiness {
  titolo: string;
  descrizione: string;
  azioni: string[];
  priorita: number;
  email?: { oggetto: string; corpo: string };
}

// Interfaccia per i dati di profilo arricchito
interface ProfileData {
  profiloCliente?: ClienteProfilo;
  opportunitaBusiness?: OpportunitaBusiness[];
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

// Funzione per ottenere il colore del badge in base alla priorità
function getPriorityBadgeColor(priority: number) {
  switch(priority) {
    case 1:
      return "bg-red-500 hover:bg-red-600";
    case 2:
      return "bg-orange-500 hover:bg-orange-600";
    case 3:
      return "bg-yellow-500 hover:bg-yellow-600";
    case 4:
      return "bg-blue-500 hover:bg-blue-600";
    default:
      return "bg-gray-500 hover:bg-gray-600";
  }
}

// Funzione per ottenere il testo della priorità
function getPriorityText(priority: number) {
  switch(priority) {
    case 1:
      return "MASSIMA";
    case 2:
      return "ALTA";
    case 3:
      return "MEDIA";
    case 4:
      return "BASSA";
    default:
      return "MINIMA";
  }
}

// Funzione per gestire l'invio dell'email
function handleSendEmail(email: { oggetto: string; corpo: string }) {
  // Apri il client di posta predefinito con l'email precompilata
  const mailtoLink = `mailto:?subject=${encodeURIComponent(email.oggetto)}&body=${encodeURIComponent(email.corpo)}`;
  window.location.href = mailtoLink;
  toast.success("Email aperta nel client di posta predefinito");
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

  // Se sta caricando, mostra uno skeleton con messaggio di elaborazione
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
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
            <div className="relative">
              <Brain className="h-16 w-16 text-blue-300" />
              <div className="absolute top-0 right-0 h-full w-full flex items-center justify-center">
                <div className="h-8 w-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-blue-500">
                {t('ai_profile_processing', { ns: 'client' })}
              </h3>
              <p className="text-muted-foreground max-w-md">
                {t('ai_profile_processing_description', { ns: 'client' })}
              </p>
            </div>
          </div>
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Se c'è un errore, mostra un messaggio di errore
  if (isError) {
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
            <AlertTitle>Errore</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Si è verificato un errore durante la generazione del profilo AI'}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={handleGenerateProfile} 
            className="mt-4"
            variant="outline"
          >
                <RefreshCcw className="mr-2 h-4 w-4" />
            Riprova
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Se ci sono dati, mostra il profilo
  if (data?.data) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Sigmund</CardTitle>
            <CardDescription>
              Analisi e raccomandazioni basate su intelligenza artificiale
            </CardDescription>
          </div>
          <Button 
            onClick={handleGenerateProfile} 
            variant="outline" 
            size="icon"
            title={t('refresh_profile')}
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {/* Profilo Cliente */}
          {data.data.profiloCliente && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Profilo Cliente</h3>
                <div className="text-sm text-muted-foreground">
                  {formatContent(data.data.profiloCliente.descrizione)}
                </div>
              </div>
            </div>
          )}

          {/* Opportunità di Business */}
          {data.data.opportunitaBusiness && data.data.opportunitaBusiness.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold">Opportunità di Business</h3>
              {data.data.opportunitaBusiness.map((opportunita, index) => (
                <Card key={index} className="bg-muted">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{opportunita.titolo}</CardTitle>
                        <Badge className={getPriorityBadgeColor(opportunita.priorita)}>
                          Priorità {getPriorityText(opportunita.priorita)}
                        </Badge>
                      </div>
                      {opportunita.email && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex items-center gap-2"
                          onClick={() => handleSendEmail(opportunita.email!)}
                        >
                          <Mail className="h-4 w-4" />
                          Invia Email
              </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {opportunita.descrizione}
                    </p>
                    {opportunita.azioni && opportunita.azioni.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Azioni Suggerite:</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground">
                          {opportunita.azioni.map((azione, idx) => (
                            <li key={idx}>{azione}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Messaggio se non ci sono dati */}
          {(!data.data.profiloCliente && (!data.data.opportunitaBusiness || data.data.opportunitaBusiness.length === 0)) && (
            <div className="text-center py-6">
              <p className="text-muted-foreground">
                Nessun dato disponibile. Prova a rigenerare il profilo.
              </p>
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
  if (!data?.data?.profiloCliente && !data?.data?.opportunitaBusiness) {
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

        {/* Mostra il profilo cliente se disponibile */}
        {data?.data?.profiloCliente && (
          <div className="mb-6">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Profilo Cliente</h3>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-sm text-gray-800">{data.data.profiloCliente.descrizione}</p>
            </div>
          </div>
        )}

        {/* Mostra le opportunità di business */}
        {data?.data?.opportunitaBusiness && data.data.opportunitaBusiness.length > 0 && (
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-3">Opportunità di Business</h3>
            <div className="space-y-4">
              {data.data.opportunitaBusiness.map((opportunita, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <h4 className="text-sm font-semibold text-blue-600 mb-2">{opportunita.titolo}</h4>
                  <p className="text-sm text-gray-800 mt-2">{opportunita.descrizione}</p>
                  
                  {/* Mostra le azioni consigliate */}
                  {opportunita.azioni && opportunita.azioni.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-200">
                      <h5 className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-2">Azioni consigliate</h5>
                      <ul className="space-y-1">
                        {opportunita.azioni.map((azione, azioneIndex) => (
                          <li key={azioneIndex} className="text-sm flex items-start text-gray-800">
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
                              className="h-4 w-4 mr-2 text-blue-500 mt-0.5 shrink-0"
                            >
                              <path d="M5 12h14"/>
                              <path d="m12 5 7 7-7 7"/>
                            </svg>
                            <span>{azione}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
        )}
      </CardContent>
    </Card>
  );
}