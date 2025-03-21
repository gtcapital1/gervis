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
  INVESTMENT_HORIZONS
} from "@shared/schema";

// Define the form schema
const assetSchema = z.object({
  value: z.coerce.number().min(1, "Value must be greater than 0"),
  category: z.string().refine(val => ASSET_CATEGORIES.includes(val as any), {
    message: "Please select a valid category"
  }),
  description: z.string().optional(),
});

const onboardingFormSchema = z.object({
  // Personal Information
  address: z.string().min(5, "Address must be at least 5 characters"),
  phone: z.string().min(5, "Phone number must be at least 5 characters"),
  taxCode: z.string().min(3, "Tax code must be at least 3 characters"),
  employmentStatus: z.string().min(1, "Employment status is required"),
  annualIncome: z.coerce.number().min(0, "Annual income must be 0 or greater"),
  monthlyExpenses: z.coerce.number().min(0, "Monthly expenses must be 0 or greater"),
  netWorth: z.coerce.number().min(0, "Net worth must be 0 or greater"),
  dependents: z.coerce.number().min(0, "Number of dependents must be 0 or greater"),
  
  // Investment Profile
  riskProfile: z.string().refine(val => RISK_PROFILES.includes(val as any), {
    message: "Please select a valid risk profile"
  }),
  investmentExperience: z.string().refine(val => EXPERIENCE_LEVELS.includes(val as any), {
    message: "Please select a valid experience level"
  }),
  investmentHorizon: z.string().refine(val => INVESTMENT_HORIZONS.includes(val as any), {
    message: "Please select a valid investment horizon"
  }),

  // Interessi di investimento (scala 1-5)
  retirementInterest: z.number().min(1).max(5),
  wealthGrowthInterest: z.number().min(1).max(5),
  incomeGenerationInterest: z.number().min(1).max(5),
  capitalPreservationInterest: z.number().min(1).max(5),
  estatePlanningInterest: z.number().min(1).max(5),
  
  // Interessi Personali
  personalInterests: z.array(z.string()).optional(),
  personalInterestsNotes: z.string().optional(),

  // Assets (mantenuto per compatibilità ma gestito diversamente nell'interfaccia)
  assets: z.array(assetSchema)
});

type OnboardingFormValues = z.infer<typeof onboardingFormSchema>;

