import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Link2, ExternalLink, Send, Copy, RefreshCw, Mail, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmailDialog } from "@/components/dialog";
import { EmailFormData } from "@/types/email";

interface OnboardingRequiredProps {
  clientId: number;
  clientName: string;
  onBackToClients: () => void;
}

export function OnboardingRequired({ clientId, clientName, onBackToClients }: OnboardingRequiredProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isLinkLoading, setIsLinkLoading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("Completa il tuo profilo");
  const [emailMessage, setEmailMessage] = useState("");

  // State for the onboarding link with localStorage persistence
  const [onboardingLink, setOnboardingLink] = useState<string | null>(() => {
    // Inizializza da localStorage se esiste
    const storedLink = localStorage.getItem(`onboardingLink_${clientId}`);
    return storedLink ? storedLink : null;
  });

  // Prepara il messaggio email predefinito quando il nome del cliente cambia
  useEffect(() => {
    // Usa il messaggio email predefinito in italiano
    const standardEmailMessage = `Gentile ${clientName},

Spero che tu stia bene! Ti scrivo personalmente per invitarti a completare il tuo profilo finanziario attraverso la nostra semplice procedura di onboarding.

Condividendo alcune informazioni sulla tua situazione finanziaria e i tuoi obiettivi, sarò in grado di offrirti una consulenza finanziaria veramente personalizzata e su misura per le tue esigenze.

La procedura è rapida e semplice - richiederà solo circa 5 minuti del tuo tempo. Basta cliccare sul link qui sotto per iniziare.

Grazie per la tua fiducia e collaborazione.`;
    
    setEmailMessage(standardEmailMessage);
  }, [clientName]);

  // Funzione per generare link di onboarding
  const handleGenerateOnboardingLink = async (e?: React.MouseEvent) => {
    // Se è un evento, previeni il comportamento default
    if (e && e.preventDefault) e.preventDefault();
    
    setIsLinkLoading(true);
    try {
      const payload = {
        language: 'italian' // Hardcoded per ora, ma puoi rendere parametrizzabile
      };
      
      // Modifica l'endpoint per usare onboarding-token
      const response = await apiRequest(`/api/clients/${clientId}/onboarding-token`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      console.log('[DEBUG] Token response:', response);
      
      // IMPORTANTE: Considera sempre la risposta un successo a meno che non ci sia un messaggio di errore esplicito
      // e il campo 'success' è falso
      const isSuccess = !(response.success === false && response.message);
      
      if (isSuccess) {
        // Utilizziamo il link restituito direttamente dal server, che è garantito essere corretto
        // Altrimenti usiamo il token per costruire l'URL corretto
        let onboardingLink;
        
        if (response.link) {
          // Usiamo direttamente il link fornito dal server
          onboardingLink = response.link;
        } else if (response.token) {
          // Costruiamo il link manualmente - assicuriamoci che il token sia correttamente formattato
          // Il link dovrebbe essere simile a https://example.com/onboarding?token=abc123
          const baseUrl = window.location.origin;
          onboardingLink = `${baseUrl}/onboarding?token=${encodeURIComponent(response.token)}`;
        } else {
          throw new Error("Nessun link o token ricevuto dal server");
        }
        
        console.log('[DEBUG] Onboarding link:', onboardingLink);
        
        if (onboardingLink) {
          localStorage.setItem(`onboardingLink_${clientId}`, onboardingLink);
          setOnboardingLink(onboardingLink);
          
          // Copiamo il link negli appunti se possibile
          if (navigator.clipboard) {
            try {
              await navigator.clipboard.writeText(onboardingLink);
              toast({
                title: t('client.link_generated') || "Link generato",
                description: t('client.link_generated_success') || "Il link di onboarding è stato generato e copiato negli appunti",
                duration: 5000
              });
            } catch (clipboardError) {
              // Se fallisce la copia, mostra comunque un messaggio di successo
              console.warn("Non è stato possibile copiare automaticamente il link negli appunti:", clipboardError);
              toast({
                title: t('client.link_generated') || "Link generato",
                description: (t('client.link_generated_no_copy') || "Il link di onboarding è stato generato. Usare il pulsante Copia per copiarlo negli appunti."),
                duration: 5000
              });
            }
          } else {
            // Se clipboard API non è disponibile
            toast({
              title: t('client.link_generated') || "Link generato",
              description: (t('client.link_generated_no_copy') || "Il link di onboarding è stato generato. Usare il pulsante Copia per copiarlo negli appunti."),
              duration: 5000
            });
          }
        } else {
          toast({
            title: t('client.link_generated') || "Link generato",
            description: t('client.link_generated_success') || "Il link di onboarding è stato generato",
            duration: 5000
          });
        }
      } else {
        toast({
          title: t('error') || "Errore",
          description: response.message || (t('client.link_generation_failed') || "Impossibile generare il link di onboarding"),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('[DEBUG] Error generating link:', error);
      toast({
        title: t('error') || "Errore",
        description: t('client.link_generation_failed') || "Impossibile generare il link di onboarding",
        variant: "destructive"
      });
    } finally {
      setIsLinkLoading(false);
    }
  };
  
  // Funzione per aprire il dialog di modifica email
  const handleOpenEmailDialog = () => {
    if (!onboardingLink) {
      toast({
        title: t('error') || "Errore",
        description: t('client.generate_link_first') || "Genera prima un link di onboarding",
        variant: "destructive"
      });
      return;
    }
    
    setIsEmailDialogOpen(true);
  };
  
  // Funzione per inviare il link di onboarding via email
  const handleSendOnboardingEmail = async (data: EmailFormData) => {
    if (!onboardingLink) {
      toast({
        title: t('error') || "Errore",
        description: t('client.generate_link_first') || "Genera prima un link di onboarding",
        variant: "destructive"
      });
      return;
    }
    
    // Invia direttamente l'email con il messaggio personalizzato
    setIsSendingEmail(true);
    try {
      // Estrai il token dal link di onboarding
      // Prima prova usando URLSearchParams che è più affidabile di regex
      let token = null;
      
      try {
        // Prova con URLSearchParams se l'URL è valido
        const url = new URL(onboardingLink);
        token = url.searchParams.get('token');
      } catch (e) {
        // Se l'URL non è valido, fallback a regex
        const tokenMatch = onboardingLink.match(/token=([^&\s]+)/);
        token = tokenMatch ? tokenMatch[1] : null;
      }
      
      console.log('[DEBUG-FE] handleSendOnboardingEmail - Token extracted:', { 
        hasToken: !!token,
        tokenLength: token?.length,
        token: token
      });
      
      if (!token) {
        console.error('[DEBUG-FE] handleSendOnboardingEmail - Error: Token not found in link');
        throw new Error("Token non trovato nel link di onboarding");
      }
      
      const payload = {
        language: 'italian',
        sendEmail: true,
        customMessage: data.message,
        customSubject: data.subject,
        recipientName: data.recipientName,
        recipientEmail: data.recipientEmail,
        token: token
      };
      
      // Utilizziamo l'endpoint corretto onboarding-token invece di onboarding-email
      const response = await apiRequest(`/api/clients/${clientId}/onboarding-token`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      if (response.success) {
        setIsEmailDialogOpen(false);
        toast({
          title: t('client.email_sent') || "Email inviata",
          description: t('client.email_sent_success') || "L'email di onboarding è stata inviata con successo",
          duration: 5000
        });
      } else {
        // Verifica se è un errore di configurazione email
        if (response.configurationRequired) {
          toast({
            title: t('client.email_config_error') || "Configurazione email mancante",
            description: t('client.email_config_error_desc') || "È necessario configurare un server SMTP nelle impostazioni utente per inviare email",
            variant: "destructive",
            duration: 10000
          });
        } else {
          toast({
            title: t('error') || "Errore",
            description: response.message || (t('client.email_send_failed') || "Impossibile inviare l'email di onboarding"),
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('[DEBUG-FE] handleSendOnboardingEmail - Error sending email:', error);
      toast({
        title: t('error') || "Errore",
        description: t('client.email_send_failed') || "Impossibile inviare l'email di onboarding",
        variant: "destructive"
      });
    } finally {
      setIsSendingEmail(false);
    }
  };
  
  function handleGenerateNewLink() {
    // Reset del link esistente e generazione di uno nuovo
    localStorage.removeItem(`onboardingLink_${clientId}`);
    setOnboardingLink(null);
    handleGenerateOnboardingLink();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBackToClients}
              title="Torna all'elenco clienti"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">{clientName}</h1>
          </div>
        </div>

        <div className="space-y-6">
          {/* Onboarding Required Message */}
          <Card>
            <CardHeader>
              <CardTitle>{t('client.onboarding_required') || "Onboarding Richiesto"}</CardTitle>
              <CardDescription>
                {t('client.onboarding_required_description') || "Per procedere, è necessario completare il modulo di onboarding"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-6 space-y-6">
                {/* Cambiamo l'icona per qualcosa di più amichevole */}
                <Mail className="h-14 w-14 text-blue-500" />
                <p className="text-center text-muted-foreground">
                  {t('client.onboard_first') || "Per procedere con la gestione di questo cliente, è necessario che completi il modulo di onboarding"}
                </p>
                <div className="flex space-x-4">
                  {!onboardingLink ? (
                    <Button 
                      variant="default" 
                      size="lg"
                      onClick={handleGenerateOnboardingLink}
                      disabled={isLinkLoading}
                      className="bg-accent hover:bg-accent/90"
                    >
                      <Link2 className="mr-2 h-4 w-4" />
                      {isLinkLoading ? t('common.generating') : t('client.generate_link')}
                    </Button>
                  ) : (
                    <Button 
                      variant="default" 
                      size="lg"
                      onClick={() => {
                        const newWindow = window.open(onboardingLink, '_blank');
                        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                          toast({
                            title: "Apertura bloccata",
                            description: "Il browser ha bloccato l'apertura della finestra. Usa il pulsante 'Copia' per copiare il link e aprirlo manualmente.",
                            variant: "destructive",
                            duration: 5000
                          });
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      {t('client.visit_onboarding_page') || "Vai al modulo di onboarding"}
                    </Button>
                  )}
                  {onboardingLink && (
                    <Button 
                      variant="default" 
                      size="lg"
                      onClick={handleOpenEmailDialog}
                      disabled={isLinkLoading}
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Invia modulo di onboarding
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Onboarding Link Section */}
          {onboardingLink && (
            <Card>
              <CardHeader>
                <CardTitle>{t('client.onboarding_link') || "Link di onboarding"}</CardTitle>
                <CardDescription>
                  {t('client.onboarding_link_description') || "Puoi copiare e condividere questo link con il cliente"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center space-x-2">
                    <Input
                      readOnly
                      value={onboardingLink}
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(onboardingLink);
                        toast({
                          title: t('common.copied'),
                          description: t('common.link_copied'),
                        });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={handleGenerateNewLink}
                      disabled={isLinkLoading}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {isLinkLoading ? t('common.generating') : t('client.generate_new_link')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog per modificare ed inviare l'email - Aggiornato alla nuova versione */}
      <EmailDialog
        open={isEmailDialogOpen}
        onOpenChange={setIsEmailDialogOpen}
        clientId={clientId}
        title="Invia modulo di onboarding"
        presetSubject={emailSubject}
        presetMessage={emailMessage}
        onSubmit={handleSendOnboardingEmail}
        includeCustomFooter={false}
        useClientSelector={true}
      />
    </div>
  );
} 