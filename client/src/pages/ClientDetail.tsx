import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { 
  ArrowLeft, 
  Send, 
  Edit, 
  PieChart, 
  User, 
  FileText, 
  Home, 
  Briefcase, 
  Calendar, 
  Phone, 
  Mail,
  Check,
  AlertTriangle,
  PlusCircle,
  BarChart,
  Users,
  Settings,
  KeyRound,
  Info,
  Link2,
  MessageSquare,
  Brain,
  MapPin,
  Copy,
  RefreshCw,
  Building2, // Per real estate
  Coins, // Per cash
  LineChart, // Per equity
  Wallet, // Per bonds
  PiggyBank, // Per crypto
  Landmark, // Per commodities
  BriefcaseIcon, // Per alternative
  Banknote, // Per other
  Power
} from "lucide-react";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { ClientEditDialog } from "@/components/dashboard/ClientEditDialog";
import { ClientSettings } from "@/components/settings/ClientSettings";
import { ClientPdfDialog } from "@/components/dashboard/ClientPdfDialog";
import { AiClientProfile } from "@/components/dashboard/AiClientProfile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Client, RISK_PROFILES } from "@shared/schema";
import { UpgradeDialog } from "@/components/pro/UpgradeDialog";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  RadioGroup,
  RadioGroupItem
} from "@/components/ui/radio-group";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PageHeader } from "@/components/ui/page-header";

// Form schema for editing client information
const clientFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxCode: z.string().optional(),
  riskProfile: z.string().nullable(),
});

