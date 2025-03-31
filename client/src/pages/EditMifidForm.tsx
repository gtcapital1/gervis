import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { 
  PlusCircle, 
  Trash2, 
  AlertTriangle, 
  ArrowRight,
  CheckCircle2,
  HomeIcon,
  Wallet,
  Target,
  BookOpen,
  ShieldAlert,
  Settings,
  MessageSquare,
} from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  RISK_PROFILES, 
  ASSET_CATEGORIES, 
  EXPERIENCE_LEVELS,
  INVESTMENT_GOALS,
  INVESTMENT_HORIZONS,
  PERSONAL_INTERESTS
} from "@shared/schema";
import { Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MIFID_SCHEMA, type MifidData } from "@shared/schemas";
import { useAuth } from "@/hooks/use-auth";
import React from "react";

// Define the form schema
const assetSchema = z.object({
  value: z.coerce.number().min(0, "Il valore non può essere negativo"),
  category: z.string().refine(val => ASSET_CATEGORIES.includes(val as any), {
    message: "Seleziona una categoria valida"
  }),
  description: z.string().optional(),
});

// Define the query response type
type ClientQueryResponse = {
  success: boolean;
  client: {
    id: number;
    name: string;
    email: string;
    isOnboarded: boolean;
    onboardingToken?: string;
  };
  assets: Array<{
    id: number;
    clientId: number;
    category: string;
    value: number;
    description: string;
    createdAt: string;
  }>;
  recommendations: any[];
  mifid: MifidData | null;
};

const mifidFormSchema = z.object({
  // Personal Information
  address: z.string().min(1, "L'indirizzo è obbligatorio"),
  phone: z.string().min(1, "Il numero di telefono è obbligatorio"),
  birthDate: z.string().min(1, "La data di nascita è obbligatoria"),
  maritalStatus: z.string().min(1, "Lo stato civile è obbligatorio"),
  employmentStatus: z.string().min(1, "Lo stato occupazionale è obbligatorio"),
  educationLevel: z.string().min(1, "Il livello di istruzione è obbligatorio"),
  annualIncome: z.coerce.number().min(0, "Il reddito annuale non può essere negativo"),
  monthlyExpenses: z.coerce.number().min(0, "Le spese mensili non possono essere negative"),
  debts: z.coerce.number().min(0, "I debiti non possono essere negativi"),
  dependents: z.coerce.number().min(0, "Il numero di dipendenti non può essere negativo"),
  
  // Investment Profile
  riskProfile: z.string().min(1, "Il profilo di rischio è obbligatorio"),
  investmentExperience: z.string().min(1, "Il livello di esperienza è obbligatorio"),
  investmentHorizon: z.string().min(1, "L'orizzonte di investimento è obbligatorio"),

  // Past Investment Experience
  pastInvestmentExperience: z.array(z.string()).min(1, "Seleziona almeno un'esperienza di investimento"),
  financialEducation: z.array(z.string()).min(1, "Seleziona almeno un tipo di formazione finanziaria"),
  
  // Investment Interests (scala 1-5)
  retirementInterest: z.coerce.number().min(1).max(5, "Il valore deve essere tra 1 e 5"),
  wealthGrowthInterest: z.coerce.number().min(1).max(5, "Il valore deve essere tra 1 e 5"),
  incomeGenerationInterest: z.coerce.number().min(1).max(5, "Il valore deve essere tra 1 e 5"),
  capitalPreservationInterest: z.coerce.number().min(1).max(5, "Il valore deve essere tra 1 e 5"),
  estatePlanningInterest: z.coerce.number().min(1).max(5, "Il valore deve essere tra 1 e 5"),
  
  // Risk Tolerance
  portfolioDropReaction: z.string().min(1, "Seleziona come reagiresti a un calo del portafoglio"),
  volatilityTolerance: z.string().min(1, "Seleziona la tua tolleranza alla volatilità"),
  
  // Investment Behavior
  yearsOfExperience: z.string().min(1, "Gli anni di esperienza sono obbligatori"),
  investmentFrequency: z.string().min(1, "La frequenza di investimento è obbligatoria"),
  advisorUsage: z.string().min(1, "Seleziona come utilizzi la consulenza finanziaria"),
  monitoringTime: z.string().min(1, "Il tempo di monitoraggio è obbligatorio"),
  
  // Assets
  assets: z.array(z.object({
    id: z.number().optional(),
    clientId: z.number().optional(),
    category: z.string(),
    value: z.coerce.number().min(0, "Il valore non può essere negativo"),
    description: z.string().optional(),
    createdAt: z.string().optional()
  }))
});

