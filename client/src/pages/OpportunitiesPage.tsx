import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Eye, TrendingUp, LucideCheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

// Definizione delle interfacce per i tipi di dati
interface AIProfile {
  clientId: number;
  clientName: string;
  lastUpdated: string;
  profiloCliente: {
    descrizione: string;
  };
  opportunitaBusiness: Array<{
    titolo: string;
    descrizione: string;
    priorita: number;
    email: {
      oggetto: string;
      corpo: string;
    };
    azioni: string[];
  }>;
}

interface AIProfilesData {
  profiles: AIProfile[];
}

interface Client {
  id: number;
  name: string;
  email: string;
  totalAssets?: number;
}

interface Opportunity {
  id: string;
  clientId: number;
  clientName: string;
  title: string;
  description: string;
  priority: number;
  email?: {
    oggetto: string;
    corpo: string;
  };
  azioni?: string[];
}

// Hook personalizzati
const useAIProfiles = () => {
  const { toast } = useToast();
  
  return useQuery<AIProfilesData>({
    queryKey: ['ai-profiles'],
    queryFn: async () => {
      try {
        console.log("[DEBUG] Fetching AI profiles...");
        const response = await apiRequest('/api/ai-profiles');
        console.log("[DEBUG] AI profiles response:", response);
        
        // Verifica che la risposta abbia la struttura corretta
        if (!response || typeof response !== 'object') {
          console.error("[DEBUG] Invalid response from /api/ai-profiles:", response);
          throw new Error("Invalid response from server");
        }
        
        // Se la risposta non ha un campo 'profiles', ma ha 'success' e 'data',
        // potrebbe essere che la struttura è diversa da quella attesa
        if (!response.profiles && response.success && response.data) {
          console.log("[DEBUG] Converting response format");
          return { profiles: response.data };
        }
        
        // Se la risposta non ha un campo 'profiles', crea un array vuoto
        if (!response.profiles) {
          console.error("[DEBUG] Response missing 'profiles' array:", response);
          return { profiles: [] };
        }
        
        return response as AIProfilesData;
      } catch (error) {
        console.error("[DEBUG] Error fetching AI profiles:", error);
        toast({
          title: "Errore nel caricamento delle opportunità",
          description: error instanceof Error ? error.message : "Si è verificato un errore imprevisto",
          variant: "destructive"
        });
        throw error;
      }
    },
    retry: 1,
    refetchOnWindowFocus: false
  });
};

const useClients = () => {
  return useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => {
      const response = await apiRequest('/api/clients');
      return (response.clients || []) as Client[];
    }
  });
};

