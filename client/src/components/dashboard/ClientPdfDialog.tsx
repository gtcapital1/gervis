import React, { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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
}

export function ClientPdfDialog({ open, onOpenChange, clientId }: ClientPdfDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [clientData, setClientData] = useState<ClientSchema | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Carica i dati del cliente quando il modale è aperto
  useEffect(() => {
    if (open && clientId) {
      setIsLoading(true);
      setError(null);
      
      // Carica i dati del cliente usando l'API reale
      apiRequest(`/api/clients/${clientId}`)
        .then((response: ClientApiResponse) => {
          console.log("Dati cliente ricevuti:", response);
          
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
          console.error("Errore nel caricamento dei dati cliente:", err);
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
        console.error("Errore nel recupero della firma:", error);
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
        console.error("Errore nel recupero del logo:", error);
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
        console.error("Errore nel recupero delle info aziendali:", error);
        return null;
      }
    },
    enabled: open
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm p-4 flex items-center justify-center z-50">
        <div className="bg-card rounded-lg shadow-lg w-full max-w-screen-xl max-h-[90vh] overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loading />
            </div>
          ) : error ? (
            <div className="text-center text-destructive p-6">
              <p className="mb-2 font-medium">{error}</p>
              <p className="text-sm text-muted-foreground">Controlla la connessione e riprova</p>
            </div>
          ) : clientData ? (
            <HtmlPdfGenerator 
              client={clientData} 
              assets={assets}
              advisorSignature={advisorSignature || undefined}
              companyLogo={companyLogo || undefined}
              companyInfo={companyInfo || undefined}
              onGenerated={() => onOpenChange(false)}
            />
          ) : (
            <div className="text-center text-destructive p-6">
              <p className="mb-2 font-medium">Dati cliente non disponibili</p>
              <p className="text-sm text-muted-foreground">Verifica che il cliente abbia completato il processo di onboarding</p>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
} 