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
  Client
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
  // Basic Information
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  
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
  investmentGoals: z.array(z.string()).refine(
    val => val.length > 0 && val.every(goal => INVESTMENT_GOALS.includes(goal as any)), {
    message: "Please select at least one valid investment goal"
  }),
  investmentHorizon: z.string().refine(val => INVESTMENT_HORIZONS.includes(val as any), {
    message: "Please select a valid investment horizon"
  }),

  // Assets
  assets: z.array(assetSchema).min(1, "Please add at least one asset")
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
  
  // Setup form with default values
  const form = useForm<ClientEditFormValues>({
    resolver: zodResolver(clientEditFormSchema),
    defaultValues: {
      firstName: client.firstName || "",
      lastName: client.lastName || "",
      email: client.email,
      address: client.address || "",
      phone: client.phone || "",
      taxCode: client.taxCode || "",
      employmentStatus: client.employmentStatus || "",
      annualIncome: client.annualIncome || 0,
      monthlyExpenses: client.monthlyExpenses || 0,
      netWorth: client.netWorth || 0,
      dependents: client.dependents || 0,
      riskProfile: client.riskProfile || "",
      investmentExperience: client.investmentExperience || "",
      investmentGoals: client.investmentGoals || [],
      investmentHorizon: client.investmentHorizon || "",
      assets: assets.map(asset => ({
        id: asset.id,
        category: asset.category,
        value: asset.value,
        description: asset.description || ""
      }))
    }
  });

  // Reset form when dialog opens or assets change
  useEffect(() => {
    if (open) {
      form.reset({
        firstName: client.firstName || "",
        lastName: client.lastName || "",
        email: client.email,
        address: client.address || "",
        phone: client.phone || "",
        taxCode: client.taxCode || "",
        employmentStatus: client.employmentStatus || "",
        annualIncome: client.annualIncome || 0,
        monthlyExpenses: client.monthlyExpenses || 0,
        netWorth: client.netWorth || 0,
        dependents: client.dependents || 0,
        riskProfile: client.riskProfile || "",
        investmentExperience: client.investmentExperience || "",
        investmentGoals: client.investmentGoals || [],
        investmentHorizon: client.investmentHorizon || "",
        assets: assets.map(asset => ({
          id: asset.id,
          category: asset.category,
          value: asset.value,
          description: asset.description || ""
        }))
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

  // Update client mutation
  const updateClientMutation = useMutation({
    mutationFn: (data: ClientEditFormValues) => {
      return apiRequest(`/api/clients/${clientId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
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
            {/* Personal Information */}
            <Card>
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
                      <FormLabel>Address</FormLabel>
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
                      <FormLabel>Tax Code / Identification Number</FormLabel>
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
                        <FormLabel>Employment Status</FormLabel>
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
                        <FormLabel>Number of Dependents</FormLabel>
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
                        <FormLabel>Annual Income ($)</FormLabel>
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
                        <FormLabel>Monthly Expenses ($)</FormLabel>
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
                        <FormLabel>Net Worth ($)</FormLabel>
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
            
            {/* Investment Profile */}
            <Card>
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
                        <FormLabel>Risk Profile</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select risk profile" />
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
                        <FormLabel>Investment Experience</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select experience level" />
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
                      <FormLabel>Investment Time Horizon</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select investment horizon" />
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
                  render={() => (
                    <FormItem>
                      <div className="mb-2">
                        <FormLabel>Investment Goals (Select all that apply)</FormLabel>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {investmentGoalOptions.map((goal) => (
                          <FormField
                            key={goal}
                            control={form.control}
                            name="investmentGoals"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={goal}
                                  className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(goal)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, goal])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== goal
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer">
                                    {goal.split('_').join(' ').replace(/\b\w/g, c => c.toUpperCase())}
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            
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
                      <h4 className="text-sm font-medium">Asset {index + 1}</h4>
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
                            <FormLabel>Asset Type</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select asset type" />
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
                            <FormLabel>Asset Value ($)</FormLabel>
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
                            <FormLabel>Description (Optional)</FormLabel>
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
                  Add Another Asset
                </Button>
              </CardContent>
            </Card>
            
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateClientMutation.isPending} 
                className="ml-2 gap-2"
              >
                {updateClientMutation.isPending ? (
                  <>Saving Changes...</>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Save Changes
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