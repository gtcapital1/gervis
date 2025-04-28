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
import { useAuth } from "@/hooks/use-auth";
import React from "react";

// Definisci il tipo MifidData in base allo schema del form
type MifidData = {
  id?: string;
  clientId?: number;
  address: string;
  phone: string;
  birthDate: string;
  employmentStatus: string;
  educationLevel: string;
  annualIncome: string;
  monthlyExpenses: string;
  debts: string;
  netWorth: string;
  investmentHorizon: string;
  investmentInterests?: string[];
  investmentObjective?: string;
  investmentExperience: string;
  pastInvestmentExperience: string[];
  financialEducation: string[];
  etfObjectiveQuestion: string;
  riskProfile: string;
  portfolioDropReaction: string;
  volatilityTolerance?: string;
  createdAt?: string;
  updatedAt?: string;
};

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
  // Sezione 1: Dati Anagrafici e Informazioni Personali
  address: z.string().min(1, "L'indirizzo è obbligatorio"),
  phone: z.string().min(1, "Il numero di telefono è obbligatorio"),
  birthDate: z.string().min(1, "La data di nascita è obbligatoria"),
  employmentStatus: z.string().min(1, "Lo stato occupazionale è obbligatorio"),
  educationLevel: z.string().min(1, "Il livello di istruzione è obbligatorio"),
  
  // Sezione 2: Situazione Finanziaria Attuale - cambiati da numeri a range
  annualIncome: z.string().min(1, "Il reddito annuale è obbligatorio"),
  monthlyExpenses: z.string().min(1, "Le spese mensili sono obbligatorie"),
  debts: z.string().min(1, "L'informazione sui debiti è obbligatoria"),
  netWorth: z.string().min(1, "Il patrimonio netto è obbligatorio"),
  
  // Sezione 3: Obiettivi d'Investimento
  investmentHorizon: z.string().min(1, "L'orizzonte temporale è obbligatorio"),
  investmentInterests: z.array(z.string()).optional(),
  
  // Sezione 4: Conoscenza ed Esperienza con Strumenti Finanziari
  investmentExperience: z.string().min(1, "Il livello di esperienza è obbligatorio"),
  pastInvestmentExperience: z.array(z.string()).min(1, "Seleziona almeno un'esperienza passata"),
  financialEducation: z.array(z.string()).min(1, "Seleziona almeno un tipo di formazione finanziaria"),
  etfObjectiveQuestion: z.string().min(1, "La risposta alla domanda sull'obiettivo degli ETF è obbligatoria"),
  
  // Sezione 5: Tolleranza al Rischio
  riskProfile: z.string().min(1, "Il profilo di rischio è obbligatorio"),
  portfolioDropReaction: z.string().min(1, "La reazione al calo del portafoglio è obbligatoria"),
  volatilityTolerance: z.string().optional(),
  
  // Campo per asset
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
      employmentStatus: mifidData?.employmentStatus || "",
      educationLevel: mifidData?.educationLevel || "",
      annualIncome: mifidData?.annualIncome || "",
      monthlyExpenses: mifidData?.monthlyExpenses || "",
      debts: mifidData?.debts || "",
      netWorth: mifidData?.netWorth || "",
      
      // Investment Profile
      investmentHorizon: mifidData?.investmentHorizon || "",
      investmentInterests: mifidData?.investmentInterests || [],
      
      // Nuovi campi per esperienze di investimento
      investmentExperience: mifidData?.investmentExperience || "",
      pastInvestmentExperience: mifidData?.pastInvestmentExperience || [],
      financialEducation: mifidData?.financialEducation || [],
      etfObjectiveQuestion: mifidData?.etfObjectiveQuestion || "",
      
      // Tolleranza al rischio
      riskProfile: mifidData?.riskProfile || "balanced",
      portfolioDropReaction: mifidData?.portfolioDropReaction || "hold",
      volatilityTolerance: mifidData?.volatilityTolerance || "",
      
      // Assets (precompilati con i dati esistenti dalla tabella assets)
      assets: clientData?.assets || [],
    }
  });

  // Update form values when MIFID data is loaded
  useEffect(() => {
    if (mifidData) {
      console.log("MIFID data loaded:", mifidData);
      console.log("Investment interests:", mifidData.investmentInterests);
      console.log("Portfolio drop reaction:", mifidData.portfolioDropReaction);
      console.log("Investment experience:", mifidData.investmentExperience);
      
      const formData = {
        // Sezione 1: Dati Anagrafici e Informazioni Personali
        address: mifidData.address,
        phone: mifidData.phone,
        birthDate: mifidData.birthDate,
        employmentStatus: mifidData.employmentStatus,
        educationLevel: mifidData.educationLevel,
        
        // Sezione 2: Situazione Finanziaria Attuale
        annualIncome: mifidData.annualIncome,
        monthlyExpenses: mifidData.monthlyExpenses,
        debts: mifidData.debts,
        netWorth: mifidData.netWorth,
        assets: clientData?.assets || [], // Usa gli asset dalla tabella assets

        // Sezione 3: Obiettivi d'Investimento
        investmentHorizon: mifidData.investmentHorizon,
        investmentInterests: Array.isArray(mifidData.investmentInterests) 
          ? mifidData.investmentInterests 
          : (mifidData.investmentObjective ? mifidData.investmentObjective.split(',').map(i => i.trim()) : []),

        // Sezione 4: Conoscenza ed Esperienza con Strumenti Finanziari
        investmentExperience: mifidData.investmentExperience || "",
        pastInvestmentExperience: mifidData.pastInvestmentExperience,
        financialEducation: mifidData.financialEducation,
        etfObjectiveQuestion: mifidData.etfObjectiveQuestion || "",

        // Sezione 5: Tolleranza al Rischio
        riskProfile: mifidData.riskProfile,
        portfolioDropReaction: mifidData.portfolioDropReaction || "hold",
        volatilityTolerance: mifidData.volatilityTolerance,
      };

      console.log("Form data being set:", formData);
      
      // Reset del form con i dati estratti
      form.reset(formData);
      
      // Verifica esplicita che i valori siano stati impostati correttamente
      setTimeout(() => {
        console.log("Form values after reset:", form.getValues());
        console.log("Investment interests after reset:", form.getValues().investmentInterests);
        console.log("Portfolio drop after reset:", form.getValues().portfolioDropReaction);
        console.log("Investment experience after reset:", form.getValues().investmentExperience);
      }, 100);
    }
  }, [mifidData, clientData, form]);

  // Handle form submission
  const mutation = useMutation({
    mutationFn: async (data: MifidFormValues) => {
      console.log("Submitting form data:", data);
      
      try {
        // Rimuoviamo il riferimento agli asset che sono stati tolti dal form
        const { assets, ...mifidData } = data;
        
        // Prepariamo solo i dati MIFID senza asset
        const payload = {
          ...mifidData
        };
        
        console.log("Sending payload to API:", payload);
        
        // Chiamata API solo per i dati MIFID
        const response = await apiRequest(`/api/clients/${clientId}/mifid`, {
          method: "PATCH",
          body: JSON.stringify(payload),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        return response;
      } catch (error: unknown) {
        console.error("Error submitting form:", error);
        throw error;
      }
    },
    onSuccess: (response) => {
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
      console.error("Form submission error:", error);
      setFormError(error instanceof Error ? error.message : "Si è verificato un errore durante il salvataggio");
    }
  });

  function onSubmit(data: MifidFormValues) {
    
    
    
    // Verifica la validazione
    const validationResult = mifidFormSchema.safeParse(data);
    if (!validationResult.success) {
      
      setFormError("Errore di validazione: " + validationResult.error.message);
      return;
    }
    
    
    mutation.mutate(data);
  }

  // Funzione per aggiungere un nuovo asset
  function addAsset() {
    const assets = form.getValues().assets;
    
    // Creiamo un array delle categorie già presenti
    const existingCategories = assets.map(asset => asset.category);
    
    // Troviamo una categoria che non è ancora stata utilizzata
    const unusedCategory = ASSET_CATEGORIES.find(category => !existingCategories.includes(category));
    
    form.setValue("assets", [
      ...assets, 
      { category: unusedCategory || "cash", value: 0, description: "" }
    ]);
  }
  
  // Funzione per rimuovere un asset
  function removeAsset(index: number) {
    const assets = form.getValues().assets;
    if (assets.length > 1) {
      form.setValue("assets", assets.filter((_, i) => i !== index));
    } else {
      toast({
        title: "Non è possibile rimuovere",
        description: "È necessario avere almeno un asset",
        variant: "destructive"
      });
    }
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
                      <FormLabel>Reddito annuo netto</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                      <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona il tuo reddito annuo" />
                          </SelectTrigger>
                      </FormControl>
                        <SelectContent>
                          <SelectItem value="0-30,000€">0-30,000€</SelectItem>
                          <SelectItem value="30,000-50,000€">30,000-50,000€</SelectItem>
                          <SelectItem value="50,000-80,000€">50,000-80,000€</SelectItem>
                          <SelectItem value="80,000-120,000€">80,000-120,000€</SelectItem>
                          <SelectItem value="over-120,000€">{'>'}120,000€</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Indicare l'ammontare medio netto percepito annualmente, considerando tutte le fonti di reddito
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="netWorth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patrimonio netto</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                      <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona il tuo patrimonio netto" />
                          </SelectTrigger>
                      </FormControl>
                        <SelectContent>
                          <SelectItem value="0-10,000€">0-10,000€</SelectItem>
                          <SelectItem value="10,000-30,000€">10,000-30,000€</SelectItem>
                          <SelectItem value="30,000-100,000€">30,000-100,000€</SelectItem>
                          <SelectItem value="100,000-500,000€">100,000-500,000€</SelectItem>
                          <SelectItem value="over-500,000€">{'>'}500,000€</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Indicare il valore approssimativo del patrimonio complessivo (immobili, investimenti, liquidità, ecc.)
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
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                      <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona le tue spese mensili" />
                          </SelectTrigger>
                      </FormControl>
                        <SelectContent>
                          <SelectItem value="0-500€">0-500€</SelectItem>
                          <SelectItem value="500-1,000€">500-1,000€</SelectItem>
                          <SelectItem value="1,000-2,500€">1,000-2,500€</SelectItem>
                          <SelectItem value="2,500-5,000€">2,500-5,000€</SelectItem>
                          <SelectItem value="over-5,000€">{'>'}5,000€</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Indicare le spese mensili medie (affitto/mutuo, bollette, altre spese)
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
                      <FormLabel>Passività totali</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                      <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona le tue passività totali" />
                          </SelectTrigger>
                      </FormControl>
                        <SelectContent>
                          <SelectItem value="0-5,000€">0-5,000€</SelectItem>
                          <SelectItem value="5,000-15,000€">5,000-15,000€</SelectItem>
                          <SelectItem value="15,000-30,000€">15,000-30,000€</SelectItem>
                          <SelectItem value="30,000-50,000€">30,000-50,000€</SelectItem>
                          <SelectItem value="over-50,000€">{'>'}50,000€</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Indicare l'ammontare totale dei debiti (mutui, prestiti personali, finanziamenti)
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
                name="investmentHorizon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orizzonte temporale</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona l'orizzonte temporale" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0-2-anni">0-2 anni</SelectItem>
                        <SelectItem value="2-5-anni">2-5 anni</SelectItem>
                        <SelectItem value="5-10-anni">5-10 anni</SelectItem>
                        <SelectItem value="over-10-anni">Più di 10 anni</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Periodo durante il quale prevedi di mantenere gli investimenti
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Interessi di Investimento */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <FormLabel className="text-base">Interessi di investimento</FormLabel>
                  <FormDescription className="mb-4">
                    Seleziona massimo 2 obiettivi di investimento che sono più importanti per te.
                  </FormDescription>
                </div>

                <div className="space-y-4">
                  {INVESTMENT_GOALS.map((goal) => {
                    // Debug del valore attuale
                    console.log(`Checking goal ${goal}, current interests:`, form.watch("investmentInterests"));
                    const isSelected = form.watch("investmentInterests")?.includes(goal);
                    const selectedCount = form.watch("investmentInterests")?.length || 0;

                        return (
                      <div key={goal} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`interest-${goal}`}
                          checked={isSelected}
                          disabled={!isSelected && selectedCount >= 2}
                          onCheckedChange={(checked) => {
                            console.log(`Checkbox changed for ${goal}:`, checked);
                            const currentInterests = form.getValues("investmentInterests") || [];
                            console.log("Current interests before change:", currentInterests);
                            
                            if (checked) {
                              if (currentInterests.length < 2) {
                                const newValues = [...currentInterests, goal];
                                console.log("Setting new values:", newValues);
                                form.setValue("investmentInterests", newValues);
                              }
                            } else {
                              const newValues = currentInterests.filter(i => i !== goal);
                              console.log("Setting new values:", newValues);
                              form.setValue("investmentInterests", newValues);
                            }
                          }}
                        />
                        <label 
                          htmlFor={`interest-${goal}`}
                          className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {goal === "retirement" && "Pianificazione della pensione"}
                          {goal === "wealth_growth" && "Crescita del capitale"}
                          {goal === "income_generation" && "Generazione di reddito"}
                          {goal === "capital_preservation" && "Protezione del capitale"}
                          {goal === "estate_planning" && "Pianificazione ereditaria"}
                        </label>
                                </div>
                    );
                  })}
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
                render={({ field }) => {
                  console.log("Rendering investment experience field, value:", field.value);
                  return (
                  <FormItem>
                    <FormLabel>Livello di conoscenza dei mercati finanziari</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        console.log("Setting investment experience to:", value);
                        field.onChange(value);
                      }}
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
                )}}
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
                        { id: "courses", label: "Corsi di formazione in ambito finanziario" },
                        { id: "none", label: "Nessuna formazione specifica" },
                        { id: "other", label: "Altro" }
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
                name="riskProfile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profilo di rischio</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
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
                      Il tuo livello complessivo di tolleranza al rischio negli investimenti
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="portfolioDropReaction"
                render={({ field }) => {
                  console.log("Portfolio drop field current value:", field.value);
                  return (
                  <FormItem className="space-y-3">
                    <FormLabel>Reazione a un calo del portafoglio</FormLabel>
                    <FormDescription>
                      Come reagiresti a un calo significativo del valore del tuo portafoglio?
                    </FormDescription>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => {
                          console.log("Setting portfolioDropReaction to:", value);
                          field.onChange(value);
                        }}
                        value={field.value || "hold"}
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
                )}}
              />
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