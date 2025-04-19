import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Eye, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

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
  return useQuery<AIProfilesData>({
    queryKey: ['ai-profiles'],
    queryFn: async () => {
      const response = await apiRequest('/api/ai-profiles');
      return response as AIProfilesData;
    }
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
  const { data: aiProfilesData, isLoading: isLoadingAIProfiles } = useAIProfiles();
  const { data: clients = [] as Client[] } = useClients();
  const [showOpportunityDetailDialog, setShowOpportunityDetailDialog] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);

  // Estrai e ordina le opportunità da tutti i profili AI
  const opportunities = useMemo(() => {
    if (!aiProfilesData?.profiles) return [] as Opportunity[];
    
    const allOpportunities: Opportunity[] = aiProfilesData.profiles.flatMap((profile: AIProfile) => 
      profile.opportunitaBusiness.map((opp) => ({
        id: `${profile.clientId}-${opp.priorita}`,
        clientId: profile.clientId,
        clientName: profile.clientName,
        title: opp.titolo,
        description: opp.descrizione,
        priority: opp.priorita,
        email: opp.email,
        azioni: opp.azioni
      }))
    );

    // Ordina per priorità (1 = alta, 2 = media, 3 = bassa)
    return allOpportunities.sort((a: Opportunity, b: Opportunity) => a.priority - b.priority);
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
        subtitle="Opportunità di business per i tuoi clienti"
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
        ) : opportunities.length === 0 ? (
          <Card>
            <CardContent className="py-10">
              <div className="py-6 text-center text-muted-foreground">
                {t('dashboard.no_opportunities')}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {opportunities.map((opportunity: Opportunity) => {
              const client = clients.find((c: Client) => c.id === opportunity.clientId);
              const clientAUM = client?.totalAssets || 0;
              
              return (
                <Card 
                  key={opportunity.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedOpportunity(opportunity);
                    setShowOpportunityDetailDialog(true);
                  }}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        opportunity.priority === 1 ? 'bg-red-500' :
                        opportunity.priority === 2 ? 'bg-orange-500' :
                        opportunity.priority === 3 ? 'bg-yellow-500' :
                        opportunity.priority === 4 ? 'bg-blue-500' :
                        'bg-gray-500'
                      }`} />
                      <CardTitle className="text-lg">{opportunity.title}</CardTitle>
                    </div>
                    <CardDescription className="flex justify-between">
                      <span>Cliente: {opportunity.clientName}</span>
                      <span>Priorità {
                        opportunity.priority === 1 ? 'MASSIMA' :
                        opportunity.priority === 2 ? 'ALTA' :
                        opportunity.priority === 3 ? 'MEDIA' :
                        opportunity.priority === 4 ? 'BASSA' :
                        'MINIMA'
                      }</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {opportunity.description}
                    </p>
                  </CardContent>
                  <CardFooter className="border-t pt-3 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOpportunity(opportunity);
                        setShowOpportunityDetailDialog(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {t('common.view')}
                    </Button>
                  </CardFooter>
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
                <div className="flex justify-between items-start">
                  <h3 className="text-sm font-semibold mb-1">Email suggerita</h3>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (selectedOpportunity?.clientId && selectedOpportunity?.email) {
                        handleSendEmail(selectedOpportunity.clientId, selectedOpportunity.email);
                      }
                    }}
                  >
                    Invia email
                  </Button>
                </div>
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
        </DialogContent>
      </Dialog>
    </div>
  );
} 