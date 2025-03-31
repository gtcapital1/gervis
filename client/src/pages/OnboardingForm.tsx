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

// Define the form schema
const assetSchema = z.object({
  value: z.coerce.number().min(0, "Il valore non può essere negativo"),
  category: z.string().refine(val => ASSET_CATEGORIES.includes(val as any), {
    message: "Seleziona una categoria valida"
  }),
  description: z.string().optional(),
});

export default function OnboardingForm() {
  // Invece di usare params, prendi il token dalla query
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  
  // Setup form with the shared schema
  const form = useForm<MifidData>({
    resolver: zodResolver(MIFID_SCHEMA),
    defaultValues: {
      // Personal Information
      address: "",
      phone: "",
      birthDate: "",
      maritalStatus: "",
      employmentStatus: "",
      educationLevel: "",
      annualIncome: 0,
      monthlyExpenses: 0,
      debts: 0,
      dependents: 0,
      
      // Investment Profile
      riskProfile: "balanced", // Default to balanced risk
      investmentExperience: "none", // Default to no experience
      investmentHorizon: "medium_term", // Default to medium term
      
      // Nuovi campi per esperienze di investimento
      pastInvestmentExperience: [],
      financialEducation: [],
      
      // Obiettivi di investimento con rank 1-5
      retirementInterest: 3,
      wealthGrowthInterest: 3,
      incomeGenerationInterest: 3,
      capitalPreservationInterest: 3,
      estatePlanningInterest: 3,
      
      // Assets (precompilati con tutti i tipi e valore 0)
      assets: ASSET_CATEGORIES.map(category => ({
        value: 0,
        category,
        description: ""
      })),

      // Nuovi campi per la tolleranza al rischio
      portfolioDropReaction: "",
      volatilityTolerance: "",

      // Campi per la sezione 6: Esperienza e Comportamento d'Investimento
      yearsOfExperience: "",
      investmentFrequency: "",
      advisorUsage: "",
      monitoringTime: "",

      // Domande specifiche (opzionale)
      specificQuestions: "",
    }
  });
  
  // Otteniamo il token dalla query string o dai parametri di route
  const [token, setToken] = useState<string | null>(null);
  const params = useParams();
  
  useEffect(() => {
    // Prima controlliamo la query string
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    
    if (tokenParam) {
      setToken(tokenParam);
    } else if (params.token) {
      // Se non c'è nella query string, controlliamo i parametri di route
      setToken(params.token);
    }
  }, [params]);
  
  // Convert enums to select options
  const riskProfileOptions = RISK_PROFILES as unknown as [string, ...string[]];
  const categoryOptions = ASSET_CATEGORIES as unknown as [string, ...string[]];
  const experienceLevelOptions = EXPERIENCE_LEVELS as unknown as [string, ...string[]];
  const investmentHorizonOptions = INVESTMENT_HORIZONS as unknown as [string, ...string[]];
  const investmentGoalOptions = INVESTMENT_GOALS as unknown as [string, ...string[]];
  const personalInterestOptions = PERSONAL_INTERESTS as unknown as [string, ...string[]];

  // Define the client response type
  type ClientResponse = {
    id: number;
    name: string;
    email: string;
    isOnboarded: boolean;
  };

  // Imposta la lingua in base al parametro nell'URL
  useEffect(() => {
    // Imposta la lingua di default in italiano a meno che non sia specificato diversamente
    i18n.changeLanguage('it');
    
    // Controlla se c'è un parametro URL esplicito
    const url = new URL(window.location.href);
    const languageParam = url.searchParams.get('language');
    
    if (languageParam === 'italian') {
      i18n.changeLanguage('it');
    } else if (languageParam === 'english') {
      i18n.changeLanguage('en');
    }
    
    console.log("Lingua impostata su:", i18n.language);
  }, [i18n]);

  // Fetch client data using token
  const { 
    data: client, 
    isLoading, 
    isError, 
    error 
  } = useQuery<ClientResponse, Error, ClientResponse>({
    queryKey: ['/api/onboarding', token],
    queryFn: () => {
      if (!token) throw new Error("No token provided");
      return apiRequest(`/api/onboarding?token=${token}`);
    },
    enabled: !!token
  });
  
  // Calcolatore del patrimonio netto
  const calculateNetWorth = () => {
    const assets = form.getValues().assets || [];
    const totalAssets = assets.reduce((sum, asset) => sum + (asset.value || 0), 0);
    const debts = form.getValues().debts || 0;
    return totalAssets - debts;
  };
  
  // Controllo delle priorità duplicate
  const hasDuplicatePriorities = () => {
    const priorities = [
      form.getValues().retirementInterest,
      form.getValues().wealthGrowthInterest,
      form.getValues().incomeGenerationInterest,
      form.getValues().capitalPreservationInterest,
      form.getValues().estatePlanningInterest
    ];
    
    // Verifica se ci sono duplicati tra i valori non-zero
    const nonZeros = priorities.filter(p => p > 0);
    return new Set(nonZeros).size !== nonZeros.length;
  };
  
  // Handle form submission
  const mutation = useMutation({
    mutationFn: (data: MifidData) => {
      if (!token) throw new Error("No token provided");
      return apiRequest(`/api/onboarding?token=${token}`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      setFormSuccess(true);
      // Mostra il messaggio di successo per 2 secondi e poi reindirizza alla home
      setTimeout(() => {
        setLocation('/');
      }, 2000);
    },
    onError: (error: any) => {
      console.error("Error submitting form:", error);
      if (error.message?.includes("token")) {
        setFormError("Errore durante l'invio del modulo. Per favore, richiedi un nuovo link di onboarding.");
      } else if (error.response?.data?.error) {
        setFormError(error.response.data.error);
      } else {
        setFormError("Si è verificato un errore durante l'invio del modulo. Per favore, riprova.");
      }
    }
  });
  
  function addAsset() {
    const assets = form.getValues().assets;
    form.setValue("assets", [
      ...assets, 
      { value: 0, category: "cash", description: "" }
    ]);
  }
  
  function removeAsset(index: number) {
    const assets = form.getValues().assets;
    if (assets.length > 1) {
      form.setValue("assets", assets.filter((_, i) => i !== index));
    } else {
      toast({
        title: "Cannot remove",
        description: "You need at least one asset",
        variant: "destructive"
      });
    }
  }
  
  // Funzione temporanea per compilare automaticamente il form
  const autoFillForm = () => {
    form.reset({
      // Personal Information
      address: "Via Roma 123",
      phone: "+39 1234567890",
      birthDate: "1990-01-01",
      maritalStatus: "single",
      employmentStatus: "employed",
      educationLevel: "bachelor",
      annualIncome: 50000,
      monthlyExpenses: 2000,
      debts: 10000,
      dependents: 1,
      
      // Investment Profile
      riskProfile: "balanced",
      investmentExperience: "intermediate",
      investmentHorizon: "medium_term",
      
      // Past Investment Experience
      pastInvestmentExperience: ["stocks", "bonds", "funds"],
      financialEducation: ["university", "courses"],
      
      // Investment Interests
      retirementInterest: 1,
      wealthGrowthInterest: 2,
      incomeGenerationInterest: 3,
      capitalPreservationInterest: 4,
      estatePlanningInterest: 5,
      
      // Assets
      assets: [
        { value: 100000, category: "real_estate", description: "Casa di proprietà" },
        { value: 50000, category: "equity", description: "Azioni" },
        { value: 30000, category: "bonds", description: "Obbligazioni" },
        { value: 20000, category: "cash", description: "Contanti" }
      ],

      // Risk Tolerance
      portfolioDropReaction: "hold",
      volatilityTolerance: "medium",

      // Investment Behavior
      yearsOfExperience: "3_to_5",
      investmentFrequency: "monthly",
      advisorUsage: "balanced",
      monitoringTime: "weekly",

      // Specific Questions
      specificQuestions: "Nessuna domanda specifica"
    });
  };

  // Modifica la funzione onSubmit per gestire meglio gli errori
  async function onSubmit(data: MifidData) {
    setFormError(null);
    
    try {
      console.log("DEBUG - Invio dati:", data);
      
      await mutation.mutateAsync(data);
    } catch (error: any) {
      console.error("DEBUG - Errore durante l'invio:", error);
      if (error.message?.includes("token")) {
        setFormError("Errore durante l'invio del modulo. Per favore, richiedi un nuovo link di onboarding.");
      } else if (error.response?.data?.error) {
        setFormError(error.response.data.error);
      } else {
        setFormError("Si è verificato un errore durante l'invio del modulo. Per favore, riprova.");
      }
    }
  }
  
  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-20 px-4 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
            <CardDescription>Please wait while we load your information.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="container max-w-4xl mx-auto py-20 px-4 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Invalid Link</CardTitle>
            <CardDescription>
              This onboarding link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error instanceof Error ? error.message : "Please contact your financial advisor for a new link."}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full accent-black"
              onClick={() => setLocation("/")}
            >
              Return to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (client?.isOnboarded) {
    return (
      <div className="container max-w-4xl mx-auto py-20 px-4 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Already Onboarded</CardTitle>
            <CardDescription>
              You have already completed the onboarding process.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>
                Your information has been successfully submitted. There is no need to fill out this form again.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full accent-black"
              onClick={() => setLocation("/")}
            >
              Return to Home
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
            <CardTitle>Onboarding Completato</CardTitle>
            <CardDescription>
              Grazie per aver completato il processo di onboarding
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <CheckCircle2 className="h-16 w-16 text-green-500 animate-pulse" />
            <p className="mt-4 text-center">I tuoi dati sono stati salvati con successo.</p>
            <p className="mt-2 text-center text-muted-foreground">Verrai reindirizzato alla home page tra qualche secondo...</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container max-w-4xl mx-auto py-10 px-4 sm:px-6">
      {/* Aggiungi il pulsante per l'autocompilazione temporaneo */}
      <Button 
        onClick={autoFillForm}
        className="mb-4 bg-yellow-500 hover:bg-yellow-600"
      >
        🚀 Compila Automaticamente (Temporaneo)
      </Button>

      <Card className="mb-10">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">{t('onboarding.welcome')}, {client?.name}</CardTitle>
          <CardDescription>
            {t('onboarding.instructions')}
          </CardDescription>
        </CardHeader>
      </Card>
      
      {formError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('onboarding.error')}</AlertTitle>
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
                name="maritalStatus"
                  render={({ field }) => (
                    <FormItem>
                    <FormLabel>Stato civile</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
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
                    <FormDescription>
                      Il tuo attuale stato civile a fini fiscali e di pianificazione
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
                    <FormLabel>Professione</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona la tua professione" />
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
                    <FormDescription>
                      La tua attuale professione o stato occupazionale
                    </FormDescription>
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
                      defaultValue={field.value}
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
                    <FormDescription>
                      Il tuo titolo di studio più elevato
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Sezione 2: Situazione Finanziaria Attuale */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Sezione 2: Situazione Finanziaria Attuale
              </CardTitle>
              <CardDescription>
                Informazioni sulla tua situazione economica e patrimoniale attuale
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="annualIncome"
                    render={({ field }) => (
                      <FormItem>
                    <FormLabel>Reddito annuo netto</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="50000"
                            {...field}
                            onChange={e => field.onChange(e.target.valueAsNumber)}
                          />
                        </FormControl>
                    <FormDescription>
                      Indicare l'ammontare medio netto percepito annualmente, considerando tutte le fonti di reddito
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
                      La somma delle tue spese ricorrenti mensili, inclusi affitto/mutuo, utenze, trasporti, alimentari, ecc.
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
                    <FormLabel>Persone a carico</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0"
                            {...field}
                            onChange={e => field.onChange(e.target.valueAsNumber)}
                          />
                        </FormControl>
                    <FormDescription>
                      Numero di persone a tuo carico, inclusi figli o altri familiari
                    </FormDescription>
                        <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Assets section summary - semplificata */}
              <div className="pt-4">
                <h3 className="text-md font-semibold mb-2">I tuoi asset principali</h3>
                <FormDescription className="mb-4">
                  Indica il valore approssimativo dei tuoi principali asset (immobiliari, mobiliari, liquidi)
                </FormDescription>
                
                {/* Mostra solo le categorie principali e "altri asset" */}
                {["real_estate", "equity", "bonds", "cash", "private_equity", "venture_capital", "cryptocurrencies", "other"].map((category, index) => (
                  <div key={category} className="flex gap-2 mb-2">
                    <FormField
                      control={form.control}
                      name={`assets.${categoryOptions.indexOf(category)}.category`}
                      render={({ field }) => (
                        <FormItem className="flex-[2]">
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={category}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Categoria" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={category}>
                                {t(`asset_categories.${category}`)}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name={`assets.${categoryOptions.indexOf(category)}.value`}
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

          {/* Sezione 3: Obiettivi d'Investimento */}
          <Card>
              <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Sezione 3: Obiettivi d'Investimento
              </CardTitle>
                <CardDescription>
                Informazioni sui tuoi obiettivi finanziari e priorità
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
                        {investmentHorizonOptions.map(horizon => (
                          <SelectItem key={horizon} value={horizon}>
                            {t(`investment_horizons.${horizon}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Periodo durante il quale prevedi di mantenere gli investimenti
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <h3 className="text-md font-semibold pt-4">Priorità degli obiettivi d'investimento</h3>
              <FormDescription className="mb-4">
                Ordina gli obiettivi per importanza (1 = più importante, 5 = meno importante). 
                <span className="text-red-500 font-semibold"> Ogni numero deve essere assegnato a un solo obiettivo.</span>
              </FormDescription>
              
              {hasDuplicatePriorities() && (
                <div className="mb-4 p-3 border border-red-400 bg-red-50 rounded-md text-red-700">
                  <p className="text-sm font-medium">
                    Attenzione: hai assegnato lo stesso numero di priorità a più obiettivi. Per procedere, assicurati che ogni obiettivo abbia un valore di priorità unico.
                  </p>
                </div>
              )}

              <div className="space-y-6">
                {[
                  { 
                    name: "retirementInterest", 
                    label: "Pianificazione della pensione",
                    description: "Costruire un capitale sufficiente per mantenere il tuo tenore di vita dopo il pensionamento"
                  },
                  { 
                    name: "wealthGrowthInterest", 
                    label: "Crescita del capitale",
                    description: "Aumentare il valore complessivo del tuo patrimonio nel medio-lungo periodo"
                  },
                  { 
                    name: "incomeGenerationInterest", 
                    label: "Generazione di reddito",
                    description: "Ottenere flussi di cassa periodici dagli investimenti per integrare le entrate correnti"
                  },
                  { 
                    name: "capitalPreservationInterest", 
                    label: "Protezione del capitale",
                    description: "Difendere il valore del tuo patrimonio dall'inflazione e da perdite potenziali"
                  },
                  { 
                    name: "estatePlanningInterest", 
                    label: "Pianificazione ereditaria",
                    description: "Organizzare il trasferimento efficiente del patrimonio ai tuoi eredi o enti benefici"
                  }
                ].map(({ name, label, description }) => (
              <FormField
                    key={name}
                control={form.control}
                    name={name as any}
                render={({ field }) => (
                  <FormItem>
                        <div className="flex justify-between items-center">
                          <FormLabel>{label}</FormLabel>
                          <div className="flex items-center space-x-2">
                            {[1, 2, 3, 4, 5].map((value) => {
                              // Controlla se questo valore è già usato da un altro campo
                              const isUsedElsewhere = [
                                "retirementInterest",
                                "wealthGrowthInterest",
                                "incomeGenerationInterest",
                                "capitalPreservationInterest",
                                "estatePlanningInterest"
                              ]
                                .filter(n => n !== name)
                                .some(otherName => form.getValues(otherName as any) === value);
                              
                              // Ora permettiamo la selezione anche se il valore è duplicato
                              const isDuplicate = isUsedElsewhere && field.value === value;
                              
                              return (
                                <div 
                                  key={value}
                                  className={`w-8 h-8 flex items-center justify-center rounded cursor-pointer ${
                                    field.value === value 
                                      ? isUsedElsewhere 
                                        ? 'bg-red-500 text-white' // Selezione duplicata
                                        : 'bg-primary text-primary-foreground' // Selezione normale
                                      : 'bg-muted hover:bg-muted/80' // Non selezionato
                                  }`}
                                  onClick={() => field.onChange(value)}
                                >
                                  {value}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                    <FormDescription>
                          {description}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
                ))}
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
                      defaultValue={field.value}
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
                      ].map(item => (
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
                      ].map(item => (
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
                Valutazione della tua propensione al rischio negli investimenti
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                name="riskProfile"
                    render={({ field }) => (
                      <FormItem>
                    <FormLabel>Profilo di rischio personale</FormLabel>
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
                      Quanto sei disposto ad accettare rischi negli investimenti per potenziali rendimenti più elevati
                    </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                name="portfolioDropReaction"
                    render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Reazione a una flessione del portafoglio</FormLabel>
                    <FormDescription>
                      Come reagiresti in caso di una perdita del 10% o superiore?
                    </FormDescription>
                        <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="sell_all" />
                        </FormControl>
                          <FormLabel className="font-normal">
                            Venderei tutto per evitare ulteriori perdite
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="sell_part" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Venderei una parte degli investimenti per ridurre il rischio
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="hold" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Manterrei la posizione attuale senza modifiche
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="buy_more" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Acquisterei di più approfittando dei prezzi ribassati
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
                        defaultValue={field.value}
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
                            Accetto oscillazioni moderate se necessarie per raggiungere i miei obiettivi
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="high" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Accetto forti oscillazioni se la prospettiva di rendimento a lungo termine è alta
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="very_high" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Non mi preoccupano le oscillazioni, anche significative, guardo solo al lungo periodo
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
          
          {/* Sezione 6: Esperienza e Comportamento d'Investimento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Sezione 6: Esperienza e Comportamento d'Investimento
              </CardTitle>
              <CardDescription>
                Informazioni sulle tue abitudini di investimento e monitoraggio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="yearsOfExperience"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Anni di esperienza negli investimenti</FormLabel>
                    <FormDescription>
                      Da quanti anni operi nei mercati finanziari?
                </FormDescription>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="none" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Nessuna esperienza
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="less_than_1" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Meno di 1 anno
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="1_to_3" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Da 1 a 3 anni
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="3_to_5" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Da 3 a 5 anni
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="5_to_10" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Da 5 a 10 anni
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="more_than_10" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Più di 10 anni
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
                name="investmentFrequency"
                        render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Frequenza degli investimenti</FormLabel>
                    <FormDescription>
                      Con quale frequenza effettui operazioni di investimento?
                    </FormDescription>
                            <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="daily" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Giornaliera
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="weekly" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Settimanale
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="monthly" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Mensile
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="quarterly" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Trimestrale
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="yearly" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Annuale
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="occasional" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Occasionale
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
                        defaultValue={field.value}
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
                        defaultValue={field.value}
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
          
          {/* Sezione 7: Domande Specifiche */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Sezione 7: Domande Specifiche
              </CardTitle>
              <CardDescription>
                Hai domande specifiche o considerazioni particolari da condividere?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="specificQuestions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Domande e considerazioni</FormLabel>
                    <FormDescription>
                      Se hai domande specifiche o considerazioni particolari che vorresti condividere, scrivile qui. Questo campo è opzionale.
                    </FormDescription>
                    <FormControl>
                      <Textarea 
                        placeholder="Scrivi qui le tue domande o considerazioni..."
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
              <Button 
                type="submit" 
              className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
              disabled={mutation.isPending || hasDuplicatePriorities()}
            >
              {mutation.isPending ? (
                <span className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Elaborazione...
                </span>
              ) : hasDuplicatePriorities() ? (
                <span className="flex items-center">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Correggi le priorità duplicate
                </span>
              ) : (
                <span className="flex items-center">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Completa onboarding
                </span>
              )}
              </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}