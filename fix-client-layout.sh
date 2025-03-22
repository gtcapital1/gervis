#!/bin/bash
# Script per migliorare il layout della pagina client con separazione di asset allocation
# e raggruppamento di AI e raccomandazioni nello stesso container

echo "Iniziando modifiche al layout della pagina cliente..."

# Aggiorna ClientDetail.tsx per riorganizzare i contenuti
cat > /var/www/gervis/client/src/pages/ClientDetail.tsx.new << 'EOL'
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
  Sparkles,
  Brain
} from "lucide-react";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { ClientEditDialog } from "@/components/advisor/ClientEditDialog";
import { ClientSettings } from "@/components/settings/ClientSettings";
import { ClientPdfGenerator } from "@/components/advisor/ClientPdfGenerator";
import { AiClientProfile } from "@/components/advisor/AiClientProfile";
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

export default function ClientDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const clientId = parseInt(id || "0");
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [emailLanguage, setEmailLanguage] = useState<'english' | 'italian'>('italian');
  const [emailMessage, setEmailMessage] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [onboardingUrl, setOnboardingUrl] = useState("");
  const [forceRefresh, setForceRefresh] = useState(0);
  
  // Richiedi i dati del cliente
  const { 
    data: clientData, 
    isLoading: isLoadingClient, 
    isError: isErrorClient,
    refetch: refetchClient
  } = useQuery<{success: boolean; client: Client; assets: any[]; recommendations: any[]}>({
    queryKey: ['/api/clients', clientId, forceRefresh],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${clientId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch client data");
      }
      return response.json();
    },
  });
  
  // Estrai i dati del cliente e gli asset
  const client = clientData?.client || {};
  const assets = clientData?.assets || [];
  const recommendations = clientData?.recommendations || [];
  
  // Calcola il valore totale degli asset
  const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);
  
  // Query per caricare gli asset del cliente (aggiunto alla lista in modo da poter ricaricare indipendentemente)
  const { isLoading: isLoadingAssets, refetch: refetchAssets } = useQuery({
    queryKey: ['/api/clients/assets', clientId, forceRefresh],
    queryFn: async () => {
      return Promise.resolve(); // Dummy, usiamo solo per controllo stato e refetch
    },
    enabled: false, // Non eseguire automaticamente
  });
  
  // Mutation per modificare il cliente  
  const updateClientMutation = useMutation({
    mutationFn: (data: ClientFormValues) => {
      return apiRequest(`/api/clients/${clientId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('client.update_success'),
      });
      refetchClient();
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: (error as Error).message || t('client.update_error'),
        variant: "destructive",
      });
    },
  });
  
  // Mutation per generare un link di onboarding
  const sendOnboardingMutation = useMutation({
    mutationFn: (params: OnboardingParams) => {
      return apiRequest(`/api/clients/${clientId}/onboarding`, {
        method: "POST",
        body: JSON.stringify(params),
      });
    },
    onSuccess: (data) => {
      setOnboardingUrl(data.onboardingUrl);
      setIsLoading(false);
      
      if (data.emailSent) {
        toast({
          title: t('client.email_sent'),
          description: t('client.email_sent_desc'),
        });
      } else {
        toast({
          title: t('client.link_generated'),
          description: t('client.copy_link_desc'),
        });
      }
      
      setIsEmailDialogOpen(false);
    },
    onError: (error) => {
      setIsLoading(false);
      toast({
        title: t('common.error'),
        description: (error as Error).message || t('client.onboarding_error'),
        variant: "destructive",
      });
    }
  });

  function onSubmit(data: ClientFormValues) {
    updateClientMutation.mutate(data);
  }
  
  function handleGenerateOnboardingLink() {
    setEmailLanguage('italian');
    setEmailMessage("");
    handleOpenEmailDialog();
  }
  
  function handleOpenEmailDialog() {
    setIsEmailDialogOpen(true);
  }
  
  function handleGenerateNewLink() {
    // Reset URL if showing a new one
    setOnboardingUrl("");
  }
  
  function handleSendEmail() {
    setIsLoading(true);
    sendOnboardingMutation.mutate({
      language: emailLanguage,
      customMessage: emailMessage,
      customSubject: emailSubject,
      sendEmail: true
    });
  }
  
  function handleGenerateURL() {
    setIsLoading(true);
    sendOnboardingMutation.mutate({
      language: emailLanguage,
      customMessage: emailMessage,
      sendEmail: false
    });
  }
  
  function copyToClipboard() {
    navigator.clipboard.writeText(onboardingUrl).then(() => {
      toast({
        title: t('client.copied_to_clipboard'),
        description: t('client.link_copied_desc'),
      });
    });
  }
  
  function goBack() {
    setLocation("/dashboard");
  }
  
  function formatDate(date: Date | string | null) {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  }
  
  // Mostra un loader mentre i dati sono in caricamento
  if (isLoadingClient) {
    return (
      <div className="container py-10">
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <div className="text-center">
            <h2 className="text-xl font-medium mb-2">{t('client.loading')}</h2>
            <p className="text-muted-foreground">{t('client.please_wait')}</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Mostra un messaggio di errore se c'è stato un problema nel recupero dei dati
  if (isErrorClient || !client) {
    return (
      <div className="container py-10">
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mb-4 mx-auto" />
            <h2 className="text-xl font-medium mb-2">{t('client.error_loading')}</h2>
            <p className="text-muted-foreground mb-6">{t('client.error_loading_desc')}</p>
            <Button onClick={goBack} size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common.go_back')}
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mr-2"
            onClick={goBack}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span>{t('common.back')}</span>
          </Button>
          <h1 className="text-2xl font-bold">{client.name}</h1>
          {client.isOnboarded && (
            <Badge variant="outline" className="ml-3 bg-green-50 text-green-700 hover:bg-green-50 border-green-200">
              <Check className="mr-1 h-3 w-3" /> {t('client.onboarded')}
            </Badge>
          )}
          {client.isArchived && (
            <Badge variant="outline" className="ml-3 bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200">
              <AlertTriangle className="mr-1 h-3 w-3" /> {t('client.archived')}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Mostra il PDF generator se ci sono asset, indipendentemente dallo stato di onboarding */}
          {assets.length > 0 && (
            <ClientPdfGenerator 
              client={{
                ...client,
                birthDate: null, // Aggiungiamo la proprietà birthDate mancante
                isOnboarded: Boolean(client.isOnboarded), // Convertiamo in booleano
                // Garantiamo che i campi non siano null se non previsto nell'interfaccia
                riskProfile: client.riskProfile || null,
                investmentGoals: client.investmentGoals || [],
                investmentHorizon: client.investmentHorizon || null,
                investmentExperience: client.investmentExperience || null
              }}
              assets={assets}
              advisorSignature={user?.signature || null}
              companyLogo={user?.companyLogo || null}
              companyInfo={user?.companyInfo || null}
            />
          )}
          <Button 
            className="bg-accent hover:bg-accent/90 flex items-center"
            onClick={() => setIsEditDialogOpen(true)}
          >
            <Edit className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t('client.edit_client')}</span>
            <span className="sm:hidden">Modifica</span>
          </Button>
          {!client.isOnboarded && (
            <Button 
              className="bg-black text-white hover:bg-black/90 flex items-center"
              onClick={handleGenerateOnboardingLink}
            >
              <Send className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t('client.send_onboarding')}</span>
              <span className="sm:hidden">Onboarding</span>
            </Button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        {/* Prima riga: informazioni client + grafico priorità investimento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Colonna info cliente */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">{t('client.information')}</CardTitle>
              <CardDescription>{t('client.basic_information')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{t('client.email')}</span>
                      </div>
                      <div>{client.email}</div>
                    </div>
                    
                    <div>
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{t('client.phone')}</span>
                      </div>
                      <div>{client.phone || "-"}</div>
                    </div>
                    
                    <div>
                      <div className="flex items-center">
                        <Home className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{t('client.address')}</span>
                      </div>
                      <div>{client.address || "-"}</div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center">
                        <KeyRound className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{t('client.tax_code')}</span>
                      </div>
                      <div>{client.taxCode || "-"}</div>
                    </div>
                    
                    <div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{t('client.created_at')}</span>
                      </div>
                      <div>{formatDate(client.createdAt)}</div>
                    </div>
                    
                    <div>
                      <div className="flex items-center">
                        <Briefcase className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{t('client.risk_profile')}</span>
                      </div>
                      <div className="capitalize">
                        {client.riskProfile 
                          ? t(`risk_profiles.${client.riskProfile}`)
                          : "-"
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Colonna con grafico priorità */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">{t('client.investment_goals')}</CardTitle>
              <CardDescription>{t('client.investment_priorities')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                {client.isOnboarded && (
                  <div className="h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart outerRadius={90} width={730} height={250} data={[
                        {
                          goal: t('investment_goals.retirement'),
                          value: client.retirementInterest || 3,
                          fullMark: 5
                        },
                        {
                          goal: t('investment_goals.wealth_growth'),
                          value: client.wealthGrowthInterest || 3,
                          fullMark: 5
                        },
                        {
                          goal: t('investment_goals.income_generation'),
                          value: client.incomeGenerationInterest || 3,
                          fullMark: 5
                        },
                        {
                          goal: t('investment_goals.capital_preservation'),
                          value: client.capitalPreservationInterest || 3,
                          fullMark: 5
                        },
                        {
                          goal: t('investment_goals.estate_planning'),
                          value: client.estatePlanningInterest || 3,
                          fullMark: 5
                        }
                      ]}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="goal" />
                        <PolarRadiusAxis angle={90} domain={[0, 5]} tick={false} />
                        <Radar 
                          name={t('client.investment_priorities')} 
                          dataKey="value" 
                          stroke="#3b82f6" 
                          fill="#3b82f6" 
                          fillOpacity={0.6} 
                        />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                
                {/* Sezione Interessi Personali */}
                {client.personalInterests && client.personalInterests.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground block mb-2">{t('client.personal_interests')}:</span>
                    <div className="flex flex-wrap gap-2">
                      {client.personalInterests.map(interest => (
                        <Badge 
                          key={interest} 
                          className="capitalize"
                          style={{
                            backgroundColor: "#dbeafe", // Light blue
                            color: "#1e3a8a" // Dark blue text
                          }}
                        >
                          {t(`personal_interests.${interest}`)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                

                
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Seconda riga: Asset Allocation in un container separato */}
        {assets.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">{t('client.asset_allocation')}</CardTitle>
              <CardDescription>{t('client.portfolio_snapshot')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left side: Asset list */}
                <div>
                  <h3 className="text-lg font-medium mb-3">{t('client.asset_details')}</h3>
                  <div className="space-y-2">
                    {assets.map((asset) => (
                      <div key={asset.id} className="flex items-center justify-between p-2 border rounded bg-black text-white">
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full mr-2" 
                            style={{
                              backgroundColor: 
                                asset.category === "equity" ? "#2563eb" : // Medium dark blue
                                asset.category === "real_estate" ? "#3b82f6" : // Medium blue
                                asset.category === "bonds" ? "#60a5fa" : // Medium light blue
                                asset.category === "cash" ? "#93c5fd" : // Light blue
                                asset.category === "private_equity" ? "#1e40af" : // Dark blue
                                asset.category === "venture_capital" ? "#2563eb" : // Medium dark blue
                                asset.category === "cryptocurrencies" ? "#3b82f6" : // Medium blue
                                "#bfdbfe" // Very light blue
                            }}
                          />
                          <span className="font-medium capitalize">{t(`asset_categories.${asset.category}`)}</span>
                        </div>
                        <div className="font-semibold">€{asset.value.toLocaleString()}</div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between p-2 border-t pt-3 mt-3">
                      <div className="font-semibold">{t('client.total')}</div>
                      <div className="font-bold">€{totalValue.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
                
                {/* Right side: Pie chart */}
                <div>
                  <h3 className="text-lg font-medium mb-3">{t('client.asset_split')}</h3>
                  <div className="h-[200px] sm:h-[180px] flex items-center justify-center">
                    {(() => {
                      const COLORS = {
                        equity: "#2563eb", // Medium dark blue
                        real_estate: "#3b82f6", // Medium blue
                        bonds: "#60a5fa", // Medium light blue
                        cash: "#93c5fd", // Light blue
                        private_equity: "#1e40af", // Dark blue
                        venture_capital: "#2563eb", // Medium dark blue
                        cryptocurrencies: "#3b82f6", // Medium blue
                        other: "#bfdbfe" // Very light blue
                      };
                      
                      // Group assets by category
                      const assetsByCategory: Record<string, number> = {};
                      assets.forEach(asset => {
                        if (assetsByCategory[asset.category]) {
                          assetsByCategory[asset.category] += asset.value;
                        } else {
                          assetsByCategory[asset.category] = asset.value;
                        }
                      });
                      
                      // Convert to data format needed for pie chart
                      const data = Object.entries(assetsByCategory).map(([category, value]) => ({
                        name: t(`asset_categories.${category}`), // Utilizziamo le chiavi tradotte
                        value,
                        category
                      }));
                      
                      return (
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={data}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={65}
                              fill="#8884d8"
                              dataKey="value"
                              nameKey="name"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {data.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={COLORS[entry.category as keyof typeof COLORS] || COLORS.other}
                                />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value: number) => [`€${value.toLocaleString()}`, 'Value']}
                            />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Terza riga: Container AI + Raccomandazioni */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">{t('client.insights_and_recommendations')}</CardTitle>
            <CardDescription>{t('client.client_intelligence')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={client.isOnboarded ? "ai-profile" : (recommendations.length > 0 ? "recommendations" : "ai-profile")}>
              <TabsList className="mb-4">
                <TabsTrigger value="ai-profile">
                  <Sparkles className="mr-2 h-4 w-4" />
                  {t('client.ai_profile')}
                </TabsTrigger>
                <TabsTrigger value="recommendations">
                  <FileText className="mr-2 h-4 w-4" />
                  {t('client.recommendations')}
                </TabsTrigger>
              </TabsList>
                
              <TabsContent value="ai-profile" className="space-y-4">
                {client.isOnboarded ? (
                  <AiClientProfile clientId={clientId} />
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Sparkles className="mr-2 h-5 w-5 text-purple-500" />
                        {t('client.ai_profile')}
                      </CardTitle>
                      <CardDescription>
                        {t('client.ai_profile_description')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col items-center justify-center py-4 text-center space-y-4">
                        <Brain className="h-16 w-16 text-muted-foreground/50" />
                        <h3 className="text-lg font-semibold">
                          {t('client.complete_onboarding_first')}
                        </h3>
                        <p className="text-muted-foreground max-w-md">
                          {t('client.ai_profile_requires_onboarding')}
                        </p>
                        <Button 
                          onClick={() => handleOpenEmailDialog()} 
                          disabled={sendOnboardingMutation.isPending}
                          className="mt-2"
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          {sendOnboardingMutation.isPending 
                            ? t('client.sending_onboarding_email') 
                            : t('client.send_onboarding_email')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="recommendations" className="space-y-6">
                {recommendations.length === 0 ? (
                  <div className="flex flex-col justify-center items-center h-32 space-y-4">
                    <p className="text-muted-foreground">{t('client.no_recommendations')}</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsUpgradeOpen(true)}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      {t('client.add_recommendation')}
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {recommendations.map((recommendation) => (
                        <Card key={recommendation.id}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base font-medium">{recommendation.title}</CardTitle>
                            <CardDescription className="text-xs">
                              {new Date(recommendation.createdAt).toLocaleDateString()}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <p>{recommendation.content}</p>
                            <div className="mt-2">
                              <Badge variant="outline">
                                {recommendation.category}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    
                    <div className="flex justify-center mt-6">
                      <Button 
                        onClick={() => setIsUpgradeOpen(true)}
                        size="sm"
                        variant="outline"
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {t('client.add_recommendation')}
                      </Button>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
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
                  <p className="text-sm text-muted-foreground">{t('client.choose_language')}</p>
                </div>
              </div>
              <div className="flex space-x-2 mb-3">
                <Button
                  type="button"
                  onClick={() => setEmailLanguage('italian')}
                  variant={emailLanguage === 'italian' ? 'default' : 'outline'}
                  size="sm"
                >
                  {t('languages.italian')}
                </Button>
                <Button
                  type="button"
                  onClick={() => setEmailLanguage('english')}
                  variant={emailLanguage === 'english' ? 'default' : 'outline'}
                  size="sm"
                >
                  {t('languages.english')}
                </Button>
              </div>
              <Label htmlFor="email-subject">{t('client.email_subject')} ({t('client.optional')})</Label>
              <Input 
                id="email-subject"
                placeholder={t('client.email_subject_placeholder')}
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
              <Textarea 
                id="email-content"
                placeholder={t('client.email_placeholder')}
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                className="h-40"
              />
              <p className="text-xs text-muted-foreground">{t('client.email_note')}</p>
            </div>
            
            {onboardingUrl && (
              <div className="space-y-2 bg-accent/10 p-3 rounded-md">
                <Label htmlFor="link" className="text-sm font-medium">{t('client.onboarding_link')}</Label>
                <div className="flex space-x-2">
                  <Input 
                    id="link"
                    value={onboardingUrl}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button 
                    type="button"
                    onClick={copyToClipboard}
                    size="sm"
                    variant="outline"
                    className="whitespace-nowrap"
                  >
                    {t('client.copy')}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t('client.link_expiry_note')}</p>
              </div>
            )}
          </div>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-4">
            <Button 
              variant="outline" 
              onClick={handleGenerateNewLink}
              disabled={isLoading || sendOnboardingMutation.isPending}
            >
              <Link2 className="mr-2 h-4 w-4" />
              {onboardingUrl ? t('client.generate_new_link') : t('client.generate_link')}
            </Button>
            <div className="space-x-2">
              <Button 
                onClick={handleSendEmail}
                disabled={isLoading || sendOnboardingMutation.isPending}
              >
                <Send className="mr-2 h-4 w-4" />
                {isLoading ? t('common.sending') : t('client.send_email')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Upgrade Dialog */}
      <UpgradeDialog open={isUpgradeOpen} onOpenChange={setIsUpgradeOpen} />
    </div>
  );
}
EOL

# Sostituisci il file ClientDetail.tsx
mv /var/www/gervis/client/src/pages/ClientDetail.tsx.new /var/www/gervis/client/src/pages/ClientDetail.tsx

# Aggiorna le traduzioni per riflettere il nuovo layout

# Italiano
cat > /var/www/gervis/client/src/i18n/locales/it/client.json.new << 'EOL'
{
  "ai_profile": "Profilo AI",
  "ai_profile_description": "Approfondimenti e suggerimenti generati dall'intelligenza artificiale basati sui dati del cliente",
  "insights": "Approfondimenti",
  "suggestions": "Suggerimenti",
  "refresh": "Aggiorna",
  "error": "Errore",
  "error_generating_profile": "Si è verificato un errore durante la generazione del profilo AI",
  "no_content_available": "Nessun contenuto disponibile",
  "content_not_formatted_correctly": "I dati non sono disponibili o non sono formattati correttamente. Premi 'Aggiorna' per rigenerare il profilo.",
  "complete_onboarding_first": "Completa il processo di onboarding",
  "ai_profile_requires_onboarding": "Il profilo AI richiede che il cliente abbia completato il processo di onboarding per generare approfondimenti basati sui dati raccolti.",
  "insights_and_recommendations": "Approfondimenti e Raccomandazioni",
  "client_intelligence": "Analisi cliente e suggerimenti personalizzati",
  "show_debug": "Mostra diagnostica",
  "hide_debug": "Nascondi diagnostica",
  "test_api": "Testa API"
}
EOL

# Inglese
cat > /var/www/gervis/client/src/i18n/locales/en/client.json.new << 'EOL'
{
  "ai_profile": "AI Profile",
  "ai_profile_description": "AI-generated insights and suggestions based on client data",
  "insights": "Insights",
  "suggestions": "Suggestions",
  "refresh": "Refresh",
  "error": "Error",
  "error_generating_profile": "An error occurred while generating the AI profile",
  "no_content_available": "No content available",
  "content_not_formatted_correctly": "Data is not available or not formatted correctly. Press 'Refresh' to regenerate the profile.",
  "complete_onboarding_first": "Complete the onboarding process",
  "ai_profile_requires_onboarding": "The AI profile requires that the client has completed the onboarding process to generate insights based on the collected data.",
  "insights_and_recommendations": "Insights and Recommendations",
  "client_intelligence": "Client analysis and personalized suggestions",
  "show_debug": "Show Diagnostics",
  "hide_debug": "Hide Diagnostics",
  "test_api": "Test API"
}
EOL

# Merge delle nuove traduzioni con i file esistenti preservando le traduzioni presenti
if [ -f "/var/www/gervis/client/src/i18n/locales/it/client.json" ]; then
  # Usa jq per fare il merge se disponibile
  if command -v jq &> /dev/null; then
    jq -s '.[0] * .[1]' /var/www/gervis/client/src/i18n/locales/it/client.json /var/www/gervis/client/src/i18n/locales/it/client.json.new > /var/www/gervis/client/src/i18n/locales/it/client.json.merged
    mv /var/www/gervis/client/src/i18n/locales/it/client.json.merged /var/www/gervis/client/src/i18n/locales/it/client.json
  else
    # Fallback se jq non è disponibile
    mv /var/www/gervis/client/src/i18n/locales/it/client.json.new /var/www/gervis/client/src/i18n/locales/it/client.json
  fi
else
  mv /var/www/gervis/client/src/i18n/locales/it/client.json.new /var/www/gervis/client/src/i18n/locales/it/client.json
fi

if [ -f "/var/www/gervis/client/src/i18n/locales/en/client.json" ]; then
  # Usa jq per fare il merge se disponibile
  if command -v jq &> /dev/null; then
    jq -s '.[0] * .[1]' /var/www/gervis/client/src/i18n/locales/en/client.json /var/www/gervis/client/src/i18n/locales/en/client.json.new > /var/www/gervis/client/src/i18n/locales/en/client.json.merged
    mv /var/www/gervis/client/src/i18n/locales/en/client.json.merged /var/www/gervis/client/src/i18n/locales/en/client.json
  else
    # Fallback se jq non è disponibile
    mv /var/www/gervis/client/src/i18n/locales/en/client.json.new /var/www/gervis/client/src/i18n/locales/en/client.json
  fi
else
  mv /var/www/gervis/client/src/i18n/locales/en/client.json.new /var/www/gervis/client/src/i18n/locales/en/client.json
fi

# Rimuovi i file temporanei
rm -f /var/www/gervis/client/src/i18n/locales/it/client.json.new 2>/dev/null
rm -f /var/www/gervis/client/src/i18n/locales/en/client.json.new 2>/dev/null

# Ricompila l'applicazione
echo "Ricompilazione dell'applicazione in corso..."
cd /var/www/gervis
npm run build
echo "Applicazione ricompilata."

# Riavviare i servizi
echo "Riavvio dei servizi in corso..."
pm2 restart all
echo "Servizi riavviati."

echo "Modifiche al layout della pagina cliente completate!"
echo ""
echo "Le modifiche includono:"
echo "1. Separazione dell'allocazione degli asset in un container a sé stante"
echo "2. Raggruppamento di AI e raccomandazioni nello stesso container"
echo "3. Aggiornamento delle traduzioni in italiano e inglese"
echo "4. Riorganizzazione generale del layout per una migliore esperienza utente"