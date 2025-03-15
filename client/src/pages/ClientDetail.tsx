import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
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
} from "lucide-react";
import { ClientEditDialog } from "@/components/advisor/ClientEditDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Client, RISK_PROFILES } from "@shared/schema";
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

export default function ClientDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const clientId = parseInt(id || "0");
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Fetch client details
  const { 
    data: client, 
    isLoading, 
    isError 
  } = useQuery<Client>({
    queryKey: [`/api/clients/${clientId}`],
    enabled: !isNaN(clientId)
  });
  
  // Fetch client assets with type definition
  const [forceRefresh, setForceRefresh] = useState(0); // Add a force refresh counter
  
  // Define the asset type to fix TypeScript errors
  type AssetType = {
    id: number, 
    clientId: number, 
    category: string, 
    value: number, 
    description: string, 
    createdAt: string
  };
  
  const { 
    data: assets = [] as AssetType[], 
    isLoading: isLoadingAssets,
    refetch: refetchAssets
  } = useQuery<AssetType[]>({
    queryKey: [`/api/clients/${clientId}/assets`, forceRefresh], // Add forceRefresh to the query key
    enabled: !isNaN(clientId) && !!client?.isOnboarded,
    // Force refetch on each query
    staleTime: 0,
    gcTime: 0 // Use gcTime instead of cacheTime in TanStack Query v5
  });

  // For sending onboarding form
  // State for the onboarding link
  const [onboardingLink, setOnboardingLink] = useState<string | null>(null);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailLanguage, setEmailLanguage] = useState<"english" | "italian">("english");
  const [emailMessage, setEmailMessage] = useState<string>("");
  
  // Initialize default email messages
  const defaultEmailMessages = {
    english: `Dear ${client?.name},

I hope this message finds you well! I'm reaching out personally to invite you to complete your financial profile through our simple onboarding process.

By sharing some information about your financial situation and goals, I'll be able to provide you with truly personalized financial guidance tailored specifically to your needs.

The process is quick and straightforward - it should only take about 5 minutes of your time. Simply click the link below to get started.

I'm looking forward to working together on your financial journey!

Thank you for your trust and partnership.

Warm regards,`,
    
    italian: `Gentile ${client?.name},

Spero che tu stia bene! Ti scrivo personalmente per invitarti a completare il tuo profilo finanziario attraverso la nostra semplice procedura di onboarding.

Condividendo alcune informazioni sulla tua situazione finanziaria e i tuoi obiettivi, sarò in grado di offrirti una consulenza finanziaria veramente personalizzata e su misura per le tue esigenze.

La procedura è rapida e semplice - richiederà solo circa 5 minuti del tuo tempo. Basta cliccare sul link qui sotto per iniziare.

Non vedo l'ora di lavorare insieme nel tuo percorso finanziario!

Grazie per la tua fiducia e collaborazione.

Cordiali saluti,`
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
  
  const sendOnboardingMutation = useMutation({
    mutationFn: (params: { language: 'english' | 'italian', customMessage: string }) => {
      return apiRequest(`/api/clients/${clientId}/onboarding-token`, {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },
    onSuccess: (data: { token: string, link: string, language: 'english' | 'italian' }) => {
      setOnboardingLink(data.link);
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}`] });
      toast({
        title: "Onboarding link generated",
        description: `Successfully generated an onboarding link in ${data.language === 'english' ? 'English' : 'Italian'}.`,
      });
      // Close the email dialog
      setIsEmailDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate onboarding link. Please try again.",
        variant: "destructive",
      });
    },
  });

  function handleSendOnboardingForm() {
    // If the dialog is not open, open it
    if (!onboardingLink) {
      // Set default message based on the selected language
      setEmailMessage(defaultEmailMessages[emailLanguage]);
      setIsEmailDialogOpen(true);
    } else {
      // If the link already exists, reset it
      setOnboardingLink(null);
    }
  }
  
  // Update email message when language changes
  function handleLanguageChange(value: string) {
    const language = value as 'english' | 'italian';
    setEmailLanguage(language);
    setEmailMessage(defaultEmailMessages[language]);
  }
  
  function handleSendEmail() {
    sendOnboardingMutation.mutate({
      language: emailLanguage,
      customMessage: emailMessage
    });
  }
  
  function formatDate(date: Date | string | null) {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  }
  
  // Calculate total asset value for percentage calculations
  const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <p>Loading client details...</p>
      </div>
    );
  }
  
  if (isError || !client) {
    return (
      <div className="flex flex-col justify-center items-center h-full space-y-4">
        <p className="text-destructive">Error loading client details.</p>
        <Button variant="outline" onClick={() => setLocation("/app")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }
  
  return (
    <>
      <div className="flex flex-col h-full">
        <div className="flex items-center p-6 border-b text-black">
          <Button variant="ghost" onClick={() => setLocation("/app")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="ml-4 text-3xl font-bold tracking-tight text-black">{client.name}</h1>
          <div className="ml-4 flex gap-2">
            {client.isArchived && (
              <Badge className="bg-amber-600">Archived</Badge>
            )}
            {client.isOnboarded ? (
              <Badge className="bg-green-600">Onboarded</Badge>
            ) : (
              <Badge variant="outline">Not Onboarded</Badge>
            )}
          </div>
        </div>
        
        <Separator />
        
        <div className="p-6 flex-1 overflow-auto">
          {!client.isOnboarded ? (
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl">Client Onboarding Required</CardTitle>
                <CardDescription>
                  This client needs to complete the onboarding process to access all features.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {onboardingLink ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-muted rounded-md overflow-x-auto">
                      <p className="text-sm font-mono break-all">{onboardingLink}</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          navigator.clipboard.writeText(onboardingLink);
                          toast({
                            title: "Link copied",
                            description: "Onboarding link copied to clipboard."
                          });
                        }}
                      >
                        Copy Link
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setOnboardingLink(null)}
                      >
                        Generate New Link
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Share this link with your client to complete the onboarding process.
                    </p>
                  </div>
                ) : (
                  <Button 
                    onClick={handleSendOnboardingForm}
                    disabled={sendOnboardingMutation.isPending}
                    className="bg-accent hover:bg-accent/90"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {sendOnboardingMutation.isPending ? "Sending..." : "Generate Onboarding Email"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : null}
          
          {/* Edit Button at the top for all sections */}
          <div className="flex justify-end mb-6">
            <Button 
              onClick={() => setIsEditDialogOpen(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Client Information
            </Button>
          </div>

          <div className="space-y-6">
            {/* Top row: Personal Information and Investment Profile side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Box: Personal Information */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">Personal Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2 opacity-70" />
                      <span className="text-sm text-muted-foreground mr-2">Name:</span>
                      <span>{client.name}</span>
                    </div>
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 opacity-70" />
                      <span className="text-sm text-muted-foreground mr-2">Email:</span>
                      <span>{client.email}</span>
                    </div>
                    {client.phone && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 opacity-70" />
                        <span className="text-sm text-muted-foreground mr-2">Phone:</span>
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-center">
                        <Home className="h-4 w-4 mr-2 opacity-70" />
                        <span className="text-sm text-muted-foreground mr-2">Address:</span>
                        <span>{client.address}</span>
                      </div>
                    )}
                    {client.taxCode && (
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2 opacity-70" />
                        <span className="text-sm text-muted-foreground mr-2">Tax Code:</span>
                        <span>{client.taxCode}</span>
                      </div>
                    )}
                    {client.employmentStatus && (
                      <div className="flex items-center">
                        <Briefcase className="h-4 w-4 mr-2 opacity-70" />
                        <span className="text-sm text-muted-foreground mr-2">Employment:</span>
                        <span>{client.employmentStatus}</span>
                      </div>
                    )}
                    {client.dependents !== undefined && (
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2 opacity-70" />
                        <span className="text-sm text-muted-foreground mr-2">Dependents:</span>
                        <span>{client.dependents}</span>
                      </div>
                    )}
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 opacity-70" />
                      <span className="text-sm text-muted-foreground mr-2">Created:</span>
                      <span>{formatDate(client.createdAt)}</span>
                    </div>
                  </div>
                  
                  {/* Financial Information */}
                  {(client.annualIncome !== undefined || 
                    client.monthlyExpenses !== undefined || 
                    client.netWorth !== undefined) && (
                    <>
                      <Separator className="my-3" />
                      <div className="grid grid-cols-1 gap-3 mt-3">
                        {client.annualIncome ? (
                          <div>
                            <span className="text-sm text-muted-foreground block">Annual Income:</span>
                            <span className="text-lg font-medium">${client.annualIncome.toLocaleString()}</span>
                          </div>
                        ) : null}
                        {client.monthlyExpenses ? (
                          <div>
                            <span className="text-sm text-muted-foreground block">Monthly Expenses:</span>
                            <span className="text-lg font-medium">${client.monthlyExpenses.toLocaleString()}</span>
                          </div>
                        ) : null}
                        {client.netWorth ? (
                          <div>
                            <span className="text-sm text-muted-foreground block">Net Worth:</span>
                            <span className="text-lg font-medium">${client.netWorth.toLocaleString()}</span>
                          </div>
                        ) : null}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
              
              {/* Second Box: Investment Profile */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">Investment Profile</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground block mb-2">Risk Profile:</span>
                      {client.riskProfile ? (
                        <Badge className="capitalize">
                          {client.riskProfile.replace('_', ' ')}
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          Not Assessed
                        </Badge>
                      )}
                    </div>
                    
                    <div>
                      <span className="text-sm text-muted-foreground block mb-2">Investment Experience:</span>
                      {client.investmentExperience ? (
                        <Badge className="capitalize">
                          {client.investmentExperience.replace('_', ' ')}
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          Not Specified
                        </Badge>
                      )}
                    </div>
                    
                    <div>
                      <span className="text-sm text-muted-foreground block mb-2">Investment Horizon:</span>
                      {client.investmentHorizon ? (
                        <Badge className="capitalize">
                          {client.investmentHorizon.replace('_', ' ')}
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          Not Specified
                        </Badge>
                      )}
                    </div>
                    
                    <div>
                      <span className="text-sm text-muted-foreground block mb-2">Investment Goals:</span>
                      {client.investmentGoals && client.investmentGoals.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {client.investmentGoals.map(goal => (
                            <Badge key={goal} className="capitalize">
                              {goal.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <Badge variant="outline">
                          Not Specified
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Bottom row: Asset Allocation full width */}
            {client.isOnboarded ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">Asset Allocation</CardTitle>
                  <CardDescription>
                    Snapshot of client's current portfolio
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="portfolio">
                    <TabsList className="mb-4">
                      <TabsTrigger value="portfolio">
                        <PieChart className="mr-2 h-4 w-4" />
                        Portfolio Overview
                      </TabsTrigger>
                      <TabsTrigger value="recommendations">
                        <FileText className="mr-2 h-4 w-4" />
                        Recommendations
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="portfolio" className="space-y-6">
                      {isLoadingAssets ? (
                        <div className="flex justify-center items-center h-32">
                          <p>Loading assets...</p>
                        </div>
                      ) : assets.length === 0 ? (
                        <div className="flex flex-col justify-center items-center h-32 space-y-4">
                          <p className="text-muted-foreground">No assets found for this client.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Asset Categories with Progress Bars */}
                          <div className="space-y-4 mb-6">
                            <h3 className="text-lg font-medium">Asset Distribution</h3>
                            <div className="space-y-4">
                              {/* Group assets by category and calculate percentages */}
                              {(() => {
                                // Group assets by category
                                const assetsByCategory: Record<string, number> = {};
                                assets.forEach(asset => {
                                  if (assetsByCategory[asset.category]) {
                                    assetsByCategory[asset.category] += asset.value;
                                  } else {
                                    assetsByCategory[asset.category] = asset.value;
                                  }
                                });
                                
                                return Object.entries(assetsByCategory).map(([category, value]) => {
                                  const percentage = (value / totalValue) * 100;
                                  
                                  return (
                                    <div key={category} className="space-y-2">
                                      <div className="flex justify-between text-sm">
                                        <span className="font-medium capitalize">{category.replace('_', ' ')}</span>
                                        <span>${value.toLocaleString()} ({percentage.toFixed(1)}%)</span>
                                      </div>
                                      <div className="w-full bg-secondary rounded-full h-2">
                                        <div 
                                          className="bg-primary h-2 rounded-full" 
                                          style={{ width: `${percentage}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                          
                          {/* Individual Assets */}
                          <div>
                            <h3 className="text-lg font-medium mb-3">Individual Assets</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {assets.map((asset) => (
                                <Card key={asset.id} className="overflow-hidden">
                                  <CardHeader className="p-3 bg-muted">
                                    <CardTitle className="text-sm font-medium capitalize">
                                      {asset.category.replace('_', ' ')}
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="p-3">
                                    <div className="space-y-1">
                                      <div className="text-xl font-bold">
                                        ${asset.value.toLocaleString()}
                                      </div>
                                      {asset.description && (
                                        <div className="text-xs text-muted-foreground">
                                          {asset.description}
                                        </div>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="recommendations" className="space-y-4">
                      <p>Recommendations and financial advice will appear here.</p>
                      <Button variant="outline" size="sm">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Recommendation
                      </Button>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : null}
          </div>
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
            setForceRefresh(prev => prev + 1);
            // Also directly refetch assets
            refetchAssets();
          }}
        />
      )}
      
      {/* Email language dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Customize Onboarding Email</DialogTitle>
            <DialogDescription>
              Customize the email that will be sent to {client?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div>
              <Label htmlFor="email-language">Email Language</Label>
              <RadioGroup 
                id="email-language"
                value={emailLanguage} 
                onValueChange={handleLanguageChange}
                className="mt-2 space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="english" id="english" />
                  <Label htmlFor="english">English</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="italian" id="italian" />
                  <Label htmlFor="italian">Italian (Italiano)</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email-content">Email Content</Label>
              <Textarea 
                id="email-content"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
                placeholder="Enter your personalized message here..."
              />
              <p className="text-xs text-muted-foreground">
                Customize the message to include personalized details. The onboarding link will be automatically included in the email.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEmailDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={sendOnboardingMutation.isPending}
              onClick={handleSendEmail}
            >
              {sendOnboardingMutation.isPending ? "Sending..." : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}