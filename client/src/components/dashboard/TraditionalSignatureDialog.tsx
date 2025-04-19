import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, Check, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface TraditionalSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  clientEmail: string;
  clientId: number | string;
  documentUrl?: string;
}

export function TraditionalSignatureDialog({
  open,
  onOpenChange,
  clientName,
  clientEmail,
  clientId,
  documentUrl
}: TraditionalSignatureDialogProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [step, setStep] = useState<'initial' | 'email-preview' | 'success'>('initial');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Email state
  const [emailSubject, setEmailSubject] = useState<string>(`${t('client.traditional_signature')} - Documento MIFID`);
  const [emailBody, setEmailBody] = useState<string>("");

  // Prepare the email template
  const prepareEmailTemplate = () => {
    setIsLoading(true);
    try {
      // Generate default email body
      setEmailBody(`Gentile ${clientName},

Come discusso, le invio in allegato il documento MIFID per la firma.

Il documento è richiesto ai fini della normativa MIFID per fornirle una consulenza adeguata al suo profilo.

Come da accordi, le chiederei di inviarmi copia del documento siglata su tutte le pagine e firmata per poterla archiviare.
Rimango a disposizione per qualsiasi chiarimento.

Cordiali saluti,`);

      // Move to email preview step
      setStep('email-preview');
    } catch (error) {
      console.error('Error preparing email template:', error);
      toast({
        title: "Errore",
        description: "Impossibile preparare il modello di email. Riprova più tardi.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle sending email with document
  const sendEmail = async () => {
    setIsSending(true);
    try {
      // Verifica che l'URL del documento sia disponibile
      if (!documentUrl) {
        throw new Error("URL del documento non disponibile");
      }

      console.log('Invio email con allegato:', {
        subject: emailSubject,
        clientId,
        documentUrl,
        clientEmail
      });

      // Invia l'email con il documento allegato
      const response = await fetch(`/api/clients/${clientId}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject: emailSubject,
          message: emailBody,
          attachmentUrl: documentUrl, // URL del documento da allegare - inviamo l'URL originale senza modificarlo
          includeAttachment: true, // Forza l'inclusione dell'allegato
          language: 'italian'
        })
      });

      console.log('Risposta server (status):', response.status);
      
      // Log della risposta completa per debug
      const responseText = await response.text();
      console.log('Risposta server (testo):', responseText);
      
      // Se la risposta è vuota o non è JSON valido, gestiamo l'errore
      if (!responseText) {
        throw new Error('Risposta vuota dal server');
      }
      
      // Riconverti in JSON per gestire la risposta
      const data = JSON.parse(responseText);

      if (!response.ok) {
        throw new Error(`Errore nell'invio dell'email: ${data.message || response.statusText}`);
      }

      if (!data.success) {
        throw new Error(data.message || 'Errore sconosciuto');
      }
      
      toast({
        title: "Email inviata",
        description: "L'email con il documento è stata inviata con successo.",
      });
      
      setStep('success');
      
      // Salva la richiesta di firma nel backend
      try {
        await fetch(`/api/signature-requests`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            clientId,
            documentUrl,
            type: 'traditional',
            status: 'sent',
            sentAt: new Date().toISOString()
          })
        });
      } catch (error) {
        console.error('Error saving signature request:', error);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Errore",
        description: `Si è verificato un errore durante l'invio dell'email: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`,
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setTimeout(() => {
        setStep('initial');
      }, 300);
    }
  }, [open]);

  // Content for different steps
  const renderContent = () => {
    switch (step) {
      case 'initial':
        return (
          <>
            <DialogHeader>
              <DialogTitle>{t('client.traditional_signature')}</DialogTitle>
              <DialogDescription>
                Invia il documento MIFID al cliente per la firma tradizionale.
              </DialogDescription>
            </DialogHeader>

            <div className="py-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Documento da firmare</CardTitle>
                  <CardDescription>
                    Invierai il seguente documento per la firma:
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-4 p-4 border rounded-md">
                    <FileText className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="font-medium">Questionario MIFID</p>
                      <p className="text-sm text-gray-500">Cliente: {clientName}</p>
                    </div>
                  </div>
                  
                  <div className="text-sm space-y-2">
                    <p className="font-medium">Come funziona:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Invierai il documento al cliente via email</li>
                      <li>Il cliente stamperà e firmerà il documento</li>
                      <li>Il cliente ti restituirà il documento firmato</li>
                      <li>Potrai archiviare il documento firmato nel sistema</li>
                    </ol>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={prepareEmailTemplate}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Preparazione email...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Prepara Email con Documento
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </>
        );
      
      case 'email-preview':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Anteprima Email</DialogTitle>
              <DialogDescription>
                Personalizza l'email che verrà inviata a {clientName} con il documento da firmare.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div>
                <label htmlFor="emailSubject" className="block text-sm font-medium mb-1">
                  Oggetto
                </label>
                <Input
                  id="emailSubject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div>
                <label htmlFor="emailBody" className="block text-sm font-medium mb-1">
                  Testo Email
                </label>
                <Textarea
                  id="emailBody"
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={10}
                  className="w-full resize-none"
                />
              </div>
              
              <div className="text-sm bg-slate-50 p-3 rounded-md border border-slate-200">
                <p>Il documento da firmare sarà inviato come allegato all'email.</p>
                <p className="font-medium">Destinatario: {clientEmail}</p>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setStep('initial')}
              >
                Indietro
              </Button>
              
              <Button
                onClick={sendEmail}
                disabled={isSending}
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Invio in corso...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Invia Email
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        );
      
      case 'success':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Email Inviata con Successo</DialogTitle>
              <DialogDescription>
                Il documento è stato inviato al cliente per la firma.
              </DialogDescription>
            </DialogHeader>

            <div className="py-8 flex flex-col items-center space-y-4">
              <div className="rounded-full bg-green-100 p-3">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-center">
                Il documento è stato inviato via email a {clientEmail}. <br/>
                Attendi che il cliente restituisca il documento firmato.
              </p>
            </div>

            <DialogFooter>
              <Button 
                onClick={() => onOpenChange(false)}
              >
                Chiudi
              </Button>
            </DialogFooter>
          </>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
} 