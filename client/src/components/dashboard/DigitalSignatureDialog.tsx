import React, { useState, useEffect } from "react";
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
import { Loader2, Camera, FileText, Check, AlertTriangle, Smartphone, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";
import { EmailDialog } from "@/components/dialog";
import { EmailFormData } from "@/types/email";

interface DigitalSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  clientId: number;
  clientEmail?: string;
  documentUrl?: string;
}

export function DigitalSignatureDialog({
  open,
  onOpenChange,
  clientName,
  clientId,
  clientEmail = "",
  documentUrl
}: DigitalSignatureDialogProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [step, setStep] = useState<'initial' | 'email' | 'desktop-qr' | 'success' | 'error'>('initial');
  const [sessionUrl, setSessionUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  
  // Email state
  const [emailSubject, setEmailSubject] = useState<string>(`${t('client.digital_signature')} - Documento MIFID`);
  const [emailBody, setEmailBody] = useState<string>("");

  // Generate a secure link for mobile verification
  const generateSecureLink = async () => {
    setIsLoading(true);
    try {
      console.log('[DEBUG DigitalSignatureDialog] documentUrl ricevuto:', { 
        documentUrl, 
        documentUrlType: typeof documentUrl,
        hasDocumentUrl: !!documentUrl
      });
      
      // Chiamata all'API per generare una sessione di firma digitale
      const response = await fetch(`/api/signature-sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientId,
          documentUrl
        })
      });

      if (!response.ok) {
        throw new Error('Errore nella generazione della sessione di firma');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Errore sconosciuto');
      }
      
      // Use window.location.origin instead of hardcoded domain
      const origin = window.location.origin;
      const generatedUrl = `${origin}/id/${data.sessionId}?token=${data.token}`;
      setSessionUrl(generatedUrl);
      
      // Initialize default email
      setEmailBody(`Gentile ${clientName},

Le invio il link per procedere con la firma digitale tramite riconoscimento facciale del documento MIFID.

Il processo è semplice e sicuro:
1. Clicchi sul link qui sotto
2. Segua le istruzioni per caricare un documento d'identità valido (fronte/retro)
3. Effettui una breve procedura di riconoscimento facciale
4. Completi la firma digitale

Link per la firma digitale: ${generatedUrl}

Il link è personale e valido per 24 ore.

Per qualsiasi domanda o necessità di assistenza, non esiti a contattarmi.

Cordiali saluti,`);
      
      // Apri direttamente il dialog email invece di mostrare l'anteprima
      setIsEmailDialogOpen(true);
    } catch (error) {
      console.error('Error generating secure link:', error);
      toast({
        title: "Errore",
        description: "Impossibile generare il link per la firma. Riprova più tardi.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Quando il componente viene montato, genera subito il link sicuro
  useEffect(() => {
    if (open) {
      generateSecureLink();
    }
  }, [open]);

  // Gestisce l'invio dell'email attraverso EmailDialog
  const handleSendEmail = async (data: EmailFormData) => {
    try {
      setIsLoading(true);
      
      // Send the actual email
      const response = await fetch(`/api/clients/${data.clientId}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject: data.subject,
          message: data.message,
          recipientEmail: data.recipientEmail,
          attachmentUrl: data.attachmentUrl,
          includeAttachment: data.includeAttachment
        })
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || 'Error sending email');
      }
      
      // Show success toast if API call was successful
      toast({
        title: "Email inviata",
        description: "L'email con il link per la firma digitale è stata inviata con successo."
      });
      
      // Chiudi il dialog principale
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Errore nell'invio dell'email",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante l'invio dell'email",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle successful verification
  const handleVerificationSuccess = () => {
    setStep('success');
    toast({
      title: "Firma completata",
      description: "Il documento è stato firmato con successo tramite riconoscimento facciale."
    });
    
    // After a short delay, close the dialog
    setTimeout(() => {
      onOpenChange(false);
    }, 3000);
  };

  // Handle verification error
  const handleVerificationError = () => {
    setStep('error');
    toast({
      title: "Verifica fallita",
      description: "Il riconoscimento facciale non è andato a buon fine. Prova di nuovo o utilizza un altro metodo di firma.",
      variant: "destructive"
    });
  };

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setTimeout(() => {
        setStep('initial');
        setSessionUrl("");
        setIsEmailDialogOpen(false);
      }, 300);
    }
  }, [open]);

  // Mostra EmailDialog
        return (
          <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
            <DialogTitle>Preparazione Email di Firma Digitale</DialogTitle>
              <DialogDescription>
              Generazione del link sicuro per la firma digitale in corso...
              </DialogDescription>
            </DialogHeader>
          <div className="py-6 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
      </DialogContent>
    </Dialog>

      {/* Nuovo EmailDialog per l'invio della mail */}
      <EmailDialog
        open={isEmailDialogOpen}
        onOpenChange={(open) => {
          setIsEmailDialogOpen(open);
          if (!open) {
            // Se chiudiamo EmailDialog, chiudi anche il dialog principale
            onOpenChange(false);
          }
        }}
        clientId={clientId}
        title="Invia Email per Firma Digitale"
        presetSubject={emailSubject}
        presetMessage={emailBody}
        onSubmit={handleSendEmail}
        useClientSelector={true}
      />
    </>
  );
} 