import React from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { 
  Mail, 
  Calendar,
  MessageSquare
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  TabsContent 
} from "@/components/ui/tabs";
import { 
  Button 
} from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ClientLogList from "@/components/ClientLogList";

interface ClientInteractionsTabProps {
  clientId: number;
  onAddLog: () => void;
}

/**
 * Tab delle Interazioni con il Cliente che mostra la cronologia delle comunicazioni
 * 
 * Questa componente mostra:
 * - Pulsanti per inviare email e programmare incontri
 * - Elenco dei log delle interazioni con il cliente
 */
export function ClientInteractionsTab({ clientId, onAddLog }: ClientInteractionsTabProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // Query to fetch client logs
  const clientLogsQuery = useQuery({
    queryKey: ["/api/client-logs", clientId],
    queryFn: () => apiRequest(`/api/client-logs/${clientId}`),
    enabled: !!clientId
  });

  return (
    <TabsContent value="client-interactions" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-500" />
            {t('client.interactions') || "Interazioni con il Cliente"}
          </CardTitle>
          <CardDescription>
            {t('client.interactions_description') || "Cronologia delle comunicazioni e incontri con il cliente"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Action buttons first */}
            <div className="flex space-x-4">
              <Button 
                className="bg-blue-500 hover:bg-blue-600 text-white"
                onClick={() => {
                  toast({
                    title: t('client.email_feature') || "Email Feature",
                    description: t('client.feature_coming_soon') || "Coming soon",
                  });
                }}
              >
                <Mail className="h-4 w-4 mr-2" />
                {t('client.send_email') || "Invia Email"}
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  toast({
                    title: t('client.meeting_feature') || "Meeting Feature",
                    description: t('client.feature_coming_soon') || "Coming soon",
                  });
                }}
              >
                <Calendar className="h-4 w-4 mr-2" />
                {t('client.schedule_meeting') || "Programma Incontro"}
              </Button>
            </div>
            
            {/* Fetch and display logs directly */}
            {clientLogsQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              <ClientLogList 
                clientId={clientId} 
                logs={clientLogsQuery.data?.logs || []} 
                showAddButton={true}
                onAddLog={onAddLog}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
} 