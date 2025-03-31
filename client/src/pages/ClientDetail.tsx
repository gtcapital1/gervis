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
  Banknote // Per other
} from "lucide-react";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { ClientEditDialog } from "@/components/dashboard/ClientEditDialog";
import { ClientSettings } from "@/components/settings/ClientSettings";
import { ClientPdfGenerator } from "@/components/dashboard/ClientPdfGenerator";
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
  riskProfile: z.enum(RISK_PROFILES).optional().nullable(),
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

export default function ClientDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const clientId = parseInt(id || "0");
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { t } = useTranslation();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  
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
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
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
  
  function onSubmit(data: ClientFormValues) {
    updateClientMutation.mutate(data);
  }
  
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

  function handleGenerateOnboardingLink() {
    // Genera direttamente il link di onboarding senza aprire il dialog e senza inviare l'email
    console.log("[DEBUG] Generazione link onboarding...");
    
    // Imposta il messaggio standard in italiano, ma solo se l'email non è già stata personalizzata
    // In questo modo non sovrascriviamo il messaggio personalizzato dall'utente
    if (!emailMessage) {
      setEmailMessage(defaultEmailMessages["italian"]);
    }
    
    // Debug per vedere i valori prima dell'invio
    console.log("DEBUG - Prima di generare il link:");
    console.log("DEBUG - emailSubject corrente:", emailSubject);
    console.log("DEBUG - emailMessage lunghezza:", emailMessage?.length || 0);
    
    // Invochiamo direttamente la mutazione per generare il link, senza inviare l'email
    sendOnboardingMutation.mutate({
      language: emailLanguage,
      customMessage: emailMessage,
      customSubject: emailSubject,
      sendEmail: false  // Non inviare l'email durante la generazione del link
    });
  }
  
  function handleOpenEmailDialog() {
    // Apre il dialog per personalizzare l'email prima di inviarla
    // Assicuriamoci che il messaggio email sia inizializzato
    if (!emailMessage) {
      setEmailMessage(defaultEmailMessages["italian"]);
    }
    // Lasciamo inalterato l'oggetto email, in modo che l'utente possa modificarlo
    // e le modifiche vengano mantenute
    setIsEmailDialogOpen(true);
    
    // Debug per vedere i valori attuali
    console.log("DEBUG - Apertura dialog email:");
    console.log("DEBUG - emailSubject corrente:", emailSubject);
  }
  
  function handleGenerateNewLink() {
    // Reset del link esistente e generazione di uno nuovo
    localStorage.removeItem(`onboardingLink_${clientId}`);
    setOnboardingLink(null);
    handleGenerateOnboardingLink();
  }
  
  // Funzione che invia l'email con il link di onboarding
  function handleSendEmail() {
    // Stampa di debug per vedere il valore dell'oggetto email
    console.log("DEBUG - Invio email client-side:");
    console.log("DEBUG - emailSubject:", emailSubject);
    
    // Invia l'email con il link di onboarding
    sendOnboardingMutation.mutate({
      language: emailLanguage,
      customMessage: emailMessage,
      customSubject: emailSubject,
      sendEmail: true  // Qui vogliamo esplicitamente inviare l'email
    });
    
    // Chiudi immediatamente il dialog dopo l'invio
    setIsEmailDialogOpen(false);
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
            <div className="flex items-center space-x-2">
              <Button 
                onClick={handleGenerateOnboardingLink}
                disabled={sendOnboardingMutation.isPending}
                className="bg-accent hover:bg-accent/90"
              >
                <Send className="mr-2 h-4 w-4" />
                {sendOnboardingMutation.isPending ? t('client.sending') : t('client.generate_link')}
              </Button>
            </div>
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
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                <AlertTriangle className="h-12 w-12 text-amber-500" />
                <p className="text-center text-muted-foreground">
                  {t('client.onboard_first')}
                </p>
                {!client.onboardingToken && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleGenerateOnboardingLink}
                  >
                    <Link2 className="mr-2 h-4 w-4" />
                    {t('client.generate_onboarding_link')}
                  </Button>
                )}
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
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {t('client.generate_new_link')}
                    </Button>
                    <Button
                      onClick={handleOpenEmailDialog}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      {t('client.send_email')}
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
          </div>
          <div className="flex items-center space-x-2">
            {client?.isOnboarded ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditDialogOpen(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                {t('client.edit')}
              </Button>
            ) : (
              <Button 
                onClick={handleGenerateOnboardingLink}
                disabled={sendOnboardingMutation.isPending}
                className="bg-accent hover:bg-accent/90"
              >
                <Send className="mr-2 h-4 w-4" />
                {sendOnboardingMutation.isPending ? t('client.sending') : t('client.generate_link')}
              </Button>
            )}
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
                <div className="space-y-4">
                  {mifid && (
                    <>
                      <div>
                        <span className="text-sm text-muted-foreground block">{t('client.annual_income')}:</span>
                        <span className="text-lg font-medium">€{mifid.annualIncome.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground block">{t('client.monthly_expenses')}:</span>
                        <span className="text-lg font-medium">€{mifid.monthlyExpenses.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground block">{t('client.debts')}:</span>
                        <span className="text-lg font-medium">€{mifid.debts.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground block">{t('client.dependents')}:</span>
                        <span className="text-lg font-medium">{mifid.dependents}</span>
                      </div>
                    </>
                  )}
                </div>
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
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-500">#1</span>
                      <span className="text-sm">{t('investment_goals.retirement')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-500">#2</span>
                      <span className="text-sm">{t('investment_goals.wealth_growth')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-500">#3</span>
                      <span className="text-sm">{t('investment_goals.income_generation')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-500">#4</span>
                      <span className="text-sm">{t('investment_goals.capital_preservation')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-500">#5</span>
                      <span className="text-sm">{t('investment_goals.estate_planning')}</span>
                    </div>
                  </div>
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
                          >
                            <Link2 className="mr-2 h-4 w-4" />
                            {t('client.generate_onboarding_link')}
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
      
      {/* Email language dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t('client.customize_email')}</DialogTitle>
            <DialogDescription>
              {t('client.customize_email_desc', { clientName: client?.name })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="email-content" className="text-lg font-medium">{t('client.email_content')}</Label>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-accent" />
                  <p className="text-sm text-muted-foreground">
                    <strong>Destinatario: </strong>{client.email}
                  </p>
                </div>
              </div>
              
              <div className="mb-4">
                <Label htmlFor="email-subject" className="text-sm">Oggetto:</Label>
                <Input 
                  id="email-subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="text-sm"
                />
              </div>
              
              <Textarea 
                id="email-content"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
                placeholder={t('client.email_placeholder')}
              />
              <div className="flex items-center space-x-2 mt-2 text-xs text-muted-foreground bg-muted p-2 rounded-md">
                <Info className="h-4 w-4" />
                <p>
                  {t('client.email_personalization_tip')}
                </p>
              </div>
              <div className="bg-accent/10 text-accent-foreground p-2 rounded-md mt-2">
                <p className="text-xs text-center">
                  Il link di onboarding e il pulsante "Completa il Mio Profilo" verranno aggiunti automaticamente in fondo all'email
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEmailDialogOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              disabled={sendOnboardingMutation.isPending}
              onClick={handleSendEmail}
            >
              {sendOnboardingMutation.isPending ? t('client.sending') : t('client.send_email')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* PRO feature upgrade dialog */}
      {user && (
        <UpgradeDialog
          open={isUpgradeOpen}
          onOpenChange={setIsUpgradeOpen}
          userId={user.id}
        />
      )}
    </div>
  );
}