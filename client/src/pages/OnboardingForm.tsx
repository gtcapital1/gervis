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
  EXPERIENCE_LEVELS,
  INVESTMENT_GOALS,
  PERSONAL_INTERESTS
} from "@shared/schema";
import { Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Nuovo schema MIFID_SCHEMA basato sulla struttura aggiornata del database e sull'uso nel form
const MIFID_SCHEMA = z.object({
  // Sezione 1: Dati Anagrafici e Informazioni Personali
  address: z.string().min(1, "L'indirizzo è obbligatorio"),
  phone: z.string().min(1, "Il numero di telefono è obbligatorio"),
  birthDate: z.string().min(1, "La data di nascita è obbligatoria"),
  employmentStatus: z.string().min(1, "Lo stato occupazionale è obbligatorio"),
  educationLevel: z.string().min(1, "Il livello di istruzione è obbligatorio"),
  
  // Sezione 2: Situazione Finanziaria Attuale
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
  volatilityTolerance: z.string().optional()
});

// Definizione del tipo MifidData
export type MifidData = z.infer<typeof MIFID_SCHEMA>;

// Correzione degli errori di tipo
type AssetData = {
  category: string;
  value: number;
  description?: string;
};

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
      employmentStatus: "",
      educationLevel: "",
      annualIncome: "0-30,000€", // Default income range
      netWorth: "0-10,000€", // Default net worth range
      monthlyExpenses: "0-500€", // Default monthly expenses
      debts: "0-5,000€", // Default debts
      
      // Investment Profile
      riskProfile: "balanced", // Default to balanced risk
      investmentExperience: "none", // Default to no experience
      investmentHorizon: "2-5-anni", // Default to 2-5 years
      
      // Interessi di investimento (array di stringhe, max 2)
      investmentInterests: [],
      
      // Nuovi campi per esperienze di investimento
      pastInvestmentExperience: [],
      financialEducation: [],

      // Nuovi campi per la tolleranza al rischio
      portfolioDropReaction: "",
      volatilityTolerance: "",

      // Campo per la domanda sull'ETF diversificato
      etfObjectiveQuestion: "",
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
  const experienceLevelOptions = EXPERIENCE_LEVELS as unknown as [string, ...string[]];
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
      
      if (error.message?.includes("token")) {
        setFormError("Errore durante l'invio del modulo. Per favore, richiedi un nuovo link di onboarding.");
      } else if (error.response?.data?.error) {
        setFormError(error.response.data.error);
      } else {
        setFormError("Si è verificato un errore durante l'invio del modulo. Per favore, riprova.");
      }
    }
  });
  
  // Modifica la funzione onSubmit per gestire meglio gli errori
  async function onSubmit(data: MifidData) {
    setFormError(null);
    
    try {
      
      
      await mutation.mutateAsync(data);
    } catch (error: any) {
      
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
                  {investmentGoalOptions.map((goal) => {
                    const isSelected = form.watch("investmentInterests")?.includes(goal);
                    const selectedCount = form.watch("investmentInterests")?.length || 0;

                        return (
                      <div key={goal} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`interest-${goal}`}
                          checked={isSelected}
                          disabled={!isSelected && selectedCount >= 2}
                          onCheckedChange={(checked) => {
                            const currentInterests = form.getValues("investmentInterests") || [];
                            if (checked) {
                              if (currentInterests.length < 2) {
                                form.setValue("investmentInterests", [...currentInterests, goal]);
                              }
                            } else {
                              form.setValue("investmentInterests", currentInterests.filter(i => i !== goal));
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
                  
                  {form.formState.errors.investmentInterests && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.investmentInterests.message?.toString()}
                    </p>
                  )}
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
                        { id: "courses", label: "Corsi di formazione in ambito finanziario" },
                        { id: "none", label: "Nessuna formazione specifica" },
                        { id: "other", label: "Altro" }
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
                Informazioni sulla tua propensione al rischio e alla volatilità
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
                        <SelectItem value="conservative">
                          Conservativo - Preferisci stabilità e sicurezza, accettando rendimenti più contenuti
                        </SelectItem>
                        <SelectItem value="balanced">
                          Bilanciato - Cerchi un equilibrio tra crescita e protezione del capitale
                        </SelectItem>
                        <SelectItem value="aggressive">
                          Aggressivo - Punti alla massima crescita, accettando volatilità e rischi maggiori
                        </SelectItem>
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
                      Come reagiresti in caso di una perdita del 20% o superiore?
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
                    name="etfObjectiveQuestion"
                    render={({ field }) => (
                  <FormItem className="space-y-3">
                        <FormLabel>Qual è l'obiettivo di un ETF diversificato?</FormLabel>
                        <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                                <RadioGroupItem value="correct" />
                        </FormControl>
                          <FormLabel className="font-normal">
                                Ridurre il rischio distribuendo gli investimenti su diversi titoli o settori
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                                <RadioGroupItem value="distractor" />
                          </FormControl>
                          <FormLabel className="font-normal">
                                Massimizzare i dividendi attraverso la selezione di titoli ad alto rendimento
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                                <RadioGroupItem value="wrong" />
                          </FormControl>
                          <FormLabel className="font-normal">
                                Garantire rendimenti superiori al mercato in ogni condizione
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                                <RadioGroupItem value="dontknow" />
                          </FormControl>
                          <FormLabel className="font-normal">
                                Non so rispondere
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
          
          {/* Pulsanti form */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => setLocation("/")}>
              Annulla
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="min-w-[100px]">
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Invia <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
              </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}