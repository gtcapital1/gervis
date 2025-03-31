// This file defines the ClientEditDialog component.
// It provides a dialog for editing a client's information, including personal details, investment profile, and assets.

import { useState, useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { 
  PlusCircle, 
  Trash2, 
  ArrowRight,
  Check,
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
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  RISK_PROFILES, 
  ASSET_CATEGORIES, 
  EXPERIENCE_LEVELS,
  INVESTMENT_GOALS,
  INVESTMENT_HORIZONS,
  Client,
  CLIENT_SEGMENTS
} from "@shared/schema";

// Define the asset schema
const assetSchema = z.object({
  id: z.number().optional(),
  value: z.coerce.number().min(1, "Value must be greater than 0"),
  category: z.string().refine(val => ASSET_CATEGORIES.includes(val as any), {
    message: "Please select a valid category"
  }),
  description: z.string().optional(),
});

// Define the complete client edit form schema
const clientEditFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  taxCode: z.string().optional(),
  address: z.string().optional(),
  employmentStatus: z.string().optional(),
  annualIncome: z.number().min(0).optional(),
  monthlyExpenses: z.number().min(0).optional(),
  dependents: z.number().min(0).optional(),
  riskProfile: z.string().optional(),
  investmentExperience: z.string().optional(),
  investmentGoals: z.array(z.string()).optional(),
  investmentHorizon: z.string().optional(),
  retirementInterest: z.number().min(1).max(5).optional(),
  wealthGrowthInterest: z.number().min(1).max(5).optional(),
  incomeGenerationInterest: z.number().min(1).max(5).optional(),
  capitalPreservationInterest: z.number().min(1).max(5).optional(),
  estatePlanningInterest: z.number().min(1).max(5).optional(),
  assets: z.array(z.object({
    id: z.number().optional(),
    category: z.string(),
    value: z.number().min(0),
    description: z.string().optional()
  })).optional(),
  clientSegment: z.string().optional()
});

type ClientEditFormValues = z.infer<typeof clientEditFormSchema>;

interface ClientEditDialogProps {
  client: Client;
  assets: Array<{id: number, clientId: number, category: string, value: number, description: string, createdAt: string}>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
  onAssetsUpdated?: () => void;
}

