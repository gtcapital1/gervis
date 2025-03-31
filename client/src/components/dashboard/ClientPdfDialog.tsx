import React, { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
// Stub per il componente di caricamento
const Loading = () => <div>Caricamento...</div>;
// Stub per le funzioni API
const getClient = (clientId: string) => Promise.resolve({} as any);
const getAssets = (clientId: string) => Promise.resolve([] as any[]);
// Stub per i tipi
interface Asset {
  id?: number;
  clientId?: number;
  category: string;
  value: number;
  description?: string;
  createdAt?: string;
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
  specificQuestions?: string | null;
}
// Fine degli stub

import { ClientPdfGenerator } from "./ClientPdfGenerator";

interface ClientPdfDialogProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
}

export function ClientPdfDialog({ open, onClose, clientId }: ClientPdfDialogProps) {
  const [client, setClient] = useState<ClientSchema | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carica i dati del cliente quando il modale è aperto
  useEffect(() => {
    if (open && clientId) {
      setIsLoading(true);
      
      // Carica i dati del cliente
      getClient(clientId)
        .then((data) => {
          setClient(data);
          // Carica gli asset del cliente
          return getAssets(clientId);
        })
        .then((assetData) => {
          setAssets(assetData);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error("Errore nel caricamento dei dati:", error);
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
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm p-4 flex items-center justify-center z-50">
        <div className="bg-card rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto p-6">
          <h2 className="text-2xl font-bold mb-4">Generazione PDF</h2>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loading />
            </div>
          ) : client ? (
            <ClientPdfGenerator 
              client={client} 
              assets={assets}
              advisorSignature={advisorSignature || undefined}
              companyLogo={companyLogo || undefined}
              companyInfo={companyInfo || undefined}
              onGenerated={onClose}
            />
          ) : (
            <div className="text-center text-destructive">
              Errore nel caricamento dei dati del cliente
            </div>
          )}
          
          <div className="mt-6 flex justify-end">
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
} 