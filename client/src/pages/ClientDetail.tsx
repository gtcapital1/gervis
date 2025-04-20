import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Power,
  AlertCircle, 
  CalendarClock,
  UploadCloud,
  Download,
  ExternalLink,
  PenSquare,
  PenLine,
  Fingerprint,
  ChevronDown
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
import ClientLogList from "@/components/ClientLogList";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as DatePicker } from "@/components/ui/calendar";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import AddLogDialog from "@/components/AddLogDialog";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DigitalSignatureDialog } from "@/components/dashboard/DigitalSignatureDialog";
import { TraditionalSignatureDialog } from "@/components/dashboard/TraditionalSignatureDialog";
import { VerifiedDocumentsTable } from "@/components/VerifiedDocumentsTable";
import { MifidTab } from "@/components/dashboard/MifidTab";

// Importa il componente AiProfileTab
import { AiProfileTab } from "@/components/tabs/AiProfileTab";
// Importa il componente ClientInfoTab
import { ClientInfoTab } from "@/components/tabs/ClientInfoTab";
// Importa il componente ClientInteractionsTab
import { ClientInteractionsTab } from "@/components/tabs/ClientInteractionsTab";
// Importa il componente MifidDocsTab
import { MifidDocsTab } from "@/components/tabs/MifidDocsTab";
// Importa il componente MifidEditForm
import { MifidEditForm, MifidFormValues, MifidType as FormMifidType } from "@/components/forms/MifidEditForm";

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
type MifidType = FormMifidType;

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

// Form schema per la creazione di log
const logFormSchema = z.object({
  type: z.enum(["email", "note", "call", "meeting"]),
  title: z.string().min(1, { message: "Il titolo è obbligatorio" }),
  content: z.string().min(1, { message: "Il contenuto è obbligatorio" }),
  emailSubject: z.string().optional(),
  emailRecipients: z.string().optional(),
  logDate: z.date().default(() => new Date()),
  clientId: z.number(),
  createdBy: z.number().optional(),
});

type LogFormValues = z.infer<typeof logFormSchema>;

