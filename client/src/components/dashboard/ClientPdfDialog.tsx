import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { Loader2, FileSignature, User, Download } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger,
  TooltipProvider 
} from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";

// Componente di caricamento con animazione
const Loading = () => (
  <div className="flex flex-col items-center justify-center space-y-4">
    <Loader2 className="h-10 w-10 animate-spin text-primary" />
    <p className="text-muted-foreground">Caricamento dati in corso...</p>
  </div>
);

// Definizione delle interfacce
interface Asset {
  id: number;
  clientId: number;
  category: string;
  value: number;
  description: string;
  createdAt: string;
}

// Definizione dell'interfaccia per i dati MiFID
interface MifidType {
  id: string;
  clientId: number;
  createdAt: string;
  updatedAt: string;
  address: string;
  phone: string;
  birthDate: string;
  maritalStatus: string;
  employmentStatus: string;
  educationLevel: string;
  annualIncome: number;
  monthlyExpenses: number;
  debts: number;
  dependents: number;
  assets: Asset[];
  investmentHorizon: string;
  retirementInterest: number;
  wealthGrowthInterest: number;
  incomeGenerationInterest: number;
  capitalPreservationInterest: number;
  estatePlanningInterest: number;
  investmentExperience: string;
  pastInvestmentExperience: string[];
  financialEducation: string[];
  riskProfile: string;
  portfolioDropReaction: string;
  volatilityTolerance: string;
  yearsOfExperience: string;
  investmentFrequency: string;
  advisorUsage: string;
  monitoringTime: string;
  specificQuestions: string[] | null;
  assetCategories: string[];
  [key: string]: any; // Per consentire l'accesso a proprietà dinamiche
}

interface ClientSchema {
  id: number;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  birthDate?: string | null;
  maritalStatus?: string | null;
  employmentStatus?: string | null;
  educationLevel?: string | null;
  annualIncome?: number | null;
  monthlyExpenses?: number | null;
  debts?: number | null;
  dependents?: number | null;
  riskProfile?: string | null;
  investmentHorizon?: string | null;
  investmentExperience?: string | null;
  retirementInterest?: number | null;
  wealthGrowthInterest?: number | null;
  incomeGenerationInterest?: number | null;
  capitalPreservationInterest?: number | null;
  estatePlanningInterest?: number | null;
  pastInvestmentExperience?: string[] | null;
  financialEducation?: string[] | null;
  portfolioDropReaction?: string | null;
  volatilityTolerance?: string | null;
  yearsOfExperience?: string | null;
  investmentFrequency?: string | null;
  advisorUsage?: string | null;
  monitoringTime?: string | null;
  specificQuestions?: string[] | null;
  mifid?: MifidType | null;
}

// Risposta API del client
interface ClientApiResponse {
  success: boolean;
  client: ClientSchema;
  assets: Asset[];
  mifid: MifidType | null;
}

// Importa il nuovo componente HtmlPdfGenerator invece di ClientPdfGenerator
import { HtmlPdfGenerator } from "./HtmlPdfGenerator";

interface ClientPdfDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | number;
  onDigitalSignature?: (pdfUrl?: string) => void;
  onTraditionalSignature?: (pdfUrl?: string) => void;
}