export default function OpportunitiesPage() {
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: aiProfilesData, isLoading: isLoadingAIProfiles, isError: isProfilesError, error: profilesError, refetch: refetchProfiles } = useAIProfiles();
  const { data: clients = [] as Client[] } = useClients();
  const [showOpportunityDetailDialog, setShowOpportunityDetailDialog] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);

  // Estrai e ordina le opportunità da tutti i profili AI
  const opportunities = useMemo(() => {
    console.log("[DEBUG] Building opportunities from AI profiles:", aiProfilesData);
    
    if (!aiProfilesData?.profiles) {
      console.log("[DEBUG] No profiles available");
      return [] as Opportunity[];
    }
    
    try {
      // Verifica che profiles sia un array
      if (!Array.isArray(aiProfilesData.profiles)) {
        console.error("[DEBUG] profiles is not an array:", aiProfilesData.profiles);
        return [] as Opportunity[];
      }
      
      // Logga il numero di profili
      console.log(`[DEBUG] Processing ${aiProfilesData.profiles.length} profiles`);
      
      // Inizializza un array vuoto per le opportunità
      const allOpportunities: Opportunity[] = [];
      
      // Itera su ciascun profilo
      for (const profile of aiProfilesData.profiles) {
        // Verifica che il profilo sia un oggetto valido
        if (!profile || typeof profile !== 'object') {
          console.log("[DEBUG] Invalid profile:", profile);
          continue;
        }
        
        // Verifica che il profilo abbia clientId e clientName
        if (!profile.clientId || !profile.clientName) {
          console.log("[DEBUG] Profile missing required fields:", profile);
          continue;
        }
        
        // Verifica che opportunitaBusiness sia un array
        if (!profile.opportunitaBusiness || !Array.isArray(profile.opportunitaBusiness)) {
          console.log("[DEBUG] Profile has no opportunities:", profile);
          continue;
        }
        
        // Itera su ciascuna opportunità
        for (const opp of profile.opportunitaBusiness) {
          try {
            // Verifica che l'opportunità abbia titolo, descrizione e priorità
            if (!opp.titolo || !opp.descrizione || opp.priorita === undefined) {
              console.log("[DEBUG] Invalid opportunity:", opp);
              continue;
            }
            
            // Aggiungi l'opportunità all'array
            allOpportunities.push({
              id: `${profile.clientId}-${opp.priorita}-${Math.random().toString(36).substring(2)}`,
              clientId: profile.clientId,
              clientName: profile.clientName,
              title: opp.titolo,
              description: opp.descrizione,
              priority: opp.priorita,
              email: opp.email,
              azioni: opp.azioni
            });
          } catch (oppError) {
            console.error("[DEBUG] Error processing opportunity:", oppError, opp);
          }
        }
      }
      
      console.log(`[DEBUG] Found ${allOpportunities.length} total opportunities`);
      
      // Ordina per priorità (1 = alta, 2 = media, 3 = bassa)
      return allOpportunities.sort((a: Opportunity, b: Opportunity) => a.priority - b.priority);
    } catch (error) {
      console.error("[DEBUG] Error building opportunities:", error);
      return [] as Opportunity[];
    }
  }, [aiProfilesData]);

  const handleSendEmail = async (clientId: number, emailData: { oggetto: string; corpo: string }) => {
    try {
      // Show loading toast
      toast({
        title: t('common.sending'),
        description: t('common.please_wait'),
      });
      
      // Send the email via API
      const response = await apiRequest(`/api/clients/${clientId}/send-email`, {
        method: 'POST',
        body: JSON.stringify({
          subject: emailData.oggetto,
          message: emailData.corpo,
          language: 'italian' // o 'english' in base alle preferenze
        })
      });
      
      if (response.success) {
        toast({
          title: t('client.email_sent'),
          description: t('client.opportunity_email_sent_success'),
        });
        setShowOpportunityDetailDialog(false);
      } else {
        toast({
          title: t('common.error'),
          description: response.message || t('client.onboarding_email_error'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('dashboard.email_error'),
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader 
        title={t('dashboard.opportunities')}
        subtitle="Opportunità di business basate sui profili AI dei tuoi clienti"
      />

      <div className="space-y-4">
        {isLoadingAIProfiles ? (
          <Card>
            <CardContent className="py-10">
              <div className="py-6 text-center text-muted-foreground">
                {t('dashboard.loading')}...
              </div>
            </CardContent>
          </Card>
        ) : isProfilesError ? (
          <Card>
            <CardContent className="py-10">
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                <div className="text-center text-muted-foreground">
                  {t('dashboard.error_loading_opportunities')}
                </div>
                <Button onClick={() => refetchProfiles()}>
                  {t('common.retry')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : opportunities.length === 0 ? (
          <Card>
            <CardContent className="py-10">
              <div className="py-6 text-center text-muted-foreground">
                {t('dashboard.no_opportunities')}
              </div>
              <div className="text-center mt-2">
                <Button onClick={() => refetchProfiles()} variant="outline">
                  {t('common.refresh')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col space-y-4">
            {opportunities.map((opportunity: Opportunity) => {
              const client = clients.find((c: Client) => c.id === opportunity.clientId);
              const clientAUM = client?.totalAssets || 0;
              
              return (
                <Card 
                  key={opportunity.id}
                  className="overflow-hidden border shadow-sm hover:shadow-md transition-all bg-white cursor-pointer"
                  onClick={() => {
                    setSelectedOpportunity(opportunity);
                    setShowOpportunityDetailDialog(true);
                  }}
                >
                  <CardHeader className="pb-2 border-b bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base text-gray-800">{opportunity.title}</CardTitle>
                        <Badge className={`${
                          opportunity.priority === 1 ? 'bg-blue-800 text-white' :
                          opportunity.priority === 2 ? 'bg-blue-600 text-white' :
                          opportunity.priority === 3 ? 'bg-blue-500 text-white' :
                          opportunity.priority === 4 ? 'bg-blue-400 text-white' :
                          'bg-blue-300 text-white'
                        }`}>
                          Priorità {
                            opportunity.priority === 1 ? 'MASSIMA' :
                            opportunity.priority === 2 ? 'ALTA' :
                            opportunity.priority === 3 ? 'MEDIA' :
                            opportunity.priority === 4 ? 'BASSA' :
                            'MINIMA'
                          }
                        </Badge>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOpportunity(opportunity);
                          setShowOpportunityDetailDialog(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Visualizza
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-700 mb-4">
                      {opportunity.description}
                    </p>
                    <div className="flex items-center text-sm text-gray-500">
                      <span>Cliente: {opportunity.clientName}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog per visualizzare il dettaglio dell'opportunità */}
      <Dialog open={showOpportunityDetailDialog} onOpenChange={setShowOpportunityDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedOpportunity?.title}</DialogTitle>
            <DialogDescription>
              Cliente: {selectedOpportunity?.clientName} - Priorità {
                selectedOpportunity?.priority === 1 ? 'MASSIMA' :
                selectedOpportunity?.priority === 2 ? 'ALTA' :
                selectedOpportunity?.priority === 3 ? 'MEDIA' :
                selectedOpportunity?.priority === 4 ? 'BASSA' :
                'MINIMA'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-1">Descrizione</h3>
              <p className="text-sm">{selectedOpportunity?.description}</p>
            </div>
            
            {selectedOpportunity?.azioni && selectedOpportunity.azioni.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-1">Azioni consigliate</h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {selectedOpportunity.azioni.map((azione: string, idx: number) => (
                    <li key={idx}>{azione}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {selectedOpportunity?.email && (
              <div>
                <h3 className="text-sm font-semibold mb-1">Email suggerita</h3>
                <div className="border rounded-md p-3 text-sm space-y-2">
                  <div className="pb-2 border-b">
                    <span className="font-semibold">Oggetto:</span> {selectedOpportunity?.email.oggetto}
                  </div>
                  <div className="whitespace-pre-line">
                    {selectedOpportunity?.email.corpo}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {selectedOpportunity?.email && (
            <div className="flex justify-end mt-6">
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => {
                  if (selectedOpportunity?.clientId && selectedOpportunity?.email) {
                    handleSendEmail(selectedOpportunity.clientId, selectedOpportunity.email);
                  }
                }}
              >
                Invia email
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 