export default function ClientDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const clientId = !isNaN(Number(id)) ? Number(id) : 0;
  const { user, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();
  
  // Client detail states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isMifidEditDialogOpen, setIsMifidEditDialogOpen] = useState(false);
  const [isAddLogDialogOpen, setIsAddLogDialogOpen] = useState(false);
  const [isConfirmActiveDialogOpen, setIsConfirmActiveDialogOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isLinkLoading, setIsLinkLoading] = useState(false);
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  
  // State per ricordare il tab attivo
  const [activeTab, setActiveTab] = useState<string>(() => {
    // Recupera il tab attivo dal localStorage se disponibile, altrimenti usa il default
    return localStorage.getItem(`activeTab_${clientId}`) || "ai-profile";
  });

  // Funzione per gestire il cambio di tab
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Salva il tab attivo nel localStorage
    localStorage.setItem(`activeTab_${clientId}`, value);
  };
  
  // New states for the signature dialogs
  const [isDigitalSignatureDialogOpen, setIsDigitalSignatureDialogOpen] = useState(false);
  const [isTraditionalSignatureDialogOpen, setIsTraditionalSignatureDialogOpen] = useState(false);
  
  // Variable to track if a document was generated and ready for sending
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  
  // Query to fetch client logs
  const clientLogsQuery = useQuery({
    queryKey: ["/api/client-logs", clientId],
    queryFn: () => apiRequest(`/api/client-logs/${clientId}`),
    enabled: !!clientId
  });
  
  // Query per recuperare i documenti verificati
  const verifiedDocsQuery = useQuery({
    queryKey: ["/api/verified-documents", clientId],
    queryFn: () => apiRequest(`/api/verified-documents/${clientId}`),
    enabled: !!clientId
  });
  
  // Form per la creazione di log
  const logForm = useForm<LogFormValues>({
    resolver: zodResolver(logFormSchema),
    defaultValues: {
      type: "call",
      title: "",
      content: "",
      emailSubject: "",
      emailRecipients: "",
      logDate: new Date(),
      clientId: clientId,
      createdBy: undefined,
    },
  });

  // Mutazione per creare un nuovo log
  const createLogMutation = useMutation({
    mutationFn: (data: LogFormValues) => {
      return apiRequest("/api/client-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          logDate: data.logDate.toISOString()
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-logs", clientId] });
      toast({
        title: t('Log creato'),
        description: t('Il log è stato creato con successo'),
      });
      logForm.reset();
      setIsAddLogDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: t('Errore'),
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  // Funzione per gestire la sottomissione del form di log
  function onSubmitLog(data: LogFormValues) {
    createLogMutation.mutate(data);
  }

  // Reinizializzare il form quando si apre il dialog
  React.useEffect(() => {
    if (isAddLogDialogOpen) {
      logForm.reset({
        type: "call",
        title: "",
        content: "",
        emailSubject: "",
        emailRecipients: "",
        logDate: new Date(),
        clientId: clientId,
        createdBy: undefined,
      });
    }
  }, [isAddLogDialogOpen, clientId, logForm]);
  
  // Redirect if not authenticated
  React.useEffect(() => {
    if (!isAuthLoading && !user) {
      
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
      
      const response = await apiRequest(`/api/clients/${clientId}`);
      
      
      // La risposta API ha già la struttura corretta
      return response;
    },
    enabled: !isNaN(clientId) && clientId > 0 && !!user
  });
  
  // Estrai il client, gli asset e i dati MIFID dalla risposta
  const client = clientData?.client;
  const mifid = clientData?.mifid;
  
  // Debug logs per verificare i dati
  
  
  
  
  
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
        phone: (client as any).phone || "",
        address: (client as any).address || "",
        taxCode: client.taxCode || "",
        riskProfile: (client as any).riskProfile as any,
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
      
      
      // IMPORTANTE: Parametro separato "sendEmail" per determinare l'azione
      const isSendingEmail = params.sendEmail === true;
      
      
      return apiRequest(`/api/clients/${clientId}/onboarding-token`, {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },
    onSuccess: (data: { token: string, link: string, language: 'english' | 'italian', emailSent?: boolean }, variables) => {
      // Log per verificare i dati ricevuti dal server
      
      
      
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
          
          throw new Error('Risposta del server non valida: ricevuto HTML invece di JSON');
        }
        
        
        
        // In caso di risposta non valida, forzare un refresh della pagina dopo 1 secondo 
        // per aggirare il problema
        if (!response || !response.success) {
          setTimeout(() => {
            
            window.location.reload();
          }, 1000);
          
          throw new Error(response?.message || 'Errore sconosciuto');
        }
        
        return response;
      } catch (error) {
        
        // In caso di errore, forzare un refresh della pagina dopo 1 secondo
        setTimeout(() => {
          
          window.location.reload();
        }, 1000);
        throw error;
      }
    },
    onSuccess: (response) => {
      
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
    
    setIsLinkLoading(true);
    try {
      const payload = {
        language: 'italian' // Hardcoded per ora, ma puoi rendere parametrizzabile
      };
      
      
      
      // Modifica l'endpoint per usare onboarding-token invece di onboarding-email
      const response = await apiRequest(`/api/clients/${clientId}/onboarding-token`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      
      
      // IMPORTANTE: Considera sempre la risposta un successo a meno che non ci sia un messaggio di errore esplicito
      // e il campo 'success' è falso
      const isSuccess = !(response.success === false && response.message);
      
      if (isSuccess) {
        // Verifica diverse possibili chiavi che potrebbero contenere il link
        const onboardingLink = response.link || response.onboardingLink || (response.token ? 
          `${window.location.origin}/onboarding?token=${response.token}` : null);
        
        
        
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
          
          toast({
            title: t('client.link_generated') || "Link generato",
            description: t('client.link_generated_success') || "Il link di onboarding è stato generato",
            duration: 5000
          });
        }
      } else {
        
        toast({
          title: t('error') || "Errore",
          description: response.message || (t('client.link_generation_failed') || "Impossibile generare il link di onboarding"),
          variant: "destructive"
        });
      }
    } catch (error) {
      
      toast({
        title: t('error') || "Errore",
        description: t('client.link_generation_failed') || "Impossibile generare il link di onboarding",
        variant: "destructive"
      });
    } finally {
      setIsLinkLoading(false);
    }
  };
  
  // Funzione per inviare il link di onboarding via email
  const handleSendOnboardingEmail = async (e: React.MouseEvent<HTMLButtonElement> | undefined) => {
    // Preveniamo il comportamento di default dell'evento
    if (e) e.preventDefault();
    
    console.log('[DEBUG-FE] handleSendOnboardingEmail - Start', { 
      hasOnboardingLink: !!onboardingLink,
      clientId
    });
    
    if (!onboardingLink) {
      console.error('[DEBUG-FE] handleSendOnboardingEmail - Error: No onboarding link available');
      toast({
        title: t('error') || "Errore",
        description: t('client.generate_link_first') || "Genera prima un link di onboarding",
        variant: "destructive"
      });
      return;
    }
    
    // Invia direttamente l'email con il messaggio predefinito italiano
    setIsLinkLoading(true);
    try {
      // Assicurati che abbiamo il token di onboarding, non il link completo
      const tokenMatch = onboardingLink.match(/token=([^&]+)/);
      const token = tokenMatch ? tokenMatch[1] : null;
      
      console.log('[DEBUG-FE] handleSendOnboardingEmail - Token extracted:', { 
        hasToken: !!token,
        tokenLength: token?.length
      });
      
      if (!token) {
        console.error('[DEBUG-FE] handleSendOnboardingEmail - Error: Token not found in link');
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
      
      console.log('[DEBUG-FE] handleSendOnboardingEmail - Sending API request with payload:', { 
        language: payload.language,
        sendEmail: payload.sendEmail,
        hasCustomMessage: !!payload.customMessage,
        customSubject: payload.customSubject,
        tokenLength: payload.token.length
      });
      
      
      const response = await apiRequest(`/api/clients/${clientId}/onboarding-email`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      console.log('[DEBUG-FE] handleSendOnboardingEmail - API response received:', response);
      
      
      if (response.success) {
        console.log('[DEBUG-FE] handleSendOnboardingEmail - Email sent successfully');
        toast({
          title: t('client.email_sent') || "Email inviata",
          description: t('client.email_sent_success') || "L'email di onboarding è stata inviata con successo",
          duration: 5000
        });
      } else {
        // Verifica se è un errore di configurazione email
        if (response.configurationRequired) {
          console.error('[DEBUG-FE] handleSendOnboardingEmail - Email configuration error:', response);
          toast({
            title: t('client.email_config_error') || "Configurazione email mancante",
            description: t('client.email_config_error_desc') || "È necessario configurare un server SMTP nelle impostazioni utente per inviare email",
            variant: "destructive",
            duration: 10000
          });
        } else {
          console.error('[DEBUG-FE] handleSendOnboardingEmail - API error:', response);
          toast({
            title: t('error') || "Errore",
            description: response.message || (t('client.onboarding_email_error') || "Impossibile inviare l'email di onboarding"),
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('[DEBUG-FE] handleSendOnboardingEmail - Exception:', error);
      toast({
        title: t('error') || "Errore",
        description: t('client.onboarding_email_error') || "Impossibile inviare l'email di onboarding",
        variant: "destructive"
      });
    } finally {
      setIsLinkLoading(false);
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
        <Button variant="outline" onClick={() => setLocation("/clients")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('client.back_to_clients')}
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
                onClick={() => setLocation("/clients")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-bold">{client.name}</h1>
            </div>
          </div>

          {/* Tabs structure for consistency with the onboarded view */}
          <Tabs defaultValue="onboarding" className="w-full">
            <TabsList className="grid grid-cols-1 mb-6">
              <TabsTrigger value="onboarding">
                <Link2 className="h-4 w-4 mr-2" />
                {t('client.onboarding') || "Onboarding Richiesto"}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="onboarding" className="space-y-6">
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
                  {!onboardingLink ? (
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
                  ) : (
                    <Button 
                      variant="default" 
                      size="lg"
                      onClick={() => window.open(onboardingLink, '_blank')}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      {t('client.visit_onboarding_page')}
                    </Button>
                  )}
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
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between py-4 border-b">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/clients")}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4 text-gray-600" />
            </Button>
            <h1 className="text-2xl font-semibold text-gray-800">{client?.name}</h1>
            {client?.isOnboarded && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation(`/app/clients/${clientId}/edit-mifid`)}
                  className="ml-4 bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {t('common.edit')}
                </Button>
                <div className="flex items-center ml-2">
                  <Badge 
                    variant={client?.active ? "default" : "destructive"}
                    className={`flex items-center pl-2 pr-1 py-0.5 h-8 ${client?.active ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-600'}`}
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
            {/* Redundant PDF button removed */}
          </div>
        </div>

        {/* Main Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid grid-cols-4 mb-6 bg-gray-100">
            <TabsTrigger value="ai-profile" className="data-[state=active]:bg-white data-[state=active]:text-gray-800 data-[state=active]:shadow-sm">
              <Brain className="h-4 w-4 mr-2" />
              {t('client.ai_profile') || "Profilo AI"}
            </TabsTrigger>
            <TabsTrigger value="client-info" className="data-[state=active]:bg-white data-[state=active]:text-gray-800 data-[state=active]:shadow-sm">
              <User className="h-4 w-4 mr-2" />
              {t('client.information') || "Informazioni Cliente"}
            </TabsTrigger>
            <TabsTrigger value="client-interactions" className="data-[state=active]:bg-white data-[state=active]:text-gray-800 data-[state=active]:shadow-sm">
              <MessageSquare className="h-4 w-4 mr-2" />
              {t('client.interactions') || "Interazioni Cliente"}
            </TabsTrigger>
            <TabsTrigger value="mifid-docs" className="data-[state=active]:bg-white data-[state=active]:text-gray-800 data-[state=active]:shadow-sm">
              <FileText className="h-4 w-4 mr-2" />
              {t('client.mifid_documentation') || "Documentazione MIFID"}
            </TabsTrigger>
          </TabsList>

          {/* Tab Content for AI Profile */}
          <AiProfileTab clientId={clientId} />

          {/* Tab Content for Client Information */}
          <ClientInfoTab 
            client={client} 
            mifid={mifid || null} 
            assets={assets} 
          />
          
          {/* Client Interactions Tab Content */}
          <ClientInteractionsTab 
                      clientId={clientId} 
                      onAddLog={() => setIsAddLogDialogOpen(true)}
                    />

          {/* MIFID Documentation Tab Content */}
          <MifidDocsTab 
            clientId={clientId}
            onShowPdfDialog={() => setShowPdfDialog(true)}
            onDigitalSignature={() => setIsDigitalSignatureDialogOpen(true)}
            onTraditionalSignature={() => setIsTraditionalSignatureDialogOpen(true)}
          />
        </Tabs>
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
      <MifidEditForm
        mifid={mifid}
        open={isMifidEditDialogOpen}
        onOpenChange={setIsMifidEditDialogOpen}
        onSubmit={onSubmitMifid}
        isPending={updateMifidMutation.isPending}
      />

      {/* PDF Dialog */}
      {showPdfDialog && (
        <ClientPdfDialog
          clientId={clientId}
          open={showPdfDialog}
          onOpenChange={setShowPdfDialog}
          onDigitalSignature={(pdfUrl) => {
            // Aggiorna lo stato con l'URL ricevuto se disponibile
            if (pdfUrl) {
              console.log('[DEBUG ClientDetail] Ricevuto URL PDF per firma digitale:', pdfUrl);
              setGeneratedPdfUrl(pdfUrl);
            } else {
              console.log('[DEBUG ClientDetail] URL PDF per firma digitale non disponibile');
            }
            
            // Apre il dialogo di firma digitale
            console.log('[DEBUG ClientDetail] Apertura dialogo firma digitale con URL:', pdfUrl || generatedPdfUrl);
            setIsDigitalSignatureDialogOpen(true);
          }}
          onTraditionalSignature={(pdfUrl) => {
            // Aggiorna lo stato con l'URL ricevuto se disponibile
            if (pdfUrl) {
              console.log('[DEBUG ClientDetail] Ricevuto URL PDF per firma tradizionale:', pdfUrl);
              setGeneratedPdfUrl(pdfUrl);
            } else {
              console.log('[DEBUG ClientDetail] URL PDF per firma tradizionale non disponibile');
            }
            
            // Apre il dialogo di firma tradizionale
            console.log('[DEBUG ClientDetail] Apertura dialogo firma tradizionale con URL:', pdfUrl || generatedPdfUrl);
            setIsTraditionalSignatureDialogOpen(true);
          }}
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

      {/* Dialog per l'aggiunta di log */}
      <AddLogDialog 
        open={isAddLogDialogOpen} 
        onOpenChange={setIsAddLogDialogOpen} 
        clientId={Number(clientId)}
      />

      {/* Signature Dialogs */}
      {client && (
        <>
          <DigitalSignatureDialog
            open={isDigitalSignatureDialogOpen}
            onOpenChange={setIsDigitalSignatureDialogOpen}
            clientName={client.name}
            clientId={clientId}
            clientEmail={client.email}
            documentUrl={generatedPdfUrl || undefined}
          />
          <TraditionalSignatureDialog
            open={isTraditionalSignatureDialogOpen}
            onOpenChange={setIsTraditionalSignatureDialogOpen}
            clientName={client.name}
            clientEmail={client.email}
            clientId={clientId}
            documentUrl={generatedPdfUrl || undefined}
          />
        </>
      )}

    </div>
  );
}