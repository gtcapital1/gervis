// This file defines the AiClientProfile component.
// It fetches and displays AI-generated insights and recommendations for a client based on their profile data.

import React, { useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCcw, Brain, Sparkles, Mail, ArrowRight, LucideCheckCircle, User, BarChart3 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmailDialog } from "@/components/dialog";
import { EmailFormData } from "@/types/email";
import { apiRequest } from "@/lib/queryClient";

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
  clientId: number;
  clientName: string;
  profiloCliente?: ClienteProfilo;
  opportunitaBusiness?: OpportunitaBusiness[];
  lastUpdated?: string;
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

// Nuove interfacce basate sulla struttura aggiornata dell'API
interface InsightsCliente {
  profiloSintetico: string;
  puntiForza: string[];
  puntiDebolezza: string[];
  analisiAllocazione: string;
}

interface PortafoglioModello {
  portfolioConsigliato: string;
  motivazione: string;
  modificheSuggerite: string[];
  beneficiAttesi: string;
}

interface OpportunitaRelazione {
  titolo: string;
  descrizione: string;
  emailSuggerita: string;
  priorita: number;
}

interface DatiInvestimento {
  orizzonte: string;
  profiloRischio: string;
  obiettiviInvestimento: string[];
  esperienzaInvestimento: string;
}

interface AssetAllocazione {
  allocazione: { categoria: string; valore: number }[];
  valoreComplessivo: number;
}

// Nuova interfaccia per i dati di profilo arricchito
interface AiClientProfileData {
  clientId: number;
  clientName: string;
  clientInfo: {
    firstName: string;
    lastName: string;
    email: string;
  };
  insightsCliente: InsightsCliente;
  portafoglioModello: PortafoglioModello;
  strategieRelazione: OpportunitaRelazione[];
  datiInvestimento?: DatiInvestimento;
  assetAttuali?: AssetAllocazione;
  lastUpdated?: string;
}

// Aggiornamento dell'interfaccia per la risposta dell'API
interface AiProfileResponse {
  success: boolean;
  data?: AiClientProfileData;
  cached?: boolean;
  lastGenerated?: string;
  upToDate?: boolean;
  message?: string;
}

// Interfaccia per la risposta del portfolio personalizzato
interface CustomPortfolioResponse {
  success: boolean;
  data?: {
    nome: string;
    descrizione: string;
    allocazione: Array<{categoria: string; percentuale: number}>;
    rendimentoAtteso: string;
    rischioAssociato: string;
    strategieRibilanciamento: string[];
  };
  message?: string;
}