export function ClientEditDialog({ client, assets, open, onOpenChange, clientId, onAssetsUpdated }: ClientEditDialogProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  
  // Convert enums to select options
  const riskProfileOptions = RISK_PROFILES as unknown as [string, ...string[]];
  const categoryOptions = ASSET_CATEGORIES as unknown as [string, ...string[]];
  const experienceLevelOptions = EXPERIENCE_LEVELS as unknown as [string, ...string[]];
  const investmentHorizonOptions = INVESTMENT_HORIZONS as unknown as [string, ...string[]];
  const investmentGoalOptions = INVESTMENT_GOALS as unknown as [string, ...string[]];
  const clientSegmentOptions = CLIENT_SEGMENTS as unknown as [string, ...string[]];
  
  // Setup form with default values
  const form = useForm<ClientEditFormValues>({
    resolver: zodResolver(clientEditFormSchema),
    defaultValues: {
      firstName: client.firstName || "",
      lastName: client.lastName || "",
      email: client.email,
      phone: client.phone || "",
      taxCode: client.taxCode || "",
      address: client.address || "",
      employmentStatus: client.employmentStatus || "",
      annualIncome: client.annualIncome || 0,
      monthlyExpenses: client.monthlyExpenses || 0,
      dependents: client.dependents || 0,
      riskProfile: client.riskProfile || "",
      investmentExperience: client.investmentExperience || "",
      investmentGoals: client.investmentGoals || [],
      investmentHorizon: client.investmentHorizon || "",
      retirementInterest: client.retirementInterest || 3,
      wealthGrowthInterest: client.wealthGrowthInterest || 3,
      incomeGenerationInterest: client.incomeGenerationInterest || 3,
      capitalPreservationInterest: client.capitalPreservationInterest || 3,
      estatePlanningInterest: client.estatePlanningInterest || 3,
      assets: assets.map(asset => ({
        id: asset.id,
        category: asset.category,
        value: asset.value,
        description: asset.description || ""
      })),
      clientSegment: client.clientSegment || ""
    }
  });

  // Reset form when dialog opens or assets change
  useEffect(() => {
    if (open) {
      form.reset({
        firstName: client.firstName || "",
        lastName: client.lastName || "",
        email: client.email,
        phone: client.phone || "",
        taxCode: client.taxCode || "",
        address: client.address || "",
        employmentStatus: client.employmentStatus || "",
        annualIncome: client.annualIncome || 0,
        monthlyExpenses: client.monthlyExpenses || 0,
        dependents: client.dependents || 0,
        riskProfile: client.riskProfile || "",
        investmentExperience: client.investmentExperience || "",
        investmentGoals: client.investmentGoals || [],
        investmentHorizon: client.investmentHorizon || "",
        retirementInterest: client.retirementInterest ?? 1,
        wealthGrowthInterest: client.wealthGrowthInterest ?? 1,
        incomeGenerationInterest: client.incomeGenerationInterest ?? 1,
        capitalPreservationInterest: client.capitalPreservationInterest ?? 1,
        estatePlanningInterest: client.estatePlanningInterest ?? 1,
        assets: assets.map(asset => ({
          id: asset.id,
          category: asset.category,
          value: asset.value,
          description: asset.description || ""
        })),
        clientSegment: client.clientSegment || ""
      });
    }
  }, [open, assets, client, form]);

  // Function to add a new asset
  function addAsset() {
    const currentAssets = form.getValues("assets") || [];
    form.setValue("assets", [
      ...currentAssets, 
      { category: "cash", value: 0, description: "" }
    ]);
  }

  // Function to remove an asset
  function removeAsset(index: number) {
    const currentAssets = form.getValues("assets");
    form.setValue("assets", currentAssets.filter((_, i) => i !== index));
  }

  // Function to calculate net worth based on assets and debts
  const calculateNetWorth = (assets: Array<{value: number}>, debts: number): number => {
    const totalAssets = assets.reduce((sum, asset) => sum + asset.value, 0);
    return totalAssets - debts;
  };

  // Function to determine client segment based on net worth
  const determineClientSegment = (netWorth: number): string => {
    if (netWorth < 100000) return "mass_market";
    if (netWorth < 500000) return "affluent";
    if (netWorth < 2000000) return "hnw";
    if (netWorth < 10000000) return "vhnw";
    return "uhnw";
  };

  // Watch for changes in assets and debts to update net worth and client segment
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name?.startsWith('assets.') || name === 'debts') {
        const assets = form.getValues('assets');
        const debts = form.getValues('debts') || 0;
        const netWorth = calculateNetWorth(assets, debts);
        form.setValue('netWorth', netWorth);
        form.setValue('clientSegment', determineClientSegment(netWorth));
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Update client mutation
  const updateClientMutation = useMutation({
    mutationFn: (data: ClientEditFormValues) => {
      // Calculate total assets before sending
      const totalAssets = data.assets.reduce((sum, asset) => sum + asset.value, 0);
      
      // Calculate net worth
      const netWorth = calculateNetWorth(data.assets, data.debts || 0);
      
      // Determine client segment
      const clientSegment = determineClientSegment(netWorth);
      
      // Add calculated values to the data
      const updatedData = {
        ...data,
        totalAssets,
        netWorth,
        clientSegment
      };
      
      return apiRequest(`/api/clients/${clientId}`, {
        method: 'PATCH',
        body: JSON.stringify(updatedData),
      });
    },
    onSuccess: () => {
      // Invalidate both client details and assets
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/assets`] });
      // Also invalidate the general clients list
      queryClient.invalidateQueries({ queryKey: [`/api/clients`] });
      
      // Call onAssetsUpdated callback if provided
      if (onAssetsUpdated) {
        onAssetsUpdated();
      }
      
      // Close the dialog after successful update
      onOpenChange(false);
      
      toast({
        title: t('client_edit.client_updated'),
        description: t('client_edit.update_success'),
      });
    },
    onError: () => {
      toast({
        title: t('client_edit.error'),
        description: t('client_edit.update_failure'),
        variant: "destructive",
      });
    },
  });
  
  // Submit handler
  async function onSubmit(data: ClientEditFormValues) {
    // Assicuriamo che i valori degli interessi siano convertiti correttamente 
    // da stringhe a numeri prima di inviarli e siano del tipo numerico 
    data.retirementInterest = Number(data.retirementInterest) || 1;
    data.wealthGrowthInterest = Number(data.wealthGrowthInterest) || 1;
    data.incomeGenerationInterest = Number(data.incomeGenerationInterest) || 1;
    data.capitalPreservationInterest = Number(data.capitalPreservationInterest) || 1;
    data.estatePlanningInterest = Number(data.estatePlanningInterest) || 1;
    
    // Log dei valori per debug
    console.log("DEBUG - Valori interessi inviati:", {
      retirement: data.retirementInterest,
      wealthGrowth: data.wealthGrowthInterest,
      incomeGeneration: data.incomeGenerationInterest,
      capitalPreservation: data.capitalPreservationInterest,
      estatePlanning: data.estatePlanningInterest
    });
    
    updateClientMutation.mutate(data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{t('client_edit.title')}</DialogTitle>
          <DialogDescription>
            {t('client_edit.subtitle')}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Container flex per il layout 2/5 - 3/5 */}
            <div className="flex flex-col md:flex-row gap-6">
              {/* Personal Information (2/5) - Allargata come richiesto */}
              <Card className="w-full md:w-[45%]">
                <CardHeader>
                <CardTitle className="flex items-center text-xl font-semibold">
                  <HomeIcon className="mr-2 h-5 w-5 text-primary" />
                  {t('client_edit.personal_info')}
                </CardTitle>
                <CardDescription>
                  {t('client_edit.personal_info_desc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('client_edit.first_name')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('client_edit.last_name')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('client_edit.email')}</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" />
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
                      <FormLabel>{t('client_edit.phone')}</FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('client_edit.address')}</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} />
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
                      <FormLabel>{t('client_edit.tax_code')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="employmentStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('client_edit.employment_status')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                        <FormLabel>{t('client_edit.dependents')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            min={0} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="annualIncome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('client_edit.annual_income')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            min={0} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                        <FormLabel>{t('client_edit.monthly_expenses')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            min={0}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                        <FormLabel>{t('client_edit.net_worth')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            min={0}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Investment Profile (3/5) - Adattato rispetto alla colonna sinistra */}
            <Card className="w-full md:w-[55%]">
              <CardHeader>
                <CardTitle className="flex items-center text-xl font-semibold">
                  <ArrowRight className="mr-2 h-5 w-5 text-primary" />
                  {t('client_edit.investment_profile')}
                </CardTitle>
                <CardDescription>
                  {t('client_edit.investment_profile_desc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="riskProfile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('client_edit.risk_profile')}</FormLabel>
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
                            {riskProfileOptions.map((profile) => (
                              <SelectItem key={profile} value={profile}>
                                {profile.charAt(0).toUpperCase() + profile.slice(1)}
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
                    name="investmentExperience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('client_edit.investment_experience')}</FormLabel>
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
                            {experienceLevelOptions.map((level) => (
                              <SelectItem key={level} value={level}>
                                {level.charAt(0).toUpperCase() + level.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="investmentHorizon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('client_edit.investment_horizon')}</FormLabel>
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
                          {investmentHorizonOptions.map((horizon) => (
                            <SelectItem key={horizon} value={horizon}>
                              {horizon.split('_').join(' ').replace(/\b\w/g, c => c.toUpperCase())}
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
                  name="investmentGoals"
                  render={({ field }) => (
                    <FormItem>
                      <div className="mb-2">
                        <FormLabel>{t('client_edit.investment_goals')}</FormLabel>
                      </div>
                      <Select 
                        onValueChange={(value) => field.onChange([value])}
                        defaultValue={field.value?.[0]}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('client_edit.select_primary_goal')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {investmentGoalOptions.map((goal) => (
                            <SelectItem key={goal} value={goal}>
                              {goal.split('_').join(' ').replace(/\b\w/g, c => c.toUpperCase())}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Investment Interests Sliders */}
                <div className="border rounded-md p-4 mt-6">
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">Priorities</h3>
                  <FormDescription className="mb-4">
                    Valuta l'interesse del cliente per i seguenti obiettivi di investimento su una scala da 1 a 5:
                    (1 = non interessa per niente, 5 = interessa molto)
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
                              className="w-full accent-black"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Non interessa</span>
                            <span>Interessa molto</span>
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
                              className="w-full accent-black"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Non interessa</span>
                            <span>Interessa molto</span>
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
                              className="w-full accent-black"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Non interessa</span>
                            <span>Interessa molto</span>
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
                              className="w-full accent-black"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Non interessa</span>
                            <span>Interessa molto</span>
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
                              className="w-full accent-black"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Non interessa</span>
                            <span>Interessa molto</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            </div> {/* Fine del contenitore flex 2/5 - 3/5 */}
            
            {/* Assets */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-xl font-semibold">
                  <ArrowRight className="mr-2 h-5 w-5 text-primary" />
                  {t('client_edit.assets')}
                </CardTitle>
                <CardDescription>
                  {t('client_edit.assets_desc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {form.watch("assets")?.map((_, index) => (
                  <div key={index} className="p-4 border rounded-md bg-muted/30">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-medium">{t('client_edit.asset')} {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAsset(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                {categoryOptions.map((category) => (
                                  <SelectItem key={category} value={category}>
                                    {category.split('_').join(' ').replace(/\b\w/g, c => c.toUpperCase())}
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
                                {...field} 
                                type="number" 
                                min={0}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="mt-4">
                      <FormField
                        control={form.control}
                        name={`assets.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('client_edit.asset_description')}</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={2} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={addAsset}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {t('client_edit.add_asset')}
                </Button>
              </CardContent>
            </Card>
            
            {/* Client Segment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-xl font-semibold">
                  <ArrowRight className="mr-2 h-5 w-5 text-primary" />
                  {t('client_edit.client_segment')}
                </CardTitle>
                <CardDescription>
                  {t('client_edit.client_segment_desc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <FormField
                  control={form.control}
                  name="clientSegment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('client_edit.client_segment')}</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('client_edit.select_client_segment')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">
                            {t('client_edit.not_specified')}
                          </SelectItem>
                          {CLIENT_SEGMENTS.map(segment => (
                            <SelectItem key={segment} value={segment}>
                              {segment === 'mass_market' ? '🧊 Mass Market (< €100.000)' : 
                               segment === 'affluent' ? '🔵 Affluent (€100.000 - €500.000)' : 
                               segment === 'hnw' ? '🟣 HNW (€500.000 - €2.000.000)' : 
                               segment === 'vhnw' ? '🟡 VHNW (€2.000.000 - €10.000.000)' : 
                               segment === 'uhnw' ? '🔴 UHNW (> €10.000.000)' : 
                               segment}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={updateClientMutation.isPending} 
                className="ml-2 gap-2"
              >
                {updateClientMutation.isPending ? (
                  <>{t('common.saving')}</>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    {t('common.save_changes')}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}