const mifidFormSchema = z.object({
  // Personal Information
  address: z.string().optional(),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  maritalStatus: z.string().optional(),
  employmentStatus: z.string().optional(),
  educationLevel: z.string().optional(),
  
  // Financial Situation
  annualIncome: z.number().optional(),
  monthlyExpenses: z.number().optional(),
  debts: z.number().optional(),
  dependents: z.number().optional(),
  
  // Investment Profile
  riskProfile: z.string().optional(),
  investmentHorizon: z.string().optional(),
  
  // Investment Goals
  retirementInterest: z.number().optional(),
  wealthGrowthInterest: z.number().optional(),
  incomeGenerationInterest: z.number().optional(),
  capitalPreservationInterest: z.number().optional(),
  estatePlanningInterest: z.number().optional(),
  
  // Investment Experience
  investmentExperience: z.string().optional(),
  pastInvestmentExperience: z.array(z.string()).optional(),
  financialEducation: z.array(z.string()).optional(),
  portfolioDropReaction: z.string().optional(),
  volatilityTolerance: z.string().optional(),
  yearsOfExperience: z.string().optional(),
  investmentFrequency: z.string().optional(),
  advisorUsage: z.string().optional(),
  monitoringTime: z.string().optional(),
  specificQuestions: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;
type MifidFormValues = z.infer<typeof mifidFormSchema>;

// Definizione dell'interfaccia per i parametri di onboarding
interface OnboardingParams {
  language: 'english' | 'italian';
  customMessage: string;
  customSubject?: string;
  sendEmail?: boolean;
}

// Define colors for the pie chart
const COLORS = [
  "#2563eb", // Medium dark blue
  "#3b82f6", // Medium blue
  "#60a5fa", // Medium light blue
  "#93c5fd", // Light blue
  "#1e40af", // Dark blue
  "#2563eb", // Medium dark blue
  "#3b82f6", // Medium blue
  "#bfdbfe"  // Very light blue
];

// Define the asset type to fix TypeScript errors
type AssetType = {
  id: number;
  clientId: number;
  category: string;
  value: number;
  description: string;
  createdAt: string;
};

// Define the MIFID type
type MifidType = {
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
  assets: AssetType[];
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
  specificQuestions: string | null;
};

// Define the query response type
type ClientQueryResponse = {
  success: boolean;
  client: Client;
  assets: AssetType[];
  recommendations: any[];
  mifid: MifidType | null;
};

// Funzione per calcolare il patrimonio netto
const calculateNetWorth = (mifid: MifidType | null): number => {
  if (!mifid) return 0;
  
  // Calcola il totale degli asset
  const totalAssets = mifid.assets.reduce((sum, asset) => sum + asset.value, 0);
  
  // Calcola il patrimonio netto come differenza tra asset e debiti
  return totalAssets - mifid.debts;
};

const InvestmentGoals = ({ mifid }: { mifid: MifidType | null }) => {
  const { t } = useTranslation();
  
  if (!mifid) return null;

  // Crea un array di obiettivi con i loro valori
  const goals = [
    { key: 'retirement_interest', value: mifid.retirementInterest, label: t('investment_goals.retirement_interest') },
    { key: 'wealth_growth_interest', value: mifid.wealthGrowthInterest, label: t('investment_goals.wealth_growth_interest') },
    { key: 'income_generation_interest', value: mifid.incomeGenerationInterest, label: t('investment_goals.income_generation_interest') },
    { key: 'capital_preservation_interest', value: mifid.capitalPreservationInterest, label: t('investment_goals.capital_preservation_interest') },
    { key: 'estate_planning_interest', value: mifid.estatePlanningInterest, label: t('investment_goals.estate_planning_interest') }
  ];

  // Ordina gli obiettivi per valore crescente
  const sortedGoals = [...goals].sort((a, b) => a.value - b.value);

  // Funzione per ottenere il colore della medaglia in base alla posizione
  const getMedalColor = (index: number) => {
    switch (index) {
      case 0: return "bg-yellow-500"; // Oro
      case 1: return "bg-gray-400";   // Argento
      case 2: return "bg-amber-700";  // Bronzo
      default: return "bg-gray-200";  // Altri
    }
  };

  return (
    <div className="space-y-2">
      {sortedGoals.map((goal, index) => (
        <div key={goal.key} className="flex items-center space-x-2">
          <span className={`text-sm font-medium min-w-[2rem] h-6 w-6 rounded-full flex items-center justify-center text-white ${getMedalColor(index)}`}>
            {index + 1}
          </span>
          <span className="text-sm text-gray-600">{goal.label}</span>
        </div>
      ))}
    </div>
  );
};

export default function ClientDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const clientId = parseInt(id || "0");
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { t } = useTranslation();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isConfirmActiveDialogOpen, setIsConfirmActiveDialogOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isMifidEditDialogOpen, setIsMifidEditDialogOpen] = useState(false);
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  
  // Solo stato per l'onboarding link e indicatore di caricamento
  const [isLinkLoading, setIsLoading] = useState(false);
  
  // Redirect if not authenticated
  React.useEffect(() => {
    if (!isAuthLoading && !user) {
      console.log("DEBUG - Utente non autenticato, redirect a /login");
      setLocation("/login");
    }
  }, [user, isAuthLoading, setLocation]);

  // Show loading while checking auth
  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  // Show error if not authenticated
  if (!user) {
    return null; // Will redirect in useEffect
  }
  
  // Fetch client details and MIFID data
  const { 
    data: clientData, 
    isLoading, 
    isError,
    error 
  } = useQuery<ClientQueryResponse>({
    queryKey: ['client', clientId],
    queryFn: async () => {
      console.log("DEBUG - Fetching client data for ID:", clientId);
      const response = await apiRequest(`/api/clients/${clientId}`);
      console.log("DEBUG - API Response:", response);
      
      // La risposta API ha già la struttura corretta
      return response;
    },
    enabled: !isNaN(clientId) && clientId > 0 && !!user
  });
  
  // Estrai il client, gli asset e i dati MIFID dalla risposta
  const client = clientData?.client;
  const mifid = clientData?.mifid;
  
  // Debug logs per verificare i dati
  console.log("DEBUG - Client Data:", clientData);
  console.log("DEBUG - Client:", client);
  console.log("DEBUG - Is Client Onboarded:", client?.isOnboarded);
  console.log("DEBUG - Error:", error);
  
  // Filtra gli asset per mostrare solo quelli con valore maggiore di 0
  const assets = (clientData?.assets || []).filter((asset: AssetType) => asset.value > 0);
  const recommendations = clientData?.recommendations || [];
  
  // Calculate total asset value for percentage calculations
  const totalValue = assets.reduce((sum: number, asset: AssetType) => sum + asset.value, 0);
  
  // Definiamo variabili fittizie per compatibilità con il codice esistente
  const isLoadingAssets = isLoading;
  const refetchAssets = () => {
    // Non fare nulla
  };
  // Usando una funzione che definisce correttamente il tipo
  // Variabile fittizia compatibile con il tipo atteso
  const [forceRefresh, setForceRefresh] = useState<number>(0);

  // For sending onboarding form
  // State for the onboarding link with localStorage persistence
  const [onboardingLink, setOnboardingLink] = useState<string | null>(() => {
    // Inizializza da localStorage se esiste
    const storedLink = localStorage.getItem(`onboardingLink_${clientId}`);
    return storedLink ? storedLink : null;
  });
  
  // La lingua dell'email viene sempre impostata su italiano
  const { i18n } = useTranslation();
  // Impostiamo sempre italiano come lingua predefinita per l'email
  const emailLanguage = "italian";
  const [emailMessage, setEmailMessage] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState<string>("Completa il tuo profilo");
  
  // Initialize default email messages
  const defaultEmailMessages = {
    english: `Dear ${client?.name},

I hope this message finds you well! I'm reaching out personally to invite you to complete your financial profile through our simple onboarding process.

By sharing some information about your financial situation and goals, I'll be able to provide you with truly personalized financial guidance tailored specifically to your needs.

The process is quick and straightforward - it should only take about 5 minutes of your time. Simply click the link below to get started.

Thank you for your trust and partnership.

Warm regards,
${user?.name || ""}`,
    
    italian: `Gentile ${client?.name},

Spero che tu stia bene! Ti scrivo personalmente per invitarti a completare il tuo profilo finanziario attraverso la nostra semplice procedura di onboarding.

Condividendo alcune informazioni sulla tua situazione finanziaria e i tuoi obiettivi, sarò in grado di offrirti una consulenza finanziaria veramente personalizzata e su misura per le tue esigenze.

La procedura è rapida e semplice - richiederà solo circa 5 minuti del tuo tempo. Basta cliccare sul link qui sotto per iniziare.

Grazie per la tua fiducia e collaborazione.`
  };
  
  // Form for editing client information
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      taxCode: "",
      riskProfile: null,
    },
  });
  
  // Form for editing MIFID data
  const mifidForm = useForm<MifidFormValues>({
    resolver: zodResolver(mifidFormSchema),
    defaultValues: {
      // Personal Information
      address: "",
      phone: "",
      birthDate: "",
      maritalStatus: "",
      employmentStatus: "",
      educationLevel: "",
      
      // Financial Situation
      annualIncome: 0,
      monthlyExpenses: 0,
      debts: 0,
      dependents: 0,
      
      // Investment Profile
      riskProfile: "",
      investmentHorizon: "",
      
      // Investment Goals
      retirementInterest: 0,
      wealthGrowthInterest: 0,
      incomeGenerationInterest: 0,
      capitalPreservationInterest: 0,
      estatePlanningInterest: 0,
      
      // Investment Experience
      investmentExperience: "",
      pastInvestmentExperience: [],
      financialEducation: [],
      portfolioDropReaction: "",
      volatilityTolerance: "",
      yearsOfExperience: "",
      investmentFrequency: "",
      advisorUsage: "",
      monitoringTime: "",
      specificQuestions: "",
    },
  });

  // Update form values when client data is loaded
  React.useEffect(() => {
    if (client) {
      form.reset({
        name: client.name,
        email: client.email,
        phone: client.phone || "",
        address: client.address || "",
        taxCode: client.taxCode || "",
        riskProfile: client.riskProfile as any,
      });
    }
  }, [client, form]);

  // Update MIFID form values when MIFID data is loaded
  React.useEffect(() => {
    if (mifid) {
      mifidForm.reset({
        // Personal Information
        address: mifid.address || "",
        phone: mifid.phone || "",
        birthDate: mifid.birthDate || "",
        maritalStatus: mifid.maritalStatus || "",
        employmentStatus: mifid.employmentStatus || "",
        educationLevel: mifid.educationLevel || "",
        
        // Financial Situation
        annualIncome: mifid.annualIncome || 0,
        monthlyExpenses: mifid.monthlyExpenses || 0,
        debts: mifid.debts || 0,
        dependents: mifid.dependents || 0,
        
        // Investment Profile
        riskProfile: mifid.riskProfile || "",
        investmentHorizon: mifid.investmentHorizon || "",
        
        // Investment Goals
        retirementInterest: mifid.retirementInterest || 0,
        wealthGrowthInterest: mifid.wealthGrowthInterest || 0,
        incomeGenerationInterest: mifid.incomeGenerationInterest || 0,
        capitalPreservationInterest: mifid.capitalPreservationInterest || 0,
        estatePlanningInterest: mifid.estatePlanningInterest || 0,
        
        // Investment Experience
        investmentExperience: mifid.investmentExperience || "",
        pastInvestmentExperience: mifid.pastInvestmentExperience || [],
        financialEducation: mifid.financialEducation || [],
        portfolioDropReaction: mifid.portfolioDropReaction || "",
        volatilityTolerance: mifid.volatilityTolerance || "",
        yearsOfExperience: mifid.yearsOfExperience || "",
        investmentFrequency: mifid.investmentFrequency || "",
        advisorUsage: mifid.advisorUsage || "",
        monitoringTime: mifid.monitoringTime || "",
        specificQuestions: mifid.specificQuestions || "",
      });
    }
  }, [mifid, mifidForm]);
  
  // Update client information mutation
  const updateClientMutation = useMutation({
    mutationFn: (data: ClientFormValues) => {
      return apiRequest(`/api/clients/${clientId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}`] });
      setIsEditDialogOpen(false);
      toast({
        title: "Client updated",
        description: "Client information has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update client information. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating MIFID data
  const updateMifidMutation = useMutation({
    mutationFn: (data: MifidFormValues) => {
      return apiRequest(`/api/clients/${clientId}/mifid`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      setIsMifidEditDialogOpen(false);
      toast({
        title: t('client.mifid_updated'),
        description: t('client.mifid_updated_success'),
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('client.mifid_update_failed'),
        variant: "destructive",
      });
    },
  });
  
  // Mutation per gestire l'onboarding
  const sendOnboardingMutation = useMutation({
    mutationFn: (params: OnboardingParams) => {
      console.log("DEBUG - Parametri onboarding:", params);
      
      // IMPORTANTE: Parametro separato "sendEmail" per determinare l'azione
      const isSendingEmail = params.sendEmail === true;
      console.log("DEBUG - isSendingEmail:", isSendingEmail);
      
      return apiRequest(`/api/clients/${clientId}/onboarding-token`, {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },
    onSuccess: (data: { token: string, link: string, language: 'english' | 'italian', emailSent?: boolean }, variables) => {
      // Log per verificare i dati ricevuti dal server
      console.log("DEBUG - Risposta onboarding:", data);
      console.log("DEBUG - Variables usate nella chiamata:", variables);
      
      // Salva il link nel localStorage per persistenza
      localStorage.setItem(`onboardingLink_${clientId}`, data.link);
      setOnboardingLink(data.link);
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}`] });
      
      // MODIFICA CRUCIALE: Usiamo direttamente i parametri della richiesta
      // per determinare quale messaggio toast mostrare
      const didRequestEmailSending = variables.sendEmail === true;
      
      if (didRequestEmailSending) {
        // Se abbiamo richiesto l'invio email, mostra messaggio appropriato
        toast({
          title: t('client.email_sent'),
          description: t('client.email_sent_success'),
        });
        // Il dialog viene già chiuso nella funzione handleSendEmail
      } else {
        // Se è stato solo generato un link, mostra un toast differente
        toast({
          title: t('client.link_generated'),
          description: t('client.link_generated_success'),
        });
        // Non chiudiamo il dialog se stiamo solo generando un link
      }
    },
    onError: (error) => {
      console.error("DEBUG - Errore onboarding:", error);
      toast({
        title: t('common.error'),
        description: t('client.link_generation_failed'),
        variant: "destructive",
      });
    },
  });

  // Funzione per aggiornare lo stato active del cliente
  const updateClientActiveMutation = useMutation({
    mutationFn: async () => {
      console.log(`Invio richiesta per toggle-active del cliente ${clientId}. Stato corrente: ${client?.active}`);
      try {
        // Aggiungi un timestamp per evitare la cache
        const timestamp = new Date().getTime();
        const response = await apiRequest(`/api/clients/${clientId}/toggle-active?t=${timestamp}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json' 
          },
          body: JSON.stringify({ active: !client?.active }),
        });
        
        // Controlla se la risposta è HTML invece di JSON (errore comune)
        if (typeof response === 'string' && response.includes('<!doctype html>')) {
          console.error('Ricevuta risposta HTML invece di JSON:', response.substring(0, 100));
          throw new Error('Risposta del server non valida: ricevuto HTML invece di JSON');
        }
        
        console.log('Risposta ricevuta:', response);
        
        // In caso di risposta non valida, forzare un refresh della pagina dopo 1 secondo 
        // per aggirare il problema
        if (!response || !response.success) {
          setTimeout(() => {
            console.log('Forzatura refresh pagina per aggirare errore risposta');
            window.location.reload();
          }, 1000);
          
          throw new Error(response?.message || 'Errore sconosciuto');
        }
        
        return response;
      } catch (error) {
        console.error('Errore catturato nella chiamata API:', error);
        // In caso di errore, forzare un refresh della pagina dopo 1 secondo
        setTimeout(() => {
          console.log('Forzatura refresh pagina dopo errore');
          window.location.reload();
        }, 1000);
        throw error;
      }
    },
    onSuccess: (response) => {
      console.log('Mutation completata con successo:', response);
      toast({ 
        title: client?.active 
          ? t('client.deactivation_successful') 
          : t('client.activation_successful'),
        description: client?.active 
          ? t('client.client_deactivated') 
          : t('client.client_activated'),
      });
      // Ricarica i dati del cliente
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
    },
    onError: (error: any) => {
      console.error('Errore dettagliato:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('client.status_update_error'),
        variant: 'destructive',
      });
    },
  });

  function onSubmit(data: ClientFormValues) {
    updateClientMutation.mutate(data);
  }

  function onSubmitMifid(data: MifidFormValues) {
    updateMifidMutation.mutate(data);
  }
  
  // Funzione per generare link di onboarding (cerca questa funzione esistente)
  const handleGenerateOnboardingLink = async (e?: React.MouseEvent) => {
    // Se è un evento, previeni il comportamento default
    if (e && e.preventDefault) e.preventDefault();
    
    setIsLoading(true);
    try {
      const payload = {
        language: 'italian' // Hardcoded per ora, ma puoi rendere parametrizzabile
      };
      
      console.log(`Generazione link onboarding per cliente ${clientId}...`);
      
      // Modifica l'endpoint per usare onboarding-token invece di onboarding-email
      const response = await apiRequest(`/api/clients/${clientId}/onboarding-token`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      console.log("Risposta API generazione token completa:", response);
      
      // IMPORTANTE: Considera sempre la risposta un successo a meno che non ci sia un messaggio di errore esplicito
      // e il campo 'success' è falso
      const isSuccess = !(response.success === false && response.message);
      
      if (isSuccess) {
        // Verifica diverse possibili chiavi che potrebbero contenere il link
        const onboardingLink = response.link || response.onboardingLink || (response.token ? 
          `${window.location.origin}/onboarding?token=${response.token}` : null);
        
        console.log("Link estratto:", onboardingLink);
        
        if (onboardingLink) {
          localStorage.setItem(`onboardingLink_${clientId}`, onboardingLink);
          setOnboardingLink(onboardingLink);
          
          // Copiamo il link negli appunti se possibile
          if (navigator.clipboard) {
            try {
              await navigator.clipboard.writeText(onboardingLink);
              toast({
                title: t('client.link_generated') || "Link generato",
                description: t('client.link_generated_success') || "Il link di onboarding è stato generato e copiato negli appunti",
                duration: 5000
              });
            } catch (clipboardError) {
              // Se fallisce la copia, mostra comunque un messaggio di successo
              console.warn("Non è stato possibile copiare automaticamente il link negli appunti:", clipboardError);
              toast({
                title: t('client.link_generated') || "Link generato",
                description: (t('client.link_generated_no_copy') || "Il link di onboarding è stato generato. Usare il pulsante Copia per copiarlo negli appunti."),
                duration: 5000
              });
            }
          } else {
            // Se clipboard API non è disponibile
            toast({
              title: t('client.link_generated') || "Link generato",
              description: (t('client.link_generated_no_copy') || "Il link di onboarding è stato generato. Usare il pulsante Copia per copiarlo negli appunti."),
              duration: 5000
            });
          }
          
          // Aggiorniamo i dati del cliente
          queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}`] });
        } else {
          console.error("Link non trovato nella risposta. Proprietà disponibili:", Object.keys(response));
          toast({
            title: t('client.link_generated') || "Link generato",
            description: t('client.link_generated_success') || "Il link di onboarding è stato generato",
            duration: 5000
          });
        }
      } else {
        console.error("Errore durante la generazione del link:", response.message || "Nessun messaggio di errore");
        toast({
          title: t('error') || "Errore",
          description: response.message || (t('client.link_generation_failed') || "Impossibile generare il link di onboarding"),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error generating onboarding link:', error);
      toast({
        title: t('error') || "Errore",
        description: t('client.link_generation_failed') || "Impossibile generare il link di onboarding",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Funzione per inviare il link di onboarding via email
  const handleSendOnboardingEmail = async (e: React.MouseEvent<HTMLButtonElement> | undefined) => {
    // Preveniamo il comportamento di default dell'evento
    if (e) e.preventDefault();
    
    console.log("handleSendOnboardingEmail chiamata");
    
    if (!onboardingLink) {
      toast({
        title: t('error') || "Errore",
        description: t('client.generate_link_first') || "Genera prima un link di onboarding",
        variant: "destructive"
      });
      return;
    }
    
    // Invia direttamente l'email con il messaggio predefinito italiano
    setIsLoading(true);
    try {
      // Assicurati che abbiamo il token di onboarding, non il link completo
      const tokenMatch = onboardingLink.match(/token=([^&]+)/);
      const token = tokenMatch ? tokenMatch[1] : null;
      
      if (!token) {
        throw new Error("Token non trovato nel link di onboarding");
      }
      
      // Usa il messaggio email predefinito in italiano
      const standardEmailMessage = defaultEmailMessages["italian"];
      
      const payload = {
        language: 'italian',
        sendEmail: true,
        customMessage: standardEmailMessage,
        customSubject: "Completa il tuo profilo",
        token: token
      };
      
      console.log(`Invio email onboarding per cliente ${clientId} con token ${token}...`);
      console.log("Payload:", payload);
      
      const response = await apiRequest(`/api/clients/${clientId}/onboarding-email`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      console.log("Risposta API invio email:", response);
      
      if (response.success) {
        toast({
          title: t('client.email_sent') || "Email inviata",
          description: t('client.email_sent_success') || "L'email di onboarding è stata inviata con successo",
          duration: 5000
        });
      } else {
        // Verifica se è un errore di configurazione email
        if (response.configurationRequired) {
          toast({
            title: t('client.email_config_error') || "Configurazione email mancante",
            description: t('client.email_config_error_desc') || "È necessario configurare un server SMTP nelle impostazioni utente per inviare email",
            variant: "destructive",
            duration: 10000
          });
        } else {
          toast({
            title: t('error') || "Errore",
            description: response.message || (t('client.onboarding_email_error') || "Impossibile inviare l'email di onboarding"),
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Error sending onboarding email:', error);
      toast({
        title: t('error') || "Errore",
        description: t('client.onboarding_email_error') || "Impossibile inviare l'email di onboarding",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  function handleGenerateNewLink() {
    // Reset del link esistente e generazione di uno nuovo
    localStorage.removeItem(`onboardingLink_${clientId}`);
    setOnboardingLink(null);
    handleGenerateOnboardingLink();
  }
  
  function formatDate(date: Date | string | null) {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  }
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <p>{t('client.loading_details')}</p>
      </div>
    );
  }
  
  if (isError || !client) {
    return (
      <div className="flex flex-col justify-center items-center h-full space-y-4">
        <p className="text-destructive">{t('client.error_loading')}</p>
        <Button variant="outline" onClick={() => setLocation("/app")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('client.back_to_dashboard')}
        </Button>
      </div>
    );
  }

  // Check if client is onboarded - simplified to only check isOnboarded
  if (!client.isOnboarded) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/dashboard")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-bold">{client.name}</h1>
            </div>
            {/* Rimuoviamo i bottoni da qui, li avremo solo nel container principale */}
          </div>

          {/* Onboarding Required Message */}
          <Card>
            <CardHeader>
              <CardTitle>{t('client.onboarding_required')}</CardTitle>
              <CardDescription>
                {t('client.onboarding_required_description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-6 space-y-6">
                {/* Cambiamo l'icona per qualcosa di più amichevole */}
                <Mail className="h-14 w-14 text-blue-500" />
                <p className="text-center text-muted-foreground">
                  {t('client.onboard_first')}
                </p>
                <div className="flex space-x-4">
                  <Button 
                    variant="default" 
                    size="lg"
                    onClick={handleGenerateOnboardingLink}
                    disabled={isLinkLoading}
                    className="bg-accent hover:bg-accent/90"
                  >
                    <Link2 className="mr-2 h-4 w-4" />
                    {isLinkLoading ? t('common.generating') : t('client.generate_link')}
                  </Button>
                  {onboardingLink && (
                    <Button 
                      variant="default" 
                      size="lg"
                      onClick={handleSendOnboardingEmail}
                      disabled={isLinkLoading}
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {isLinkLoading ? t('client.sending') : t('client.send_email')}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Onboarding Link Section */}
          {onboardingLink && (
            <Card>
              <CardHeader>
                <CardTitle>{t('client.onboarding_link')}</CardTitle>
                <CardDescription>
                  {t('client.onboarding_link_description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center space-x-2">
                    <Input
                      readOnly
                      value={onboardingLink}
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(onboardingLink);
                        toast({
                          title: t('common.copied'),
                          description: t('common.link_copied'),
                        });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={handleGenerateNewLink}
                      disabled={isLinkLoading}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {isLinkLoading ? t('common.generating') : t('client.generate_new_link')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/dashboard")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">{client?.name}</h1>
            {client?.isOnboarded && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation(`/app/clients/${clientId}/edit-mifid`)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {t('common.edit')}
                </Button>
                <div className="flex items-center ml-2">
                  <Badge 
                    variant={client?.active ? "default" : "destructive"}
                    className="flex items-center pl-2 pr-1 py-0.5 h-8"
                  >
                    <span className="mr-2">
                      {client?.active ? 
                        <span className="text-white">Attivo</span> : 
                        <span className="text-white">Prospect</span>
                      }
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-white/20"
                      onClick={() => setIsConfirmActiveDialogOpen(true)}
                    >
                      <Edit className="h-3 w-3 text-white" />
                    </Button>
                  </Badge>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {client?.isOnboarded ? (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setLocation(`/clients/${clientId}/logs`)}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {t('client.logs')}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowPdfDialog(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {t('client.generate_pdf')}
                </Button>
              </>
            ) : null}
            {/* Rimuoviamo i bottoni da qui */}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6">
          {/* Personal Information and Financial Situation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column: Personal Information */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">{t('client.personal_info')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mifid && (
                    <>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 opacity-70" />
                        <span className="text-sm text-muted-foreground mr-2">{t('client.address')}:</span>
                        <span>{mifid.address}</span>
                      </div>
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 opacity-70" />
                        <span className="text-sm text-muted-foreground mr-2">{t('client.phone')}:</span>
                        <span>{mifid.phone}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 opacity-70" />
                        <span className="text-sm text-muted-foreground mr-2">{t('client.birth_date')}:</span>
                        <span>{mifid.birthDate}</span>
                      </div>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 opacity-70" />
                        <span className="text-sm text-muted-foreground mr-2">{t('client.marital_status')}:</span>
                        <span>{t(`marital_status.${mifid.maritalStatus}`)}</span>
                      </div>
                      <div className="flex items-center">
                        <Briefcase className="h-4 w-4 mr-2 opacity-70" />
                        <span className="text-sm text-muted-foreground mr-2">{t('client.employment_status')}:</span>
                        <span>{t(`employment_status.${mifid.employmentStatus}`)}</span>
                      </div>
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2 opacity-70" />
                        <span className="text-sm text-muted-foreground mr-2">{t('client.education_level')}:</span>
                        <span>{t(`education_levels.${mifid.educationLevel}`)}</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Right column: Financial Situation */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">{t('client.current_financial_situation')}</CardTitle>
              </CardHeader>
              <CardContent>
                {mifid && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left column - Income & Expenses */}
                      <div className="space-y-4">
                        <div>
                          <span className="text-sm text-muted-foreground block">{t('client.annual_income')}:</span>
                          <span className="text-lg font-medium">€{mifid.annualIncome.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground block">{t('client.monthly_expenses')}:</span>
                          <span className="text-lg font-medium">€{mifid.monthlyExpenses.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground block">{t('client.dependents')}:</span>
                          <span className="text-lg font-medium">{mifid.dependents}</span>
                        </div>
                      </div>

                      {/* Right column - Assets & Net Worth */}
                      <div className="space-y-4">
                        <div>
                          <span className="text-sm text-muted-foreground block">{t('client.total_assets')}:</span>
                          <span className="text-lg font-medium">€{client.totalAssets?.toLocaleString() || '0'}</span>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground block">{t('client.debts')}:</span>
                          <span className="text-lg font-medium">€{mifid.debts.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground block">{t('client.net_worth')}:</span>
                          <span className="text-lg font-medium">€{client.netWorth?.toLocaleString() || '0'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Client Segment - Centered below */}
                    <div className="flex flex-col items-center pt-4 border-t">
                      <span className="text-sm text-muted-foreground mb-2">{t('client.segment')}:</span>
                      <Badge 
                        variant="outline" 
                        className="capitalize px-4 py-1.5 text-base"
                        style={{
                          backgroundColor: 
                            client.clientSegment === "mass_market" ? "#93c5fd" : // Light blue
                            client.clientSegment === "affluent" ? "#60a5fa" : // Medium light blue
                            client.clientSegment === "hnw" ? "#3b82f6" : // Medium blue
                            client.clientSegment === "vhnw" ? "#2563eb" : // Medium dark blue
                            client.clientSegment === "uhnw" ? "#1e40af" : // Dark blue
                            "#6b7280", // Gray default
                          color: "#ffffff"
                        }}
                      >
                        {client.clientSegment ? t(`client.segments.${client.clientSegment}`) : t('client.not_specified')}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Investment Profile */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">{t('client.investment_profile')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left column: Risk Profile and Investment Horizon */}
                <div className="space-y-4">
                  {mifid && (
                    <>
                      <div>
                        <span className="text-sm text-muted-foreground block mb-2">{t('client.risk_profile')}:</span>
                        <Badge 
                          className="capitalize"
                          style={{
                            backgroundColor: 
                              mifid.riskProfile === "conservative" ? "#93c5fd" : // Light blue
                              mifid.riskProfile === "moderate" ? "#60a5fa" : // Medium light blue
                              mifid.riskProfile === "balanced" ? "#3b82f6" : // Medium blue
                              mifid.riskProfile === "growth" ? "#2563eb" : // Medium dark blue
                              mifid.riskProfile === "aggressive" ? "#1e40af" : // Dark blue
                              "#6b7280", // Gray default
                            color: "#ffffff"
                          }}
                        >
                          {t(`risk_profiles.${mifid.riskProfile}`)}
                        </Badge>
                      </div>
                      
                      <div>
                        <span className="text-sm text-muted-foreground block mb-2">{t('client.investment_experience')}:</span>
                        <Badge 
                          className="capitalize"
                          style={{
                            backgroundColor: 
                              mifid.investmentExperience === "none" ? "#93c5fd" : // Light blue
                              mifid.investmentExperience === "beginner" ? "#60a5fa" : // Medium light blue
                              mifid.investmentExperience === "intermediate" ? "#3b82f6" : // Medium blue
                              mifid.investmentExperience === "advanced" ? "#2563eb" : // Medium dark blue
                              mifid.investmentExperience === "expert" ? "#1e40af" : // Dark blue
                              "#6b7280", // Gray default
                            color: "#ffffff"
                          }}
                        >
                          {t(`experience_levels.${mifid.investmentExperience}`)}
                        </Badge>
                      </div>
                      
                      <div>
                        <span className="text-sm text-muted-foreground block mb-2">{t('client.investment_horizon')}:</span>
                        <Badge 
                          className="capitalize"
                          style={{
                            backgroundColor: 
                              mifid.investmentHorizon === "short_term" ? "#93c5fd" : // Light blue
                              mifid.investmentHorizon === "medium_term" ? "#3b82f6" : // Medium blue
                              mifid.investmentHorizon === "long_term" ? "#1e40af" : // Dark blue
                              "#6b7280", // Gray default
                            color: mifid.investmentHorizon === "short_term" ? "#1e3a8a" : "#ffffff"
                          }}
                        >
                          {t(`investment_horizons.${mifid.investmentHorizon}`)}
                        </Badge>
                      </div>
                    </>
                  )}
                </div>
                
                {/* Right column: Investment Goals */}
                <div className="space-y-4">
                  <span className="text-sm text-muted-foreground block mb-2">{t('client.investment_goals')}:</span>
                  <InvestmentGoals mifid={mifid} />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Asset Allocation */}
          {assets.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">{t('client.asset_allocation')}</CardTitle>
                <CardDescription>
                  {t('client.portfolio_snapshot')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left side: Asset list */}
                  <div>
                    <h3 className="text-lg font-medium mb-3">{t('client.asset_details')}</h3>
                    <div className="space-y-2">
                      {assets.map((asset) => {
                        // Funzione per ottenere l'icona appropriata in base alla categoria
                        const getAssetIcon = (category: string) => {
                          switch (category.toLowerCase()) {
                            case 'real_estate':
                              return <Building2 className="h-4 w-4 mr-2" />;
                            case 'equity':
                              return <LineChart className="h-4 w-4 mr-2" />;
                            case 'bonds':
                              return <Wallet className="h-4 w-4 mr-2" />;
                            case 'cash':
                              return <Coins className="h-4 w-4 mr-2" />;
                            case 'crypto':
                              return <PiggyBank className="h-4 w-4 mr-2" />;
                            case 'commodities':
                              return <Landmark className="h-4 w-4 mr-2" />;
                            case 'alternative':
                              return <BriefcaseIcon className="h-4 w-4 mr-2" />;
                            default:
                              return <Banknote className="h-4 w-4 mr-2" />;
                          }
                        };

                        return (
                          <div key={asset.id} className="flex items-center justify-between p-2 border rounded bg-white">
                            <div className="flex items-center">
                              {getAssetIcon(asset.category)}
                              <span className="font-medium capitalize">{t(`asset_categories.${asset.category}`)}</span>
                            </div>
                            <div className="font-semibold">€{asset.value.toLocaleString()}</div>
                          </div>
                        );
                      })}
                      <div className="flex items-center justify-between p-2 border-t pt-3 mt-3">
                        <div className="font-semibold">{t('client.total')}</div>
                        <div className="font-bold">€{totalValue.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right side: Pie chart */}
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={assets}
                          dataKey="value"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, value }) => {
                            // Formatta il valore in formato compatto (es. 100k, 1.1m)
                            const formatValue = (val: number) => {
                              if (val >= 1000000) {
                                return `${(val / 1000000).toFixed(1)}m`;
                              } else if (val >= 1000) {
                                return `${(val / 1000).toFixed(0)}k`;
                              }
                              return val.toString();
                            };
                            return `${t(`asset_categories.${name}`)} (${formatValue(value)})`;
                          }}
                        >
                          {assets.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => `€${value.toLocaleString()}`}
                          labelFormatter={(label) => t(`asset_categories.${label}`)}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
          
          {/* Contenitore per Sigmund */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>
                {t('client.ai_analysis_center') || "Centro Analisi AI"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Sigmund (ex AI Profile) */}
              <div className="space-y-4">
                {client?.isOnboarded ? (
                  <AiClientProfile clientId={clientId} />
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>Sigmund</CardTitle>
                      <CardDescription>
                        {t('client.profile_incomplete_description')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col items-center justify-center py-6 space-y-4">
                        <AlertTriangle className="h-12 w-12 text-amber-500" />
                        <p className="text-center text-muted-foreground">
                          {t('client.onboard_first') || "Il cliente deve prima completare il processo di onboarding per poter generare un profilo IA."}
                        </p>
                        {!client?.onboardingToken && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleGenerateOnboardingLink}
                            disabled={isLinkLoading}
                          >
                            <Link2 className="mr-2 h-4 w-4" />
                            {isLinkLoading ? t('common.generating') : t('client.generate_onboarding_link')}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
              {recommendations.map((rec, index) => (
                <div key={index} className="p-4 border rounded-lg bg-white">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                        <Brain className="h-4 w-4 text-accent" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="font-medium">{rec.title}</h4>
                      <p className="text-sm text-muted-foreground">{rec.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Edit Client Information Dialog */}
      {client && (
        <ClientEditDialog
          client={client}
          assets={assets}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          clientId={clientId}
          onAssetsUpdated={() => {
            // Increment force refresh counter to force a query cache bypass
            setForceRefresh(forceRefresh + 1);
            // Also directly refetch assets
            refetchAssets();
          }}
        />
      )}
      
      {/* PRO feature upgrade dialog */}
      {user && (
        <UpgradeDialog
          open={isUpgradeOpen}
          onOpenChange={setIsUpgradeOpen}
          userId={user.id}
        />
      )}

      {/* Dialog per la modifica dei dati MIFID */}
      <Dialog open={isMifidEditDialogOpen} onOpenChange={setIsMifidEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('client.edit_mifid_data')}</DialogTitle>
            <DialogDescription>
              {t('client.edit_mifid_description')}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={mifidForm.handleSubmit(onSubmitMifid)} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('client.personal_info')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address">{t('client.address')}</Label>
                  <Input
                    id="address"
                    {...mifidForm.register("address")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('client.phone')}</Label>
                  <Input
                    id="phone"
                    {...mifidForm.register("phone")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthDate">{t('client.birth_date')}</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    {...mifidForm.register("birthDate")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maritalStatus">{t('client.marital_status')}</Label>
                  <Select 
                    value={mifidForm.watch("maritalStatus")} 
                    onValueChange={(value) => mifidForm.setValue("maritalStatus", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('client.select_marital_status')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">{t('marital_status.single')}</SelectItem>
                      <SelectItem value="married">{t('marital_status.married')}</SelectItem>
                      <SelectItem value="divorced">{t('marital_status.divorced')}</SelectItem>
                      <SelectItem value="widowed">{t('marital_status.widowed')}</SelectItem>
                      <SelectItem value="separated">{t('marital_status.separated')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employmentStatus">{t('client.employment_status')}</Label>
                  <Select 
                    value={mifidForm.watch("employmentStatus")} 
                    onValueChange={(value) => mifidForm.setValue("employmentStatus", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('client.select_employment_status')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employed">{t('employment_status.employed')}</SelectItem>
                      <SelectItem value="unemployed">{t('employment_status.unemployed')}</SelectItem>
                      <SelectItem value="self_employed">{t('employment_status.self_employed')}</SelectItem>
                      <SelectItem value="retired">{t('employment_status.retired')}</SelectItem>
                      <SelectItem value="student">{t('employment_status.student')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="educationLevel">{t('client.education_level')}</Label>
                  <Select 
                    value={mifidForm.watch("educationLevel")} 
                    onValueChange={(value) => mifidForm.setValue("educationLevel", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('client.select_education_level')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high_school">{t('education_levels.high_school')}</SelectItem>
                      <SelectItem value="bachelor">{t('education_levels.bachelor')}</SelectItem>
                      <SelectItem value="master">{t('education_levels.master')}</SelectItem>
                      <SelectItem value="phd">{t('education_levels.phd')}</SelectItem>
                      <SelectItem value="other">{t('education_levels.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Financial Situation */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('client.current_financial_situation')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="annualIncome">{t('client.annual_income')}</Label>
                  <Input
                    id="annualIncome"
                    type="number"
                    {...mifidForm.register("annualIncome", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyExpenses">{t('client.monthly_expenses')}</Label>
                  <Input
                    id="monthlyExpenses"
                    type="number"
                    {...mifidForm.register("monthlyExpenses", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="debts">{t('client.debts')}</Label>
                  <Input
                    id="debts"
                    type="number"
                    {...mifidForm.register("debts", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dependents">{t('client.dependents')}</Label>
                  <Input
                    id="dependents"
                    type="number"
                    {...mifidForm.register("dependents", { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>

            {/* Investment Profile */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('client.investment_profile')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="riskProfile">{t('client.risk_profile')}</Label>
                  <Select 
                    value={mifidForm.watch("riskProfile")} 
                    onValueChange={(value) => mifidForm.setValue("riskProfile", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('client.select_risk_profile')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conservative">{t('risk_profiles.conservative')}</SelectItem>
                      <SelectItem value="moderate">{t('risk_profiles.moderate')}</SelectItem>
                      <SelectItem value="balanced">{t('risk_profiles.balanced')}</SelectItem>
                      <SelectItem value="growth">{t('risk_profiles.growth')}</SelectItem>
                      <SelectItem value="aggressive">{t('risk_profiles.aggressive')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="investmentHorizon">{t('client.investment_horizon')}</Label>
                  <Select 
                    value={mifidForm.watch("investmentHorizon")} 
                    onValueChange={(value) => mifidForm.setValue("investmentHorizon", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('client.select_investment_horizon')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short_term">{t('investment_horizons.short_term')}</SelectItem>
                      <SelectItem value="medium_term">{t('investment_horizons.medium_term')}</SelectItem>
                      <SelectItem value="long_term">{t('investment_horizons.long_term')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Investment Goals */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('client.investment_goals')}</h3>
              <InvestmentGoals mifid={mifid} />
            </div>

            {/* Investment Experience */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('client.investment_experience')}</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="investmentExperience">{t('client.investment_experience_level')}</Label>
                  <Select 
                    value={mifidForm.watch("investmentExperience")} 
                    onValueChange={(value) => mifidForm.setValue("investmentExperience", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('client.select_investment_experience')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('investment_experience.none')}</SelectItem>
                      <SelectItem value="limited">{t('investment_experience.limited')}</SelectItem>
                      <SelectItem value="good">{t('investment_experience.good')}</SelectItem>
                      <SelectItem value="extensive">{t('investment_experience.extensive')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('client.past_investment_experience')}</Label>
                  <div className="space-y-2">
                    {['stocks', 'bonds', 'mutual_funds', 'etfs', 'real_estate', 'crypto'].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={type}
                          checked={mifidForm.watch("pastInvestmentExperience")?.includes(type)}
                          onChange={(e) => {
                            const current = mifidForm.watch("pastInvestmentExperience") || [];
                            if (e.target.checked) {
                              mifidForm.setValue("pastInvestmentExperience", [...current, type]);
                            } else {
                              mifidForm.setValue("pastInvestmentExperience", current.filter(t => t !== type));
                            }
                          }}
                        />
                        <Label htmlFor={type}>{t(`investment_types.${type}`)}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('client.financial_education')}</Label>
                  <div className="space-y-2">
                    {['courses', 'books', 'seminars', 'online_resources', 'professional_advice'].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={type}
                          checked={mifidForm.watch("financialEducation")?.includes(type)}
                          onChange={(e) => {
                            const current = mifidForm.watch("financialEducation") || [];
                            if (e.target.checked) {
                              mifidForm.setValue("financialEducation", [...current, type]);
                            } else {
                              mifidForm.setValue("financialEducation", current.filter(t => t !== type));
                            }
                          }}
                        />
                        <Label htmlFor={type}>{t(`education_types.${type}`)}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="portfolioDropReaction">{t('client.portfolio_drop_reaction')}</Label>
                  <Select 
                    value={mifidForm.watch("portfolioDropReaction")} 
                    onValueChange={(value) => mifidForm.setValue("portfolioDropReaction", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('client.select_portfolio_drop_reaction')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sell">{t('portfolio_reactions.sell')}</SelectItem>
                      <SelectItem value="hold">{t('portfolio_reactions.hold')}</SelectItem>
                      <SelectItem value="buy">{t('portfolio_reactions.buy')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="volatilityTolerance">{t('client.volatility_tolerance')}</Label>
                  <Select 
                    value={mifidForm.watch("volatilityTolerance")} 
                    onValueChange={(value) => mifidForm.setValue("volatilityTolerance", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('client.select_volatility_tolerance')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t('volatility_tolerance.low')}</SelectItem>
                      <SelectItem value="medium">{t('volatility_tolerance.medium')}</SelectItem>
                      <SelectItem value="high">{t('volatility_tolerance.high')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="yearsOfExperience">{t('client.years_of_experience')}</Label>
                  <Select 
                    value={mifidForm.watch("yearsOfExperience")} 
                    onValueChange={(value) => mifidForm.setValue("yearsOfExperience", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('client.select_years_of_experience')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('years_experience.none')}</SelectItem>
                      <SelectItem value="less_than_1">{t('years_experience.less_than_1')}</SelectItem>
                      <SelectItem value="1_to_3">{t('years_experience.1_to_3')}</SelectItem>
                      <SelectItem value="3_to_5">{t('years_experience.3_to_5')}</SelectItem>
                      <SelectItem value="more_than_5">{t('years_experience.more_than_5')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="investmentFrequency">{t('client.investment_frequency')}</Label>
                  <Select 
                    value={mifidForm.watch("investmentFrequency")} 
                    onValueChange={(value) => mifidForm.setValue("investmentFrequency", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('client.select_investment_frequency')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">{t('investment_frequency.monthly')}</SelectItem>
                      <SelectItem value="quarterly">{t('investment_frequency.quarterly')}</SelectItem>
                      <SelectItem value="annually">{t('investment_frequency.annually')}</SelectItem>
                      <SelectItem value="irregular">{t('investment_frequency.irregular')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="advisorUsage">{t('client.advisor_usage')}</Label>
                  <Select 
                    value={mifidForm.watch("advisorUsage")} 
                    onValueChange={(value) => mifidForm.setValue("advisorUsage", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('client.select_advisor_usage')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_service">{t('advisor_usage.full_service')}</SelectItem>
                      <SelectItem value="partial_service">{t('advisor_usage.partial_service')}</SelectItem>
                      <SelectItem value="self_managed">{t('advisor_usage.self_managed')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monitoringTime">{t('client.monitoring_time')}</Label>
                  <Select 
                    value={mifidForm.watch("monitoringTime")} 
                    onValueChange={(value) => mifidForm.setValue("monitoringTime", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('client.select_monitoring_time')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">{t('monitoring_time.daily')}</SelectItem>
                      <SelectItem value="weekly">{t('monitoring_time.weekly')}</SelectItem>
                      <SelectItem value="monthly">{t('monitoring_time.monthly')}</SelectItem>
                      <SelectItem value="quarterly">{t('monitoring_time.quarterly')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specificQuestions">{t('client.specific_questions')}</Label>
                  <Textarea
                    id="specificQuestions"
                    {...mifidForm.register("specificQuestions")}
                    placeholder={t('client.specific_questions_placeholder')}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsMifidEditDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={updateMifidMutation.isPending}>
                {updateMifidMutation.isPending ? t('common.saving') : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* PDF Dialog */}
      {showPdfDialog && (
        <ClientPdfDialog
          clientId={clientId}
          open={showPdfDialog}
          onOpenChange={setShowPdfDialog}
        />
      )}

      {/* Dialog di conferma per cambiare lo stato active */}
      <Dialog open={isConfirmActiveDialogOpen} onOpenChange={setIsConfirmActiveDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {client?.active ? t('client.confirm_deactivation') : t('client.confirm_activation')}
            </DialogTitle>
            <DialogDescription>
              {client?.active 
                ? t('client.deactivation_description') 
                : t('client.activation_description')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsConfirmActiveDialogOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button 
              variant={client?.active ? "destructive" : "default"}
              onClick={() => {
                updateClientActiveMutation.mutate();
                setIsConfirmActiveDialogOpen(false);
              }}
              disabled={updateClientActiveMutation.isPending}
            >
              {updateClientActiveMutation.isPending 
                ? t('common.processing') 
                : client?.active 
                  ? t('client.confirm_deactivate') 
                  : t('client.confirm_activate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}