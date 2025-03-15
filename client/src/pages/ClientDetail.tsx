import { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Client, RISK_PROFILES } from "@shared/schema";

export default function ClientDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const clientId = parseInt(id);
  const { toast } = useToast();
  
  // Fetch client details
  const { 
    data: client, 
    isLoading, 
    isError 
  } = useQuery({
    queryKey: [`/api/clients/${clientId}`],
    enabled: !isNaN(clientId)
  });
  
  // Fetch client assets
  const { 
    data: assets = [], 
    isLoading: isLoadingAssets 
  } = useQuery({
    queryKey: [`/api/clients/${clientId}/assets`],
    enabled: !isNaN(clientId) && !!client?.isOnboarded,
  });

  // For sending onboarding form
  const sendOnboardingMutation = useMutation({
    mutationFn: () => {
      // This would normally send an email to the client with an onboarding link
      // For this demo, we'll just simulate it and update the client status
      return apiRequest(`/api/clients/${clientId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isOnboarded: true }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}`] });
      toast({
        title: "Onboarding form sent",
        description: "The client has been successfully onboarded for demo purposes.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send onboarding form. Please try again.",
        variant: "destructive",
      });
    },
  });

  function handleSendOnboardingForm() {
    sendOnboardingMutation.mutate();
  }
  
  function formatDate(date: Date | string | null) {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  }
  
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
    <div className="flex flex-col h-full">
      <div className="flex items-center p-6">
        <Button variant="ghost" onClick={() => setLocation("/app")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="ml-4 text-3xl font-bold tracking-tight">{client.name}</h1>
        {client.isOnboarded ? (
          <Badge className="ml-4 bg-green-600">Onboarded</Badge>
        ) : (
          <Badge className="ml-4" variant="outline">Not Onboarded</Badge>
        )}
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
              <Button 
                onClick={handleSendOnboardingForm}
                disabled={sendOnboardingMutation.isPending}
                className="bg-accent hover:bg-accent/90"
              >
                <Send className="mr-2 h-4 w-4" />
                {sendOnboardingMutation.isPending ? "Sending..." : "Send Onboarding Form"}
              </Button>
            </CardContent>
          </Card>
        ) : null}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-xl">Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 opacity-70" />
                <span className="text-sm text-muted-foreground mr-2">Created:</span>
                <span>{formatDate(client.createdAt)}</span>
              </div>
              
              <Separator className="my-4" />
              
              <div>
                <span className="text-sm text-muted-foreground">Risk Profile:</span>
                <div className="mt-2">
                  {client.riskProfile ? (
                    <Badge className="capitalize">
                      {client.riskProfile}
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      Not Assessed
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="pt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    toast({
                      title: "Feature coming soon",
                      description: "Editing client information will be available soon."
                    });
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Information
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {client.isOnboarded ? (
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl">Portfolio Overview</CardTitle>
                <CardDescription>
                  Snapshot of client's current asset allocation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="portfolio">
                  <TabsList className="mb-4">
                    <TabsTrigger value="portfolio">
                      <PieChart className="mr-2 h-4 w-4" />
                      Portfolio
                    </TabsTrigger>
                    <TabsTrigger value="recommendations">
                      <FileText className="mr-2 h-4 w-4" />
                      Recommendations
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="portfolio" className="space-y-6">
                    {isLoadingAssets ? (
                      <div className="flex justify-center items-center h-48">
                        <p>Loading assets...</p>
                      </div>
                    ) : assets.length === 0 ? (
                      <div className="flex flex-col justify-center items-center h-48 space-y-3">
                        <p className="text-muted-foreground">No assets found</p>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            toast({
                              title: "Feature coming soon",
                              description: "Adding assets will be available soon."
                            });
                          }}
                        >
                          Add Assets
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <Card>
                            <CardHeader className="p-4 pb-2">
                              <CardTitle className="text-base">Risk Alignment</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                              <div className="flex items-center mt-2">
                                <Check className="h-4 w-4 mr-2 text-green-500" />
                                <span className="text-sm">Properly aligned with risk profile</span>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardHeader className="p-4 pb-2">
                              <CardTitle className="text-base">Total Portfolio Value</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                              <div className="text-2xl font-bold">
                                €320,000
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                        
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">Asset Allocation</h3>
                          
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                <Home className="h-4 w-4 mr-2 text-blue-500" />
                                <span>Real Estate</span>
                              </div>
                              <span className="font-medium">45% (€144,000)</span>
                            </div>
                            <Progress value={45} className="h-2" />
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                <Briefcase className="h-4 w-4 mr-2 text-green-500" />
                                <span>Equity</span>
                              </div>
                              <span className="font-medium">30% (€96,000)</span>
                            </div>
                            <Progress value={30} className="h-2" />
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                <FileText className="h-4 w-4 mr-2 text-purple-500" />
                                <span>Bonds</span>
                              </div>
                              <span className="font-medium">15% (€48,000)</span>
                            </div>
                            <Progress value={15} className="h-2" />
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                <Briefcase className="h-4 w-4 mr-2 text-yellow-500" />
                                <span>Cash</span>
                              </div>
                              <span className="font-medium">10% (€32,000)</span>
                            </div>
                            <Progress value={10} className="h-2" />
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="recommendations" className="space-y-4">
                    <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
                      <CardHeader className="pb-2">
                        <div className="flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
                          <CardTitle className="text-base text-orange-700 dark:text-orange-400">Allocation Mismatch</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-orange-700 dark:text-orange-400">
                          Current allocation is over-exposed to real estate (45% vs recommended 35%)
                          and under-allocated to bonds (15% vs recommended 25%).
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Recommended Actions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <h4 className="font-medium">1. Reduce Real Estate Exposure</h4>
                          <p className="text-sm text-muted-foreground">
                            Consider liquidating secondary property investments to reduce
                            real estate exposure by approximately 10%.
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="font-medium">2. Increase Bond Allocation</h4>
                          <p className="text-sm text-muted-foreground">
                            Invest the proceeds from real estate reduction into high-quality
                            corporate bonds to increase bond allocation by 10%.
                          </p>
                        </div>
                        
                        <div className="pt-4">
                          <Button 
                            size="sm"
                            onClick={() => {
                              toast({
                                title: "Feature coming soon",
                                description: "Generating PDF summaries will be available soon."
                              });
                            }}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Generate PDF Summary
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}