// Funzione per ottenere il colore del badge in base alla priorità
function getPriorityBadgeColor(priority: number) {
  switch(priority) {
    case 1:
      return "bg-blue-800 text-white"; // Blu molto scuro per priorità MASSIMA
    case 2:
      return "bg-blue-600 text-white"; // Blu scuro per priorità ALTA
    case 3:
      return "bg-blue-500 text-white"; // Blu medio per priorità MEDIA
    case 4:
      return "bg-blue-400 text-white"; // Blu chiaro per priorità BASSA
    default:
      return "bg-blue-300 text-white"; // Blu molto chiaro per default
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

// Componente per visualizzare il messaggio quando non ci sono dati
const NoDataMessage = () => (
  <div className="text-center py-6 bg-gray-50 rounded-lg">
    <p className="text-gray-700">
      Nessun dato disponibile per questo cliente. Clicca sul pulsante "Genera Profilo AI" per creare approfondimenti personalizzati.
    </p>
  </div>
);

export function AiClientProfile({ clientId }: AiClientProfileProps) {
  const { t } = useTranslation();
  // Debug: controlliamo i valori delle traduzioni
  console.log('DEBUG TRANSLATE:', {
    title: t('client.generate_profile_title'),
    description: t('client.generate_profile_description'),
    button: t('client.generate_profile')
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isUpToDate, setIsUpToDate] = useState(false);
  const [upToDateMessage, setUpToDateMessage] = useState("");
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailToSend, setEmailToSend] = useState<{ oggetto: string; corpo: string } | null>(null);
  const [profileExists, setProfileExists] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [refreshConfirmed, setRefreshConfirmed] = useState(false);
  const { toast } = useToast();
  const [isPortfolioDialogOpen, setIsPortfolioDialogOpen] = useState(false);
  const [customRequirements, setCustomRequirements] = useState<string[]>([]);
  const [newRequirement, setNewRequirement] = useState("");
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>("");
  const [availablePortfolios, setAvailablePortfolios] = useState<{id: number; name: string}[]>([]);
  const [isGeneratingPortfolio, setIsGeneratingPortfolio] = useState(false);
  const [customPortfolio, setCustomPortfolio] = useState<CustomPortfolioResponse["data"] | null>(null);

  // Funzione per gestire l'invio dell'email
  const handleSendEmail = (email: { oggetto: string; corpo: string }) => {
    setEmailToSend(email);
    setEmailSubject(email.oggetto);
    setEmailMessage(email.corpo);
    setIsEmailDialogOpen(true);
  };

  // Query per recuperare o generare il profilo AI
  const profileQuery = useQuery<AiProfileResponse>({
    queryKey: ['/api/ai/client-profile', clientId, refreshTrigger],
    queryFn: async () => {
      // Se è una richiesta di aggiornamento forzato, non eseguiamo il controllo
      if (refreshTrigger > 0) {
        setIsUpToDate(false);
        setUpToDateMessage("");
        
        // Se l'aggiornamento è stato confermato, mostra toast di richiesta in corso
        if (refreshConfirmed) {
          toast({
            title: "Aggiornamento in corso",
            description: "Sto generando il nuovo profilo AI, potrebbe richiedere qualche momento."
          });
        }
        
        const response = await fetch(`/api/ai/client-profile/${clientId}?refresh=true`);
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        const result = await response.json();
        
        if (result.upToDate) {
          setIsUpToDate(true);
          toast({
            title: "Profilo già aggiornato",
            description: result.message || "Il profilo AI è già aggiornato con i dati più recenti",
          });
          setUpToDateMessage(result.message || "Profilo AI è già aggiornato con tutte le informazioni raccolte");
        } else if (result.data) {
          // Notifica che il profilo è stato aggiornato con successo
          toast({
            title: "Profilo aggiornato",
            description: "Il profilo AI è stato aggiornato con successo",
          });
        }
        
        return result;
      } else {
        // Questa è la richiesta iniziale: verifica se il profilo esiste
        const response = await fetch(`/api/ai/client-profile/${clientId}?checkOnly=true`);
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Aggiorna lo stato in base ai dati ricevuti
        if (result.data) {
          setProfileExists(true);
          if (result.lastGenerated) {
            setLastUpdated(result.lastGenerated);
          }
        } else {
          setProfileExists(false);
        }
        
        return result;
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Estrai i dati e le funzioni dalla query
  const { data, isLoading, isError, error, refetch } = profileQuery;

  // Aggiorna lastUpdated quando un profilo viene generato
  useEffect(() => {
    if (data?.data && data.lastGenerated) {
      setLastUpdated(data.lastGenerated);
      setProfileExists(true);
    }
  }, [data]);

  // Funzione per generare o aggiornare il profilo manualmente
  const handleGenerateProfile = () => {
    // Mostra un dialog di conferma all'utente se il profilo esiste già
    if (profileExists) {
      if (!window.confirm("Il profilo AI esiste già. Vuoi davvero rigenerarlo? Questa operazione potrebbe richiedere tempo e consumare token.")) {
        return;
      }
      setRefreshConfirmed(true);
    } else {
      toast({
        title: "Generazione profilo",
        description: "Sto generando il profilo AI, potrebbe richiedere qualche momento."
      });
    }
    
    setRefreshTrigger(prev => prev + 1);
    refetch();
  };

  // Funzione per inviare email - modificata per usare il nuovo componente
  const sendEmail = async (data: EmailFormData) => {
    const loadingToast = toast({
      title: "Invio email in corso...",
      description: "Attendere prego"
    });
    
    try {
      const response = await apiRequest(`/api/clients/${clientId}/send-email`, {
        method: "POST",
        body: JSON.stringify({
          subject: data.subject,
          message: data.message,
          recipientName: data.recipientName,
          recipientEmail: data.recipientEmail,
          language: "italian" // o 'english' in base alle preferenze
        })
      });
      
      loadingToast.dismiss();
      
      if (response.success) {
        setIsEmailDialogOpen(false);
        toast({
          title: "Email inviata",
          description: "L'email è stata inviata con successo",
        });
      } else {
        toast({
          title: "Errore",
          description: response.message || "Si è verificato un errore durante l'invio dell'email",
          variant: "destructive",
        });
      }
    } catch (error) {
      loadingToast.dismiss();
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'invio dell'email",
        variant: "destructive",
      });
    }
  };

  // Modifica la funzione che gestisce il click sul bottone email
  const handleEmailButtonClick = (email: { oggetto: string; corpo: string }) => {
    setEmailToSend(email);
    setEmailSubject(email.oggetto);
    setEmailMessage(email.corpo);
    setIsEmailDialogOpen(true);
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
                <li key={index} className="border-l-2 border-blue-400 bg-white text-gray-900 pl-3 py-3 px-4 rounded-md shadow-md hover:shadow-lg transition-all">
                  {title && <h4 className="font-semibold text-sm text-blue-600">{title}</h4>}
                  <p className="text-sm text-gray-700 mt-2">{description || JSON.stringify(item)}</p>
                  
                  {/* Mostra le azioni raccomandate se presenti */}
                  {Array.isArray(actions) && actions.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-200">
                      <h5 className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-2">Azioni consigliate</h5>
                      <ul className="space-y-1">
                        {actions.map((action, actionIndex) => (
                          <li key={actionIndex} className="text-sm flex items-start text-gray-700">
                            <ArrowRight className="h-4 w-4 mr-2 text-blue-600 mt-0.5 shrink-0" />
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
          <div className="border-l-2 border-blue-400 bg-white text-gray-900 pl-3 py-3 px-4 rounded-md shadow-md hover:shadow-lg transition-all mb-2">
            {(content.title || content.titolo) && (
              <h4 className="font-semibold text-sm text-blue-600">{content.title || content.titolo}</h4>
            )}
            <p className="text-sm text-gray-700 mt-1">
              {content.description || content.descrizione || content.content || content.contenuto || ''}
            </p>
          </div>
        );
      }
      
      try {
        // Fallback: converti l'oggetto in una struttura leggibile
        return (
          <div className="space-y-2">
            {Object.entries(content).map(([key, value], index) => (
              <div key={index} className="border-l-2 border-blue-400 bg-white text-gray-900 pl-3 py-3 px-4 rounded-md shadow-md hover:shadow-lg transition-all mb-2">
                <h4 className="font-semibold text-sm capitalize text-blue-600">{key.replace(/_/g, ' ')}</h4>
                <div className="text-sm text-gray-700 mt-1">
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

  // Fetch available model portfolios
  useEffect(() => {
    const fetchPortfolios = async () => {
      try {
        const response = await fetch('/api/portfolios/models');
        if (response.ok) {
          const data = await response.json();
          setAvailablePortfolios(data.data || []);
        }
      } catch (error) {
        console.error("Error fetching model portfolios:", error);
      }
    };
    
    fetchPortfolios();
  }, []);

  // Handle adding custom requirements
  const handleAddRequirement = () => {
    if (newRequirement.trim()) {
      setCustomRequirements([...customRequirements, newRequirement.trim()]);
      setNewRequirement("");
    }
  };

  // Handle removing custom requirement
  const handleRemoveRequirement = (index: number) => {
    setCustomRequirements(customRequirements.filter((_, i) => i !== index));
  };

  // Generate custom portfolio
  const handleGeneratePortfolio = async () => {
    if (!selectedPortfolio) {
      toast({
        title: "Errore",
        description: "Seleziona un portafoglio modello di base",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingPortfolio(true);
    
    try {
      const response = await fetch(`/api/ai/custom-portfolio/${clientId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          modelPortfolioId: selectedPortfolio,
          customRequirements
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success && result.data) {
        setCustomPortfolio(result.data);
        setIsPortfolioDialogOpen(false);
        toast({
          title: "Portafoglio personalizzato generato",
          description: "Il portafoglio personalizzato è stato creato con successo"
        });
      } else {
        toast({
          title: "Errore",
          description: result.message || "Si è verificato un errore durante la generazione del portafoglio",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la generazione del portafoglio",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPortfolio(false);
    }
  };

  // Aggiorno la funzione per assicurare l'invio automatico del prompt all'AI e mostrare il messaggio utente
  const handleCreateCustomPortfolio = () => {
    if (!data?.data || !data.data.portafoglioModello || !data.data.portafoglioModello.portfolioConsigliato) {
      toast({
        title: "Errore",
        description: "Informazioni sul portafoglio modello non disponibili",
        variant: "destructive"
      });
      return;
    }

    // Cliente e portafoglio consigliato
    const clientName = data.data.clientInfo ? `${data.data.clientInfo.firstName} ${data.data.clientInfo.lastName}` : `Cliente ${clientId}`;
    const portfolioName = data.data.portafoglioModello.portfolioConsigliato;
    
    // Creo il prompt per l'AI
    const prompt = `Per favore costruisci un nuovo portafoglio personalizzato per il cliente ${clientName} partendo dal portafoglio modello "${portfolioName}" e implementando le seguenti modifiche suggerite:
${data.data.portafoglioModello.modificheSuggerite.map(modifica => `- ${modifica}`).join('\n')}

Il portafoglio dovrebbe mantenere gli stessi obiettivi ma essere personalizzato secondo le modifiche indicate sopra.`;

    // Salvo il prompt e i flag nel localStorage
    localStorage.setItem('portfolioCreationPrompt', prompt);
    localStorage.setItem('autoSendPrompt', 'true');
    localStorage.setItem('showUserMessage', 'true');
    
    // Mostro un toast per informare l'utente
    toast({
      title: "Preparazione portafoglio",
      description: "Ti sto reindirizzando alla chat AI per creare il portafoglio personalizzato"
    });
    
    // Navigo alla pagina dell'Agent AI
    window.location.href = '/agent';
  };

  // Se sta caricando, mostra uno skeleton con messaggio di elaborazione
  if (isLoading) {
    return (
      <Card className="overflow-hidden border shadow-sm">
        <CardHeader className="bg-white border-b">
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <Brain className="h-5 w-5" />
            Sigmund
          </CardTitle>
          <CardDescription className="text-gray-500">
            Analisi e raccomandazioni basate su intelligenza artificiale
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
            <div className="relative">
              <Brain className="h-16 w-16 text-gray-400" />
              <div className="absolute top-0 right-0 h-full w-full flex items-center justify-center">
                <div className="h-8 w-8 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin"></div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-800">
                {t('client.ai_profile_processing')}
              </h3>
              <p className="text-gray-600 max-w-md">
                {t('client.ai_profile_processing_description')}
              </p>
            </div>
          </div>
          <Skeleton className="h-8 w-full bg-gray-100" />
          <Skeleton className="h-24 w-full bg-gray-100" />
          <Skeleton className="h-8 w-full bg-gray-100" />
          <Skeleton className="h-24 w-full bg-gray-100" />
        </CardContent>
      </Card>
    );
  }

  // Se c'è un errore, mostra un messaggio di errore
  if (isError) {
    return (
      <Card className="overflow-hidden border shadow-sm">
        <CardHeader className="bg-white border-b">
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <Brain className="h-5 w-5" />
            Sigmund
          </CardTitle>
          <CardDescription className="text-gray-500">
            Analisi e raccomandazioni basate su intelligenza artificiale
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Alert variant="destructive" className="border-red-300 bg-red-50 text-red-800">
            <AlertTitle className="font-semibold">Errore</AlertTitle>
            <AlertDescription className="mt-2">
              {error instanceof Error ? error.message : 'Si è verificato un errore durante la generazione del profilo AI'}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={handleGenerateProfile} 
            className="mt-6 bg-gray-800 hover:bg-gray-900 text-white"
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
      <Card className="overflow-hidden border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-white border-b">
          <div>
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <Brain className="h-5 w-5 text-blue-600" />
              Sigmund
            </CardTitle>
            <CardDescription className="text-gray-500">
              Analisi e raccomandazioni basate su intelligenza artificiale
              {lastUpdated && <span className="block text-xs mt-1">Ultimo aggiornamento: {new Date(lastUpdated).toLocaleString('it-IT')}</span>}
            </CardDescription>
          </div>
          <Button 
            onClick={handleGenerateProfile} 
            variant="outline" 
            size="icon"
            title={t('client.refresh_profile')}
            className="bg-white hover:bg-gray-50 border-gray-200"
          >
            <RefreshCcw className="h-4 w-4 text-gray-700" />
          </Button>
        </CardHeader>
        
        {/* Mostra un avviso se il profilo è up-to-date dopo un tentativo di aggiornamento */}
        {isUpToDate && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mx-4 mt-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <LucideCheckCircle className="h-5 w-5 text-blue-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  {upToDateMessage}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <CardContent className="pt-6">
          {/* Profilo Cliente */}
          {data.data.insightsCliente && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
                  <User className="h-5 w-5 mr-2 text-blue-600" />
                  Profilo Cliente
                </h3>
                <div className="text-sm text-gray-700 bg-white p-4 rounded-lg shadow-sm border-l-2 border-blue-400">
                  {formatContent(data.data.insightsCliente.profiloSintetico)}
                </div>
                
                {/* Punti di forza - renamed to Considerazioni */}
                {data.data.insightsCliente.puntiForza && data.data.insightsCliente.puntiForza.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-md font-medium text-gray-700 mb-2">Considerazioni</h4>
                    <ul className="space-y-2">
                      {data.data.insightsCliente.puntiForza.map((punto, idx) => (
                        <li key={idx} className="flex items-start text-sm text-gray-700">
                          <LucideCheckCircle className="h-4 w-4 mr-2 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{punto}</span>
                        </li>
                      ))}
                    </ul>
                </div>
                )}
                
                {/* Punti di debolezza - renamed to Aree di attenzione */}
                {data.data.insightsCliente.puntiDebolezza && data.data.insightsCliente.puntiDebolezza.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-md font-medium text-gray-700 mb-2">Aree di attenzione</h4>
                    <ul className="space-y-2">
                      {data.data.insightsCliente.puntiDebolezza.map((punto, idx) => (
                        <li key={idx} className="flex items-start text-sm text-gray-700">
                          <ArrowRight className="h-4 w-4 mr-2 text-amber-600 mt-0.5 flex-shrink-0" />
                          <span>{punto}</span>
                        </li>
                      ))}
                    </ul>
                </div>
                )}
              </div>
            </div>
          )}

          {/* Portafoglio Modello */}
          {data.data.portafoglioModello && (
            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <Brain className="h-5 w-5 mr-2 text-purple-600" />
                  Portafoglio Consigliato
                  <span className="ml-2 text-xs font-normal text-gray-500">(selezionato tra i portafogli modello disponibili)</span>
                </h3>
              </div>
              <Card className="overflow-hidden border shadow-sm bg-white">
                <CardHeader className="pb-2 border-b bg-white">
                  <CardTitle className="text-base text-gray-800">{data.data.portafoglioModello.portfolioConsigliato}</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-sm text-gray-700 mb-4">
                    {data.data.portafoglioModello.motivazione}
                  </p>
                  
                  {data.data.portafoglioModello.modificheSuggerite && data.data.portafoglioModello.modificheSuggerite.length > 0 && (
                    <div className="bg-gray-50 p-3 rounded-lg mb-4">
                      <h4 className="text-sm font-semibold mb-2 text-gray-800">Modifiche suggerite:</h4>
                      <ul className="space-y-2">
                        {data.data.portafoglioModello.modificheSuggerite.map((modifica, idx) => (
                          <li key={idx} className="flex items-start text-sm text-gray-700">
                            <LucideCheckCircle className="h-4 w-4 mr-2 text-blue-600 mt-0.5 flex-shrink-0" />
                            <span>{modifica}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {data.data.portafoglioModello.beneficiAttesi && (
                    <div className="bg-blue-50 p-3 rounded-lg mb-4">
                      <h4 className="text-sm font-semibold mb-2 text-gray-800">Benefici attesi:</h4>
                      <p className="text-sm text-gray-700">{data.data.portafoglioModello.beneficiAttesi}</p>
                    </div>
                  )}
                  
                  {/* Sposto il pulsante qui, dopo i benefici attesi */}
                  <div className="flex justify-end mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center text-sm border-blue-200 text-blue-600 hover:bg-blue-50"
                      onClick={handleCreateCustomPortfolio}
                    >
                      <BarChart3 className="h-4 w-4 mr-1" />
                      Crea Portafoglio Personalizzato
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Portafoglio Personalizzato */}
          {customPortfolio && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                Portafoglio Personalizzato
              </h3>
              <Card className="overflow-hidden border shadow-sm bg-white">
                <CardHeader className="pb-2 border-b bg-white">
                  <CardTitle className="text-base text-gray-800">{customPortfolio.nome}</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-sm text-gray-700 mb-4">
                    {customPortfolio.descrizione}
                  </p>
                  
                  {customPortfolio.allocazione && customPortfolio.allocazione.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold mb-2 text-gray-800">Allocazione:</h4>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="space-y-2">
                          {customPortfolio.allocazione.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-gray-700">{item.categoria}</span>
                              <span className="font-medium text-gray-900">{item.percentuale}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 mt-4 mb-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <h4 className="text-sm font-semibold mb-2 text-gray-800">Rendimento atteso:</h4>
                      <p className="text-sm text-gray-700">{customPortfolio.rendimentoAtteso}</p>
                    </div>
                    
                    <div className="bg-amber-50 p-3 rounded-lg">
                      <h4 className="text-sm font-semibold mb-2 text-gray-800">Rischio associato:</h4>
                      <p className="text-sm text-gray-700">{customPortfolio.rischioAssociato}</p>
                    </div>
                  </div>
                  
                  {customPortfolio.strategieRibilanciamento && customPortfolio.strategieRibilanciamento.length > 0 && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <h4 className="text-sm font-semibold mb-2 text-gray-800">Strategie di ribilanciamento:</h4>
                      <ul className="space-y-2">
                        {customPortfolio.strategieRibilanciamento.map((strategia, idx) => (
                          <li key={idx} className="flex items-start text-sm text-gray-700">
                            <LucideCheckCircle className="h-4 w-4 mr-2 text-blue-600 mt-0.5 flex-shrink-0" />
                            <span>{strategia}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Opportunità di Business (Strategie Relazione) */}
          {data.data.strategieRelazione && data.data.strategieRelazione.length > 0 && (
            <div className="mt-8 space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <Sparkles className="h-5 w-5 mr-2 text-yellow-500" />
                Opportunità di Business
                <span className="ml-2 text-xs font-normal text-gray-500">(azioni specifiche per questo cliente)</span>
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {data.data.strategieRelazione.map((opportunita, index) => (
                  <Card key={index} className="overflow-hidden border shadow-sm hover:shadow-md transition-all bg-white">
                    <CardHeader className="pb-2 border-b bg-white">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base text-gray-800">{opportunita.titolo}</CardTitle>
                          <Badge className={getPriorityBadgeColor(opportunita.priorita)}>
                            Priorità {getPriorityText(opportunita.priorita)}
                          </Badge>
                        </div>
                        {opportunita.emailSuggerita && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => handleEmailButtonClick({ 
                              oggetto: `Opportunità: ${opportunita.titolo}`, 
                              corpo: opportunita.emailSuggerita 
                            })}
                          >
                            <Mail className="h-4 w-4 mr-1" />
                            Invia Email
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <p className="text-sm text-gray-700 mb-4">
                        {opportunita.descrizione}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Messaggio se non ci sono dati */}
          {!isLoading && !isError && data?.success && data?.data && 
            (!data.data.insightsCliente || !data.data.portafoglioModello || !data.data.strategieRelazione || data.data.strategieRelazione.length === 0) && (
              <NoDataMessage />
            )
          }

          {/* Email Dialog - aggiornato alla nuova versione */}
          <EmailDialog
            open={isEmailDialogOpen}
            onOpenChange={setIsEmailDialogOpen}
            clientId={clientId}
            title={t('client.send_email')}
            presetSubject={emailSubject}
            presetMessage={emailMessage}
            onSubmit={sendEmail}
            useClientSelector={true}
          />

          {/* Portfolio Dialog */}
          <Dialog open={isPortfolioDialogOpen} onOpenChange={setIsPortfolioDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Crea portafoglio personalizzato</DialogTitle>
                <DialogDescription>
                  Seleziona un portafoglio modello e aggiungi requisiti specifici per creare un portafoglio su misura per questo cliente.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="modelPortfolio">Portafoglio modello di base</Label>
                  <select 
                    id="modelPortfolio"
                    className="w-full rounded-md border border-gray-300 p-2"
                    value={selectedPortfolio}
                    onChange={(e) => setSelectedPortfolio(e.target.value)}
                  >
                    <option value="">Seleziona un portafoglio...</option>
                    {availablePortfolios.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="customRequirements">Requisiti specifici (opzionale)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="customRequirements"
                      placeholder="Aggiungi requisito specifico..."
                      value={newRequirement}
                      onChange={(e) => setNewRequirement(e.target.value)}
                    />
                    <Button 
                      variant="outline" 
                      onClick={handleAddRequirement}
                      disabled={!newRequirement.trim()}
                    >
                      Aggiungi
                    </Button>
                  </div>
                  
                  {customRequirements.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {customRequirements.map((req, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                          <span className="text-sm">{req}</span>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-red-500 hover:bg-red-50 h-6 w-6 p-0"
                            onClick={() => handleRemoveRequirement(idx)}
                          >
                            &times;
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsPortfolioDialogOpen(false)}>Annulla</Button>
                <Button 
                  onClick={handleGeneratePortfolio} 
                  disabled={!selectedPortfolio || isGeneratingPortfolio}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isGeneratingPortfolio ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Generazione in corso...
                    </>
                  ) : "Genera portafoglio"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  // Se non ci sono dati, mostra il pulsante per generare il profilo
  return (
    <Card className="overflow-hidden border shadow-sm">
      <CardHeader className="bg-white border-b">
        <CardTitle className="flex items-center gap-2 text-gray-800">
          <Brain className="h-5 w-5" />
          Sigmund
        </CardTitle>
        <CardDescription className="text-gray-500">
          Analisi e raccomandazioni basate su intelligenza artificiale
          {lastUpdated && <span className="block text-xs mt-1">Ultimo aggiornamento: {new Date(lastUpdated).toLocaleString('it-IT')}</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-center py-8 text-center space-y-6">
          <div className="bg-gray-50 p-6 rounded-full">
            <Brain className="h-20 w-20 text-gray-500" />
          </div>
          <div className="space-y-2 max-w-lg">
            <h3 className="text-xl font-semibold text-gray-800">
              {profileExists 
                ? t('client.regenerate_profile_title', 'Rigenera profilo AI') 
                : t('client.generate_profile_title')}
            </h3>
            <p className="text-gray-600">
              {profileExists 
                ? "Il profilo AI esiste ma non è stato caricato. Puoi rigenerarlo per ottenere nuove analisi e raccomandazioni."
                : t('client.generate_profile_description')}
            </p>
            {profileExists && (
              <div className="mt-2 text-sm bg-blue-50 p-3 rounded-md text-blue-700 inline-block">
                <div className="flex items-center">
                  <LucideCheckCircle className="h-4 w-4 mr-2 text-blue-600" />
                  <span>Profilo AI già esistente{lastUpdated ? ` (${new Date(lastUpdated).toLocaleDateString('it-IT')})` : ''}</span>
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-4 italic">
            </p>
          </div>
          <Button 
            onClick={handleGenerateProfile} 
            className={`mt-4 ${profileExists ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-800 hover:bg-gray-900'} text-white shadow-sm hover:shadow-md transition-all px-6 py-5`}
            size="lg"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            {profileExists ? 'Rigenera profilo AI' : t('client.generate_profile')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}