type MifidFormValues = z.infer<typeof mifidFormSchema>;

export default function EditMifidForm() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const clientId = parseInt(id || "0");
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { t } = useTranslation();
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Definizione delle opzioni per le categorie di asset
  const categoryOptions = ASSET_CATEGORIES;

  console.log("[DEBUG] EditMifidForm - Client ID:", clientId);
  console.log("[DEBUG] EditMifidForm - User:", user);
  console.log("[DEBUG] EditMifidForm - Is Auth Loading:", isAuthLoading);

  // Redirect if not authenticated
  React.useEffect(() => {
    console.log("[DEBUG] EditMifidForm - Auth check effect");
    if (!isAuthLoading && !user) {
      console.log("[DEBUG] EditMifidForm - User not authenticated, redirecting to /login");
      setLocation("/login");
    }
  }, [user, isAuthLoading, setLocation]);

  // Show loading while checking auth
  if (isAuthLoading) {
    console.log("[DEBUG] EditMifidForm - Showing loading state");
    return (
      <div className="flex justify-center items-center h-full">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  // Show error if not authenticated
  if (!user) {
    console.log("[DEBUG] EditMifidForm - No user, returning null (will redirect)");
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
      console.log("[DEBUG] EditMifidForm - Fetching client data for ID:", clientId);
      const response = await apiRequest(`/api/clients/${clientId}`);
      console.log("[DEBUG] EditMifidForm - Full API Response:", JSON.stringify(response, null, 2));
      console.log("[DEBUG] EditMifidForm - Assets from response:", JSON.stringify(response.assets, null, 2));
      return response;
    },
    enabled: !isNaN(clientId) && clientId > 0 && !!user
  });

  console.log("[DEBUG] EditMifidForm - Query state:", {
    isLoading,
    isError,
    error,
    hasData: !!clientData,
    clientData: clientData ? JSON.stringify(clientData, null, 2) : null,
    assets: clientData?.assets ? JSON.stringify(clientData.assets, null, 2) : null
  });

  // Estrai i dati MIFID dalla risposta clientData
  const mifidData = clientData?.mifid;

  // Form setup
  const form = useForm<MifidFormValues>({
    resolver: zodResolver(mifidFormSchema),
    defaultValues: {
      // Personal Information
      address: mifidData?.address || "",
      phone: mifidData?.phone || "",
      birthDate: mifidData?.birthDate || "",
      maritalStatus: mifidData?.maritalStatus || "",
      employmentStatus: mifidData?.employmentStatus || "",
      educationLevel: mifidData?.educationLevel || "",
      annualIncome: mifidData?.annualIncome || 0,
      monthlyExpenses: mifidData?.monthlyExpenses || 0,
      debts: mifidData?.debts || 0,
      dependents: mifidData?.dependents || 0,
      
      // Investment Profile
      riskProfile: mifidData?.riskProfile || "balanced",
      investmentExperience: mifidData?.investmentExperience || "none",
      investmentHorizon: mifidData?.investmentHorizon || "medium_term",
      
      // Nuovi campi per esperienze di investimento
      pastInvestmentExperience: mifidData?.pastInvestmentExperience || [],
      financialEducation: mifidData?.financialEducation || [],
      
      // Obiettivi di investimento con rank 1-5
      retirementInterest: mifidData?.retirementInterest || 3,
      wealthGrowthInterest: mifidData?.wealthGrowthInterest || 3,
      incomeGenerationInterest: mifidData?.incomeGenerationInterest || 3,
      capitalPreservationInterest: mifidData?.capitalPreservationInterest || 3,
      estatePlanningInterest: mifidData?.estatePlanningInterest || 3,
      
      // Assets (precompilati con i dati esistenti dalla tabella assets)
      assets: clientData?.assets || [],

      // Nuovi campi per la tolleranza al rischio
      portfolioDropReaction: mifidData?.portfolioDropReaction || "",
      volatilityTolerance: mifidData?.volatilityTolerance || "",

      // Campi per la sezione 6: Esperienza e Comportamento d'Investimento
      yearsOfExperience: mifidData?.yearsOfExperience || "",
      investmentFrequency: mifidData?.investmentFrequency || "",
      advisorUsage: mifidData?.advisorUsage || "",
      monitoringTime: mifidData?.monitoringTime || "",
    }
  });

  // Funzione per calcolare il patrimonio netto
  const calculateNetWorth = () => {
    const assets = form.watch("assets") || [];
    const totalAssets = assets.reduce((sum, asset) => sum + (asset.value || 0), 0);
    const debts = form.watch("debts") || 0;
    return totalAssets - debts;
  };

  // Funzione per controllare se ci sono priorità duplicate
  const hasDuplicatePriorities = () => {
    const values = form.getValues();
    const priorities = [
      values.retirementInterest,
      values.wealthGrowthInterest,
      values.incomeGenerationInterest,
      values.capitalPreservationInterest,
      values.estatePlanningInterest
    ].filter(Boolean); // Filtra i valori undefined/null
    
    return priorities.length !== new Set(priorities).size;
  };

  // Update form values when MIFID data is loaded
  useEffect(() => {
    if (mifidData) {
      console.log("[DEBUG] EditMifidForm - Loading MIFID data into form:", JSON.stringify(mifidData, null, 2));
      
      const formData = {
        // Sezione 1: Dati Anagrafici e Informazioni Personali
        address: mifidData.address,
        phone: mifidData.phone,
        birthDate: mifidData.birthDate,
        maritalStatus: mifidData.maritalStatus,
        employmentStatus: mifidData.employmentStatus,
        educationLevel: mifidData.educationLevel,
        annualIncome: mifidData.annualIncome,
        monthlyExpenses: mifidData.monthlyExpenses,
        debts: mifidData.debts,
        dependents: mifidData.dependents,
        assets: clientData?.assets || [], // Usa gli asset dalla tabella assets

        // Sezione 3: Obiettivi d'Investimento
        investmentHorizon: mifidData.investmentHorizon,
        retirementInterest: mifidData.retirementInterest,
        wealthGrowthInterest: mifidData.wealthGrowthInterest,
        incomeGenerationInterest: mifidData.incomeGenerationInterest,
        capitalPreservationInterest: mifidData.capitalPreservationInterest,
        estatePlanningInterest: mifidData.estatePlanningInterest,

        // Sezione 4: Conoscenza ed Esperienza con Strumenti Finanziari
        investmentExperience: mifidData.investmentExperience,
        pastInvestmentExperience: mifidData.pastInvestmentExperience,
        financialEducation: mifidData.financialEducation,

        // Sezione 5: Tolleranza al Rischio
        riskProfile: mifidData.riskProfile,
        portfolioDropReaction: mifidData.portfolioDropReaction,
        volatilityTolerance: mifidData.volatilityTolerance,

        // Sezione 6: Esperienza e Comportamento d'Investimento
        yearsOfExperience: mifidData.yearsOfExperience,
        investmentFrequency: mifidData.investmentFrequency,
        advisorUsage: mifidData.advisorUsage,
        monitoringTime: mifidData.monitoringTime,
      };

      console.log("[DEBUG] EditMifidForm - Form data to be set:", JSON.stringify(formData, null, 2));
      form.reset(formData);
      
      // Verifica i valori dopo il reset
      const formValues = form.getValues();
      console.log("[DEBUG] EditMifidForm - Form values after reset:", JSON.stringify(formValues, null, 2));
    }
  }, [mifidData, clientData, form]);

  // Handle form submission
  const mutation = useMutation({
    mutationFn: async (data: MifidFormValues) => {
      console.log("[DEBUG] Mutation started");
      console.log("[DEBUG] Input data:", JSON.stringify(data, null, 2));
      
      // Estrai gli asset dai dati del form
      const { assets, ...mifidData } = data;
      console.log("[DEBUG] Extracted assets:", JSON.stringify(assets, null, 2));
      console.log("[DEBUG] Extracted MIFID data:", JSON.stringify(mifidData, null, 2));
      
      // Assicurati che i dati numerici siano numeri
      const processedMifidData = {
        ...mifidData,
        annualIncome: Number(mifidData.annualIncome),
        monthlyExpenses: Number(mifidData.monthlyExpenses),
        debts: Number(mifidData.debts),
        dependents: Number(mifidData.dependents),
        retirementInterest: Number(mifidData.retirementInterest),
        wealthGrowthInterest: Number(mifidData.wealthGrowthInterest),
        incomeGenerationInterest: Number(mifidData.incomeGenerationInterest),
        capitalPreservationInterest: Number(mifidData.capitalPreservationInterest),
        estatePlanningInterest: Number(mifidData.estatePlanningInterest),
      };
      console.log("[DEBUG] Processed MIFID data:", JSON.stringify(processedMifidData, null, 2));

      // Assicurati che gli asset abbiano i valori numerici
      const processedAssets = assets.map(asset => ({
        ...asset,
        value: Number(asset.value),
      }));
      console.log("[DEBUG] Processed assets:", JSON.stringify(processedAssets, null, 2));
      
      try {
        // Salva i dati MIFID
        console.log("[DEBUG] Sending MIFID data to server");
        console.log("[DEBUG] MIFID request URL:", `/api/clients/${clientId}/mifid`);
        console.log("[DEBUG] MIFID request method:", "PATCH");
        
        // Assicuriamoci che tutti i campi siano nel formato corretto
        const mifidPayload = {
          ...processedMifidData,
          // Assicuriamoci che i campi numerici siano effettivamente numeri
          annualIncome: Number(processedMifidData.annualIncome) || 0,
          monthlyExpenses: Number(processedMifidData.monthlyExpenses) || 0,
          debts: Number(processedMifidData.debts) || 0,
          dependents: Number(processedMifidData.dependents) || 0,
          retirementInterest: Number(processedMifidData.retirementInterest) || 0,
          wealthGrowthInterest: Number(processedMifidData.wealthGrowthInterest) || 0,
          incomeGenerationInterest: Number(processedMifidData.incomeGenerationInterest) || 0,
          capitalPreservationInterest: Number(processedMifidData.capitalPreservationInterest) || 0,
          estatePlanningInterest: Number(processedMifidData.estatePlanningInterest) || 0,
        };
        
        console.log("[DEBUG] MIFID request body:", JSON.stringify(mifidPayload, null, 2));
        
        const mifidResponse = await apiRequest(`/api/clients/${clientId}/mifid`, {
          method: "PATCH",
          body: JSON.stringify(mifidPayload),
          headers: {
            'Content-Type': 'application/json',
          },
        });
        console.log("[DEBUG] MIFID save response:", JSON.stringify(mifidResponse, null, 2));

        // Salva gli asset
        console.log("[DEBUG] Sending assets to server");
        console.log("[DEBUG] Assets request URL:", `/api/clients/${clientId}/assets`);
        console.log("[DEBUG] Assets request method:", "PUT");
        
        // Assicuriamoci che gli asset siano nel formato corretto
        const assetsPayload = {
          assets: processedAssets.map(asset => ({
            ...asset,
            value: Number(asset.value) || 0,
          }))
        };
        
        console.log("[DEBUG] Assets request body:", JSON.stringify(assetsPayload, null, 2));
        
        const assetsResponse = await apiRequest(`/api/clients/${clientId}/assets`, {
          method: "PUT",
          body: JSON.stringify(assetsPayload),
          headers: {
            'Content-Type': 'application/json',
          },
        });
        console.log("[DEBUG] Assets save response:", JSON.stringify(assetsResponse, null, 2));

        return { success: true };
      } catch (error: unknown) {
        console.error("[DEBUG] Error during save:", error);
        if (error instanceof Error) {
          console.error("[DEBUG] Error stack:", error.stack);
          console.error("[DEBUG] Error name:", error.name);
          console.error("[DEBUG] Error message:", error.message);
        }
        throw error;
      }
    },
    onSuccess: (response) => {
      console.log("[DEBUG] Mutation succeeded:", JSON.stringify(response, null, 2));
      setFormSuccess(true);
      toast({
        title: t('client.mifid_updated'),
        description: t('client.mifid_updated_success'),
      });
      setTimeout(() => {
        setLocation(`/clients/${clientId}`);
      }, 1500);
    },
    onError: (error: unknown) => {
      console.error("[DEBUG] Mutation failed:", error);
      if (error instanceof Error) {
        console.error("[DEBUG] Error details:", JSON.stringify(error, null, 2));
      }
      setFormError(error instanceof Error ? error.message : "Si è verificato un errore durante il salvataggio");
    }
  });

  function onSubmit(data: MifidFormValues) {
    console.log("[DEBUG] Form submission started");
    console.log("[DEBUG] Raw form data:", JSON.stringify(data, null, 2));
    
    // Verifica la validazione
    const validationResult = mifidFormSchema.safeParse(data);
    if (!validationResult.success) {
      console.error("[DEBUG] Validation failed:", validationResult.error);
      setFormError("Errore di validazione: " + validationResult.error.message);
      return;
    }
    
    console.log("[DEBUG] Validation passed, proceeding with mutation");
    mutation.mutate(data);
  }

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-20 px-4 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
            <CardDescription>
              Please wait while we load your data.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container max-w-4xl mx-auto py-20 px-4 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>
              There was an error loading your data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error instanceof Error ? error.message : "Please try again later."}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full"
              onClick={() => setLocation(`/clients/${clientId}`)}
            >
              Return to Client Details
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (formSuccess) {
    return (
      <div className="container max-w-4xl mx-auto py-20 px-4 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Success</CardTitle>
            <CardDescription>
              Your MIFID information has been updated successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <CheckCircle2 className="h-16 w-16 text-green-500 animate-pulse" />
            <p className="mt-4 text-center">Redirecting you back to client details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-10 px-4 sm:px-6">
      <Card className="mb-10">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">{t('client.edit_mifid_data')}</CardTitle>
        </CardHeader>
      </Card>
      
      {formError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Errore</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Sezione 1: Dati Anagrafici e Informazioni Personali */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HomeIcon className="h-5 w-5" />
                Sezione 1: Dati Anagrafici e Informazioni Personali
              </CardTitle>
              <CardDescription>
                Informazioni di base su di te e i tuoi recapiti
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data di nascita</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>
                      Inserisci la tua data di nascita completa
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Indirizzo di residenza</FormLabel>
                    <FormControl>
                      <Input placeholder="Via Roma, 123" {...field} />
                    </FormControl>
                    <FormDescription>
                      L'indirizzo completo dove risiedi attualmente
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recapito telefonico</FormLabel>
                    <FormControl>
                      <Input placeholder="+39 123 456 7890" {...field} />
                    </FormControl>
                    <FormDescription>
                      Un numero di telefono dove poterti contattare
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="maritalStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stato civile</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona il tuo stato civile" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="single">Celibe/Nubile</SelectItem>
                        <SelectItem value="married">Sposato/a</SelectItem>
                        <SelectItem value="divorced">Divorziato/a</SelectItem>
                        <SelectItem value="widowed">Vedovo/a</SelectItem>
                        <SelectItem value="civil_union">Unione civile</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="employmentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stato occupazionale</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona il tuo stato occupazionale" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="employed">Dipendente</SelectItem>
                        <SelectItem value="self-employed">Libero professionista</SelectItem>
                        <SelectItem value="business_owner">Imprenditore</SelectItem>
                        <SelectItem value="retired">Pensionato</SelectItem>
                        <SelectItem value="unemployed">Disoccupato</SelectItem>
                        <SelectItem value="student">Studente</SelectItem>
                        <SelectItem value="other">Altro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="educationLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Livello di istruzione</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona il tuo livello di istruzione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="primary">Licenza elementare</SelectItem>
                        <SelectItem value="middle">Licenza media</SelectItem>
                        <SelectItem value="high_school">Diploma di scuola superiore</SelectItem>
                        <SelectItem value="bachelor">Laurea triennale</SelectItem>
                        <SelectItem value="master">Laurea magistrale</SelectItem>
                        <SelectItem value="phd">Dottorato di ricerca</SelectItem>
                        <SelectItem value="other">Altro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Sezione 2: Situazione Finanziaria */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Sezione 2: Situazione Finanziaria
              </CardTitle>
              <CardDescription>
                Informazioni sulla tua situazione finanziaria attuale
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="annualIncome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reddito annuale</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="50000"
                          {...field}
                          onChange={e => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormDescription>
                        Il tuo reddito annuale lordo
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="monthlyExpenses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Spese mensili</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="2000"
                          {...field}
                          onChange={e => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormDescription>
                        La somma delle tue spese ricorrenti mensili
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="debts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Debiti e obblighi finanziari</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="50000"
                          {...field}
                          onChange={e => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormDescription>
                        L'importo totale di eventuali mutui, prestiti personali, fidi bancari o altre forme di debito in essere
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="dependents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numero di dipendenti</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0"
                          {...field}
                          onChange={e => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormDescription>
                        Numero di persone economicamente dipendenti da te
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Sezione 3: Profilo di Investimento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Sezione 3: Profilo di Investimento
              </CardTitle>
              <CardDescription>
                Informazioni sulle tue preferenze di investimento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="riskProfile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profilo di rischio</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona il tuo profilo di rischio" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="conservative">Conservativo</SelectItem>
                        <SelectItem value="balanced">Bilanciato</SelectItem>
                        <SelectItem value="aggressive">Aggressivo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Il tuo livello di tolleranza al rischio
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="investmentHorizon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orizzonte di investimento</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona il tuo orizzonte di investimento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="short_term">Breve termine (0-3 anni)</SelectItem>
                        <SelectItem value="medium_term">Medio termine (3-7 anni)</SelectItem>
                        <SelectItem value="long_term">Lungo termine (7+ anni)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Il periodo di tempo durante il quale prevedi di mantenere i tuoi investimenti
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Interessi di Investimento */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <FormLabel className="text-base">Priorità degli obiettivi d'investimento</FormLabel>
                  <FormDescription className="mb-4">
                    Ordina gli obiettivi per importanza (1 = più importante, 5 = meno importante).
                    <span className="text-gray-500"> Ogni numero deve essere assegnato a un solo obiettivo.</span>
                  </FormDescription>
                </div>
                
                {hasDuplicatePriorities() && (
                  <div className="mb-4 p-3 border border-red-400 bg-red-50 rounded-md text-red-700">
                    <p className="text-sm font-medium">
                      Attenzione: hai assegnato lo stesso numero di priorità a più obiettivi. Per procedere, assicurati che ogni obiettivo abbia un valore di priorità unico.
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  {[
                    { 
                      name: "retirementInterest" as const, 
                      label: "Pianificazione della pensione",
                      description: "Costruire un capitale sufficiente per mantenere il tuo tenore di vita dopo il pensionamento"
                    },
                    { 
                      name: "wealthGrowthInterest" as const, 
                      label: "Crescita del capitale",
                      description: "Aumentare il valore complessivo del tuo patrimonio nel medio-lungo periodo"
                    },
                    { 
                      name: "incomeGenerationInterest" as const, 
                      label: "Generazione di reddito",
                      description: "Ottenere flussi di cassa periodici dagli investimenti per integrare le entrate correnti"
                    },
                    { 
                      name: "capitalPreservationInterest" as const, 
                      label: "Protezione del capitale",
                      description: "Difendere il valore del tuo patrimonio dall'inflazione e da perdite potenziali"
                    },
                    { 
                      name: "estatePlanningInterest" as const, 
                      label: "Pianificazione ereditaria",
                      description: "Organizzare il trasferimento efficiente del patrimonio ai tuoi eredi o enti benefici"
                    }
                  ].map((goal, index) => (
                    <FormField
                      key={goal.name}
                      control={form.control}
                      name={goal.name}
                      render={({ field }) => {
                        const currentValue = field.value;
                        const allValues = form.getValues();
                        const isNumberUsed = (num: number) => {
                          return Object.entries(allValues).some(([key, value]) => 
                            key !== goal.name && value === num
                          );
                        };

                        return (
                          <FormItem>
                            <div className="flex items-center gap-4">
                              <div className="flex flex-col items-center gap-1">
                                {index === 0 && (
                                  <div className="flex gap-2">
                                    <div className="w-8 text-center text-xs text-gray-500">Massima priorità</div>
                                    <div className="w-8"></div>
                                    <div className="w-8"></div>
                                    <div className="w-8"></div>
                                    <div className="w-8 text-center text-xs text-gray-500">Minima priorità</div>
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  {[1, 2, 3, 4, 5].map((num) => (
                                    <button
                                      key={num}
                                      type="button"
                                      onClick={() => field.onChange(num)}
                                      className={`w-8 h-8 flex items-center justify-center border-2 rounded-md ${
                                        currentValue === num 
                                          ? hasDuplicatePriorities() && Object.entries(allValues).some(([key, value]) => 
                                              key !== goal.name && value === num
                                            )
                                            ? 'border-red-500 bg-red-500 text-white'
                                            : 'border-blue-500 bg-blue-500 text-white'
                                          : 'border-gray-300 text-gray-400 hover:border-gray-500 hover:text-gray-600'
                                      }`}
                                    >
                                      {num}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="flex-1">
                                <FormLabel>{goal.label}</FormLabel>
                                <FormDescription>{goal.description}</FormDescription>
                              </div>
                            </div>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sezione 4: Conoscenza ed Esperienza con Strumenti Finanziari */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Sezione 4: Conoscenza ed Esperienza con Strumenti Finanziari
              </CardTitle>
              <CardDescription>
                Valutazione della tua competenza ed esperienza in ambito finanziario
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="investmentExperience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Livello di conoscenza dei mercati finanziari</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona il tuo livello di esperienza" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nessuna conoscenza</SelectItem>
                        <SelectItem value="beginner">Base</SelectItem>
                        <SelectItem value="intermediate">Intermedio</SelectItem>
                        <SelectItem value="advanced">Avanzato</SelectItem>
                        <SelectItem value="expert">Esperto</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Quanto ti senti preparato sul funzionamento dei mercati finanziari
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pastInvestmentExperience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Esperienze pregresse</FormLabel>
                    <FormDescription className="mb-3">
                      Seleziona gli strumenti finanziari in cui hai già investito in passato
                    </FormDescription>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {[
                        { id: "stocks", label: "Azioni" },
                        { id: "bonds", label: "Obbligazioni" },
                        { id: "funds", label: "Fondi comuni" },
                        { id: "etf", label: "ETF" },
                        { id: "real_estate", label: "Immobili come investimento" },
                        { id: "forex", label: "Forex" },
                        { id: "derivatives", label: "Derivati (Opzioni, Futures)" },
                        { id: "crypto", label: "Criptovalute" },
                        { id: "gold", label: "Oro e metalli preziosi" },
                        { id: "structured_products", label: "Prodotti strutturati" },
                        { id: "startup", label: "Startup/Private equity" },
                        { id: "none", label: "Nessuna esperienza" }
                      ].map((item) => (
                        <FormItem key={item.id} className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(item.id)}
                              onCheckedChange={(checked) => {
                                const currentValues = field.value || [];
                                if (checked) {
                                  field.onChange([...currentValues, item.id]);
                                } else {
                                  field.onChange(currentValues.filter(v => v !== item.id));
                                }
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            {item.label}
                          </FormLabel>
                        </FormItem>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="financialEducation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Formazione ricevuta</FormLabel>
                    <FormDescription className="mb-3">
                      Seleziona i tipi di formazione finanziaria che hai ricevuto
                    </FormDescription>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {[
                        { id: "university", label: "Studi universitari in economia/finanza" },
                        { id: "certification", label: "Certificazioni professionali in ambito finanziario" },
                        { id: "courses", label: "Corsi di formazione in ambito finanziario" },
                        { id: "books", label: "Libri e pubblicazioni specializzate" },
                        { id: "seminars", label: "Seminari e workshop" },
                        { id: "online", label: "Corsi online e webinar" },
                        { id: "advisor", label: "Consulenza diretta da professionisti" },
                        { id: "none", label: "Nessuna formazione specifica" }
                      ].map((item) => (
                        <FormItem key={item.id} className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(item.id)}
                              onCheckedChange={(checked) => {
                                const currentValues = field.value || [];
                                if (checked) {
                                  field.onChange([...currentValues, item.id]);
                                } else {
                                  field.onChange(currentValues.filter(v => v !== item.id));
                                }
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            {item.label}
                          </FormLabel>
                        </FormItem>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Sezione 5: Tolleranza al Rischio */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" />
                Sezione 5: Tolleranza al Rischio
              </CardTitle>
              <CardDescription>
                Valutazione della tua tolleranza al rischio e reazione alle perdite
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="portfolioDropReaction"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Reazione a un calo del portafoglio</FormLabel>
                    <FormDescription>
                      Come reagiresti a un calo significativo del valore del tuo portafoglio?
                    </FormDescription>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="sell" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Venderei tutto per limitare le perdite
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="hold" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Manterrei le posizioni nella speranza di un recupero
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="buy" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Considererei l'opportunità di acquistare a prezzi più bassi
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="buy_more" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Aumenterei la mia esposizione per sfruttare l'opportunità
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="volatilityTolerance"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Disponibilità a tollerare la volatilità</FormLabel>
                    <FormDescription>
                      Quanto sei disposto a sopportare oscillazioni di breve termine per raggiungere obiettivi a lungo termine?
                    </FormDescription>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="very_low" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Preferisco rendimenti modesti ma stabili, evitando qualsiasi oscillazione
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="low" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Accetto leggere oscillazioni, ma mi preoccupo se vedo perdite ripetute
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="medium" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Accetto oscillazioni moderate in cambio di potenziali rendimenti più alti
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="high" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Sono disposto a sopportare oscillazioni significative per potenziali rendimenti più alti
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="very_high" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Accetto elevata volatilità in cambio di potenziali rendimenti molto alti
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Sezione 6: Comportamento di Investimento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Sezione 6: Comportamento di Investimento
              </CardTitle>
              <CardDescription>
                Informazioni sulle tue abitudini di investimento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="yearsOfExperience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anni di esperienza di investimento</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona gli anni di esperienza" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nessuna esperienza</SelectItem>
                        <SelectItem value="less_than_1">Meno di 1 anno</SelectItem>
                        <SelectItem value="1_to_3">Da 1 a 3 anni</SelectItem>
                        <SelectItem value="3_to_5">Da 3 a 5 anni</SelectItem>
                        <SelectItem value="more_than_5">Più di 5 anni</SelectItem>
                        <SelectItem value="more_than_10">Più di 10 anni</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="investmentFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequenza di investimento</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona la frequenza di investimento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="daily">Quotidianamente</SelectItem>
                        <SelectItem value="weekly">Settimanalmente</SelectItem>
                        <SelectItem value="monthly">Mensilmente</SelectItem>
                        <SelectItem value="quarterly">Trimestralmente</SelectItem>
                        <SelectItem value="yearly">Annualmente</SelectItem>
                        <SelectItem value="occasional">Occasionalmente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="advisorUsage"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Utilizzo di consulenza finanziaria</FormLabel>
                    <FormDescription>
                      Ti affidi a consulenti per le decisioni d'investimento o operi in autonomia?
                    </FormDescription>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="full_autonomy" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Opero completamente in autonomia
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="mostly_autonomy" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Opero principalmente in autonomia, con occasionale consulenza
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="balanced" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Equilibrio tra decisioni autonome e consulenza
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="mostly_advisor" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Mi affido principalmente a consulenti, con alcune decisioni autonome
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="full_advisor" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Mi affido completamente ai consulenti
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="monitoringTime"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Tempo dedicato al monitoraggio degli investimenti</FormLabel>
                    <FormDescription>
                      Quanto tempo dedichi alla gestione e all'analisi del portafoglio?
                    </FormDescription>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="daily_hours" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Più ore al giorno
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="daily_minutes" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Alcuni minuti ogni giorno
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="weekly" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Qualche ora a settimana
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="monthly" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Qualche ora al mese
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="quarterly" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Solo trimestralmente
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="rarely" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Raramente o mai
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                I tuoi asset principali
              </CardTitle>
              <CardDescription>
                Indica il valore approssimativo dei tuoi principali asset (immobiliari, mobiliari, liquidi)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="pt-4">
                <h3 className="text-md font-semibold mb-2">I tuoi asset principali</h3>
                <FormDescription className="mb-4">
                  Indica il valore approssimativo dei tuoi principali asset (immobiliari, mobiliari, liquidi)
                </FormDescription>
                
                {/* Mostra gli asset esistenti */}
                {form.watch("assets")?.map((asset, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <FormField
                      control={form.control}
                      name={`assets.${index}.category`}
                      render={({ field }) => (
                        <FormItem className="flex-[2]">
                          <FormControl>
                            <Input
                              value={t(`asset_categories.${field.value}`)}
                              disabled
                              className="bg-muted"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name={`assets.${index}.value`}
                      render={({ field }) => (
                        <FormItem className="flex-[2]">
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0"
                              {...field}
                              onChange={e => field.onChange(e.target.valueAsNumber)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const currentAssets = form.getValues("assets");
                        form.setValue(
                          "assets",
                          currentAssets.filter((_, i) => i !== index)
                        );
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                <div className="mt-4 p-4 bg-muted rounded-md">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Patrimonio netto stimato:</span>
                    <span className="font-bold">€{calculateNetWorth().toLocaleString()}</span>
                  </div>
                  <FormDescription className="mt-2">
                    Calcolato come differenza tra il valore totale degli asset e i debiti
                  </FormDescription>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Button 
                type="submit" 
                className="w-full"
                disabled={mutation.isPending || !form.formState.isValid}
              >
                {mutation.isPending ? t('common.saving') : t('common.save')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              {!form.formState.isValid && (
                <p className="text-sm text-red-500 mt-2">
                  {t('common.please_fill_all_fields')}
                </p>
              )}
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
} 