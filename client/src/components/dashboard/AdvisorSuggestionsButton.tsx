import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Zap,
  RefreshCw, 
  Mail,
  ArrowUpRight,
  AlertCircle,
  Clock,
  CheckCircle,
  Sparkles,
  Lightbulb, 
  Send
} from 'lucide-react';
import { AdvisorRecommendation, AdvisorSuggestionsResponse } from '@/types/advisorSuggestions';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { httpRequest } from '@/lib/queryClient';
import { useToast } from "@/hooks/use-toast";

function AdvisorSuggestionsButton() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState<AdvisorRecommendation | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  
  const queryClient = useQueryClient();

  // Recupera i suggerimenti
  const { data, isLoading, isError, refetch } = useQuery<AdvisorSuggestionsResponse>({
    queryKey: ['/api/ai/advisor-suggestions'],
    queryFn: async () => {
      const response = await fetch('/api/ai/advisor-suggestions');
      if (!response.ok) throw new Error('Errore nel recupero dei suggerimenti');
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minuti
  });

  // Aggiorna i suggerimenti
  const refreshMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/ai/advisor-suggestions?refresh=true');
      if (!response.ok) throw new Error('Errore nell\'aggiornamento dei suggerimenti');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/ai/advisor-suggestions'], data);
    }
  });

  // Invia l'email direttamente tramite API
  const sendEmailMutation = useMutation({
    mutationFn: async ({ to, subject, body, clientId }: { to: string, subject: string, body: string, clientId?: number }) => {
      setIsSendingEmail(true);
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          subject,
          message: body,
          clientId,
          language: 'italian'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Errore nell\'invio dell\'email');
      }
      
      return await response.json();
    },
    onSuccess: () => {
        toast({
        title: "Email inviata",
        description: "L'email è stata inviata con successo",
          variant: "default",
        });
      setIsEmailDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Impossibile inviare l'email: ${error.message}`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSendingEmail(false);
    }
  });

  // Gestisce l'apertura del dialog dell'email
  const handleOpenEmailDialog = (suggestion: AdvisorRecommendation) => {
    setCurrentSuggestion(suggestion);
    if (suggestion.personalizedEmail) {
      setEmailSubject(suggestion.personalizedEmail.subject);
      setEmailBody(suggestion.personalizedEmail.body);
    }
    setIsEmailDialogOpen(true);
  };

  // Gestisce l'invio dell'email
  const handleSendEmail = () => {
    if (currentSuggestion?.clientId) {
      // Utilizziamo i valori modificati dall'utente invece di quelli originali
      sendEmailMutation.mutate({
        to: '', // L'email verrà associata al cliente nel backend
        subject: emailSubject,
        body: emailBody,
        clientId: currentSuggestion.clientId
      });
    }
  };

  // Ottieni le icone in base alla priorità
  const getPriorityIcon = (level: string) => {
    switch(level) {
      case 'Alta':
        return <AlertCircle className="h-4 w-4" />;
      case 'Media':
        return <Clock className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  // Ottieni la variante del badge in base alla priorità
  const getPriorityVariant = (level: string) => {
    switch(level) {
      case 'Alta':
        return 'destructive';
      case 'Media':
        return 'secondary';
      default:
        return 'outline';
    }
  };
  
  return (
    <>
      <Button 
        variant="outline" 
        size="sm"
        className="gap-1"
        onClick={() => setIsDialogOpen(true)}
      >
        <Zap className="h-4 w-4 text-amber-500" />
        {t('Opportunità')}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <span>Opportunità di Business</span>
            </DialogTitle>
            <DialogDescription>
              Analisi delle opportunità più rilevanti per massimizzare il business
              {data?.lastGeneratedAt && (
                <span className="block text-xs mt-1">
                  Aggiornato: {format(new Date(data.lastGeneratedAt), "d MMMM yyyy, HH:mm", {locale: it})}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 space-y-3">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mb-2"></div>
                <p>Caricamento opportunità...</p>
              </div>
            ) : isError ? (
              <div className="text-center py-8 text-red-500">Errore nel caricamento</div>
            ) : !data?.suggestions.opportunities.length ? (
              <div className="text-center py-8 text-gray-500">Nessuna opportunità disponibile</div>
            ) : (
              data.suggestions.opportunities.map((suggestion, index) => (
                <Card key={index} className="border">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-amber-500" />
                          {suggestion.title}
                        </CardTitle>
                        <CardDescription className="text-sm">Cliente: {suggestion.clientName}</CardDescription>
                      </div>
                      <Badge variant={getPriorityVariant(suggestion.priority)} className="flex items-center gap-1">
                        {getPriorityIcon(suggestion.priority)}
                        <span className="ml-1 text-xs">{suggestion.priority}</span>
            </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm space-y-3 py-0">
                    <p>{suggestion.description}</p>
                    
                    <div className="flex gap-2 items-start border-t pt-2">
                      <ArrowUpRight className="h-4 w-4 mt-0.5 text-blue-500" />
                      <div className="w-full">
                        <p className="font-medium text-sm">Azione Consigliata:</p>
                        <p className="text-muted-foreground mb-3">{suggestion.suggestedAction}</p>
                        
                        <div className="flex justify-end mb-2">
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => handleOpenEmailDialog(suggestion)}
                          >
                            <Mail className="mr-2 h-3.5 w-3.5" />
                            Prepara Email
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="mt-4 flex justify-end pt-3 border-t">
            <Button 
              variant="outline" 
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
              size="sm" 
              className="flex items-center gap-1"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
              {refreshMutation.isPending ? 'Aggiornamento...' : 'Aggiorna opportunità'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog per l'email */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-500" />
              <span>Email personalizzata</span>
          </DialogTitle>
          <DialogDescription>
              {currentSuggestion?.clientName ? `Per il cliente: ${currentSuggestion.clientName}` : 'Email pronta per l\'invio'}
          </DialogDescription>
        </DialogHeader>
        
          {currentSuggestion ? (
            <div className="py-2 space-y-4">
              <div className="space-y-2">
                <div>
                  <p className="font-medium text-sm mb-1">Oggetto:</p>
                  <Input 
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full"
                    placeholder="Oggetto dell'email"
                  />
                </div>
                <div>
                  <p className="font-medium text-sm mb-1">Messaggio:</p>
                  <Textarea 
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className="w-full min-h-[300px] font-mono text-sm"
                    placeholder="Corpo dell'email"
                  />
            </div>
            </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Nessuna email disponibile per questa opportunità
                </div>
              )}
              
          <DialogFooter className="mt-4">
            <Button 
              onClick={() => setIsEmailDialogOpen(false)} 
              variant="outline"
              className="mr-2"
              disabled={isSendingEmail}
            >
              Annulla
            </Button>
            <Button 
              onClick={handleSendEmail} 
              disabled={!emailSubject || !emailBody || isSendingEmail}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="mr-2 h-4 w-4" />
              {isSendingEmail ? "Invio in corso..." : "Invia email"}
            </Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
} 

export default AdvisorSuggestionsButton; 