export function ClientPdfDialog({ 
  open, 
  onOpenChange, 
  clientId,
  onDigitalSignature,
  onTraditionalSignature
}: ClientPdfDialogProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [clientData, setClientData] = useState<ClientSchema | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  
  // Stato per la modale di scelta firma
  const [signatureOptionsOpen, setSignatureOptionsOpen] = useState(false);

  // Riferimento al componente HtmlPdfGenerator
  const htmlPdfGeneratorRef = useRef<HTMLDivElement>(null);

  // Carica i dati del cliente quando il modale è aperto
  useEffect(() => {
    if (open && clientId) {
      setIsLoading(true);
      setError(null);
      
      // Carica i dati del cliente usando l'API reale
      apiRequest(`/api/clients/${clientId}`)
        .then((response: ClientApiResponse) => {
          
          
          if (response.success && response.client) {
            // Se abbiamo dati MIFID separati, li associamo al client
            const clientWithMifid = {
              ...response.client,
              mifid: response.mifid || null
            };
            
            setClientData(clientWithMifid);
            setAssets(response.assets || []);
          } else {
            setError("Dati cliente non disponibili o formato non valido");
          }
          setIsLoading(false);
        })
        .catch((err) => {
          
          setError("Errore nel caricamento dei dati. Riprova più tardi.");
          setIsLoading(false);
        });
    }
  }, [open, clientId]);

  // Query per recuperare la firma del consulente
  const { data: advisorSignature } = useQuery<string | null>({
    queryKey: ["advisor-signature"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/user/signature", {
          credentials: "include"
        });
        if (!response.ok) return null;
        return response.text();
      } catch (error) {
        
        return null;
      }
    },
    enabled: open
  });

  // Query per recuperare il logo dell'azienda
  const { data: companyLogo } = useQuery<string | null>({
    queryKey: ["company-logo"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/company/logo", {
          credentials: "include"
        });
        if (!response.ok) return null;
        return response.text();
      } catch (error) {
        
        return null;
      }
    },
    enabled: open
  });

  // Query per recuperare le informazioni dell'azienda
  const { data: companyInfo } = useQuery<string | null>({
    queryKey: ["company-info"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/company/info", {
          credentials: "include"
        });
        if (!response.ok) return null;
        return response.text();
      } catch (error) {
        
        return null;
      }
    },
    enabled: open
  });

  // Handler per l'opzione firma digitale
  const handleDigitalSignature = () => {
    // Chiude la modale delle opzioni di firma
    setSignatureOptionsOpen(false);
    
    // Invece di preparare un nuovo PDF, utilizziamo l'URL già salvato sul server
    // Prima, assicuriamoci che il PDF sia già stato salvato sul server
    window.postMessage({ action: 'savePdfToServer' }, '*');
    
    // La risposta arriverà tramite un evento di messaggio, quindi aggiungiamo un listener
    const messageHandler = (event: MessageEvent) => {
      if (event.data && event.data.pdfSavedToServer) {
        // Rimuovi il listener dopo aver ricevuto la risposta
        window.removeEventListener('message', messageHandler);
        
        const serverFileUrl = event.data.serverFileUrl;
        console.log('[DEBUG ClientPdfDialog] PDF salvato sul server con URL:', serverFileUrl);
        
        // Se l'URL del server è disponibile nell'evento, aggiorna lo stato
        if (serverFileUrl) {
          setGeneratedPdfUrl(serverFileUrl);
          
          // Chiama la funzione per la firma digitale passando l'URL del server
          if (onDigitalSignature) {
            onDigitalSignature(serverFileUrl);
          }
        } else {
          // Fallback se l'URL non è disponibile
          toast({
            title: "Errore",
            description: "Non è stato possibile ottenere l'URL del file salvato",
            variant: "destructive"
          });
        }
        
        onOpenChange(false); // Chiude il dialogo del PDF
      }
    };
    window.addEventListener('message', messageHandler);
  };

  // Handler per l'opzione firma tradizionale
  const handleTraditionalSignature = () => {
    // Chiude la modale delle opzioni di firma
    setSignatureOptionsOpen(false);
    
    if (onTraditionalSignature) {
      onTraditionalSignature(generatedPdfUrl || undefined);
    }
    onOpenChange(false); // Chiude il dialogo del PDF
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl p-0 h-[85vh] max-h-[85vh] overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Caricamento dati in corso...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center text-destructive p-6">
              <p className="mb-2 font-medium">{error}</p>
              <p className="text-sm text-muted-foreground">Controlla la connessione e riprova</p>
            </div>
          ) : clientData ? (
            <>
              <div className="flex justify-between items-center p-4 border-b">
                <h2 className="text-xl font-semibold">
                  {t('client.document_preview')}: {clientData.name}
                </h2>
              </div>
              
              <div className="flex-1 overflow-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div ref={htmlPdfGeneratorRef}>
                  <HtmlPdfGenerator 
                    client={clientData} 
                    assets={assets}
                    advisorSignature={advisorSignature || undefined}
                    companyLogo={companyLogo || undefined}
                    companyInfo={companyInfo || undefined}
                    onGenerated={(url) => {
                      if (url) setGeneratedPdfUrl(url);
                    }}
                  />
                </div>
              </div>
              
              <div className="p-4 border-t bg-slate-50 flex justify-between items-center shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
                <Button 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                >
                  Annulla
                </Button>
                
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => setSignatureOptionsOpen(true)}
                >
                  <FileSignature className="h-4 w-4 mr-2" />
                  {t('client.send_for_signature')}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center text-destructive p-6">
              <p className="mb-2 font-medium">Dati cliente non disponibili</p>
              <p className="text-sm text-muted-foreground">Verifica che il cliente abbia completato il processo di onboarding</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modale per le opzioni di firma */}
      <Dialog open={signatureOptionsOpen} onOpenChange={setSignatureOptionsOpen}>
        <DialogContent className="sm:max-w-md flex flex-col items-center p-6">
          <div className="w-full">
            <h2 className="text-xl font-semibold text-center mb-6">Scegli il metodo di firma</h2>
            
            <div className="flex flex-col space-y-4 w-full">
              {/* Pulsante firma digitale (evidenziato) */}
              <Button 
                onClick={handleDigitalSignature}
                className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white text-lg font-medium"
                size="lg"
              >
                <User className="h-5 w-5 mr-3" />
                <div className="flex flex-col items-start">
                  <span>{t('client.digital_signature')}</span>
                  <span className="text-xs font-normal text-blue-100">Consigliato - Verifica con riconoscimento facciale</span>
                </div>
              </Button>
              
              {/* Pulsante firma tradizionale */}
              <Button 
                onClick={handleTraditionalSignature}
                variant="outline"
                className="w-full h-16 text-lg border-gray-300"
                size="lg"
              >
                <FileSignature className="h-5 w-5 mr-3" />
                <div className="flex flex-col items-start">
                  <span>{t('client.traditional_signature')}</span>
                  <span className="text-xs font-normal text-gray-500">Richiede scansione del documento firmato</span>
                </div>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 