export default function OnboardingForm() {
  // Invece di usare params, prendi il token dalla query
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  
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
  const personalInterestOptions = [
    "travel", "sports", "technology", "art", "music", "cinema", 
    "literature", "cooking", "fashion", "photography", "environment", 
    "philanthropy", "health", "education", "real_estate", "entrepreneurship", 
    "financial_markets", "politics", "science"
  ] as unknown as [string, ...string[]];

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
  
  // Prepara gli asset predefiniti con valore 0
  const defaultAssets = ASSET_CATEGORIES.map(category => ({
    value: 0,
    category,
    description: ""
  }));

  // Form setup
  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues: {
      // Personal Information
      address: "",
      phone: "",
      taxCode: "",
      employmentStatus: "",
      annualIncome: 0,
      monthlyExpenses: 0,
      netWorth: 0,
      dependents: 0,
      
      // Investment Profile
      riskProfile: "balanced", // Default to balanced risk
      investmentExperience: "none", // Default to no experience
      investmentHorizon: "medium_term", // Default to medium term
      
      // Obiettivi di investimento con scala 1-5 (3 = valore neutro di default)
      retirementInterest: 3,
      wealthGrowthInterest: 3,
      incomeGenerationInterest: 3,
      capitalPreservationInterest: 3,
      estatePlanningInterest: 3,
      
      // Interessi personali
      personalInterests: [],
      personalInterestsNotes: "",
      
      // Assets (precompilati con tutti i tipi e valore 0)
      assets: defaultAssets
    }
  });
  
  // Handle form submission
  const mutation = useMutation({
    mutationFn: (data: OnboardingFormValues) => {
      if (!token) throw new Error("No token provided");
      return apiRequest(`/api/onboarding?token=${token}`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      setFormSuccess(true);
      setTimeout(() => {
        setLocation("/onboarding/success");
      }, 1500);
    },
    onError: (error: any) => {
      setFormError(error.message || "Failed to submit onboarding form. Please try again.");
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
  
  async function onSubmit(data: OnboardingFormValues) {
    setFormError(null);
    try {
      mutation.mutate(data);
    } catch (error: any) {
      // Se c'è un errore relativo al token, mostra un messaggio più specifico
      if (error.message?.includes("token")) {
        setFormError("Errore durante l'invio del modulo. Per favore, richiedi un nuovo link di onboarding.");
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
              className="w-full"
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
              className="w-full"
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
            <CardTitle>Submitting Your Information</CardTitle>
            <CardDescription>
              Please wait while we process your information.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <CheckCircle2 className="h-16 w-16 text-green-500 animate-pulse" />
            <p className="mt-4 text-center">Your information is being processed...</p>
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
          <Card>
            <CardHeader>
              <CardTitle>{t('onboarding.personal_info')}</CardTitle>
              <CardDescription>
                {t('client_edit.personal_info_desc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('client.address')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('client.address')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('client.phone')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('client.phone')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="taxCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('client.tax_code')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('client.tax_code')} {...field} />
                    </FormControl>
                    <FormDescription>
                      {t('client_edit.tax_code')}
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
                    <FormLabel>{t('client.employment')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('client.employment')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="annualIncome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('onboarding.income')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="50000"
                          {...field}
                          onChange={e => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="monthlyExpenses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('client.monthly_expenses')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="2000"
                          {...field}
                          onChange={e => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="netWorth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('client.net_worth')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="250000"
                          {...field}
                          onChange={e => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="dependents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('client.dependents')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0"
                          {...field}
                          onChange={e => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('onboarding.financial_profile')}</CardTitle>
              <CardDescription>
                {t('client_edit.investment_profile_desc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="riskProfile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('client.risk_profile')}</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('client_edit.select_risk_profile')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {riskProfileOptions.map(profile => (
                          <SelectItem key={profile} value={profile}>
                            <span className="capitalize">{t(`risk_profiles.${profile}`)}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t('onboarding.risk_profile')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="investmentExperience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('client.investment_experience')}</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('client_edit.select_experience_level')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {experienceLevelOptions.map(level => (
                          <SelectItem key={level} value={level}>
                            <span className="capitalize">{t(`experience_levels.${level}`)}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t('onboarding.experience_level')}
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
                    <FormLabel>{t('client.investment_horizon')}</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('client_edit.select_investment_horizon')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {investmentHorizonOptions.map(horizon => (
                          <SelectItem key={horizon} value={horizon}>
                            <span className="capitalize">{t(`investment_horizons.${horizon}`)}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t('onboarding.investment_horizon')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2">{t('client.investment_goals')}</h3>
                <FormDescription className="mb-4">
                  Valuta il tuo interesse per i seguenti obiettivi di investimento su una scala da 1 a 5:
                  (1 = non mi interessa per niente, 5 = mi interessa molto)
                </FormDescription>
                
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="retirementInterest"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between mb-2">
                          <FormLabel>{t('investment_goals.retirement')}</FormLabel>
                          <span className="text-sm font-medium">{field.value}/5</span>
                        </div>
                        <FormControl>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            step="1"
                            className="w-full"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Non mi interessa</span>
                          <span>Mi interessa molto</span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="wealthGrowthInterest"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between mb-2">
                          <FormLabel>{t('investment_goals.wealth_growth')}</FormLabel>
                          <span className="text-sm font-medium">{field.value}/5</span>
                        </div>
                        <FormControl>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            step="1"
                            className="w-full"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Non mi interessa</span>
                          <span>Mi interessa molto</span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="incomeGenerationInterest"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between mb-2">
                          <FormLabel>{t('investment_goals.income_generation')}</FormLabel>
                          <span className="text-sm font-medium">{field.value}/5</span>
                        </div>
                        <FormControl>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            step="1"
                            className="w-full"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Non mi interessa</span>
                          <span>Mi interessa molto</span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="capitalPreservationInterest"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between mb-2">
                          <FormLabel>{t('investment_goals.capital_preservation')}</FormLabel>
                          <span className="text-sm font-medium">{field.value}/5</span>
                        </div>
                        <FormControl>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            step="1"
                            className="w-full"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Non mi interessa</span>
                          <span>Mi interessa molto</span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="estatePlanningInterest"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between mb-2">
                          <FormLabel>{t('investment_goals.estate_planning')}</FormLabel>
                          <span className="text-sm font-medium">{field.value}/5</span>
                        </div>
                        <FormControl>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            step="1"
                            className="w-full"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Non mi interessa</span>
                          <span>Mi interessa molto</span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          

          
          <Card>
            <CardHeader className="space-y-1">
              <div className="flex justify-between items-center">
                <CardTitle>{t('onboarding.assets')}</CardTitle>
                <Button 
                  type="button" 
                  onClick={addAsset} 
                  variant="outline" 
                  size="sm"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {t('onboarding.add_asset')}
                </Button>
              </div>
              <CardDescription>
                {t('client_edit.assets_desc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {form.watch('assets').map((asset, index) => (
                <div key={index}>
                  {index > 0 && <Separator className="my-6" />}
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium">{t('client_edit.asset')} {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAsset(index)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {t('onboarding.remove')}
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name={`assets.${index}.category`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('client_edit.asset_type')}</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('client_edit.select_asset_type')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categoryOptions.map(category => (
                                <SelectItem key={category} value={category}>
                                  <span className="capitalize">{t(`asset_categories.${category}`)}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name={`assets.${index}.value`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('client_edit.asset_value')}</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="100000" 
                              {...field} 
                              onChange={e => field.onChange(e.target.valueAsNumber)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name={`assets.${index}.description`}
                      render={({ field }) => (
                        <FormItem className="col-span-1 md:col-span-2">
                          <FormLabel>{t('client_edit.description')}</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder={t('pdf.description')} 
                              className="resize-none"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
              
              {form.formState.errors.assets?.root && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {form.formState.errors.assets.root.message}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Interessi Personali</CardTitle>
              <CardDescription>
                Condividi i tuoi interessi personali per aiutarci a offrirti un'esperienza di consulenza finanziaria unica e personalizzata
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="personalInterests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>I tuoi interessi</FormLabel>
                    <FormDescription>
                      Seleziona gli argomenti che ti interessano per permetterci di conoscere meglio le tue passioni
                    </FormDescription>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                      {personalInterestOptions.map(interest => (
                        <div key={interest} className="flex items-center space-x-2">
                          <Checkbox
                            checked={field.value?.includes(interest)}
                            onCheckedChange={(checked) => {
                              const updatedInterests = checked
                                ? [...(field.value || []), interest]
                                : (field.value || []).filter((value) => value !== interest);
                              field.onChange(updatedInterests);
                            }}
                            id={`interest-${interest}`}
                          />
                          <label 
                            htmlFor={`interest-${interest}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {interest.charAt(0).toUpperCase() + interest.slice(1).replace('_', ' ')}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="personalInterestsNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note aggiuntive sui tuoi interessi</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Raccontaci qualcosa in più sui tuoi interessi o altre passioni non presenti nell'elenco..." 
                        className="resize-none"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Questo campo è opzionale
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <Button 
                type="submit" 
                className="w-full"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? t('common.saving') : t('onboarding.submit')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}