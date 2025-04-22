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
import { Loader2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { EmailDialog } from "@/components/dialog";
import { EmailFormData } from "@/types/email";

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
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  
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

      // Apri direttamente il dialog Email
      setIsEmailDialogOpen(true);
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

  // Quando il componente viene montato, prepara subito il template email
  useEffect(() => {
    if (open) {
      prepareEmailTemplate();
    }
  }, [open]);

  // Gestisce l'invio dell'email attraverso EmailDialog
  const handleSendEmail = async (data: EmailFormData) => {
    try {
      setIsLoading(true);
      
      // Verifica che l'URL del documento sia disponibile
      if (!documentUrl) {
        throw new Error("URL del documento non disponibile");
      }

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
      
      // Mostra un toast di conferma
      toast({
        title: "Email inviata",
        description: "L'email con il documento è stata inviata con successo.",
      });
      
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
      
      // Chiudi il dialog principale
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Errore",
        description: `Si è verificato un errore durante l'invio dell'email: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setTimeout(() => {
        setIsEmailDialogOpen(false);
      }, 300);
    }
  }, [open]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Preparazione Email per Firma Tradizionale</DialogTitle>
            <DialogDescription>
              Preparazione del documento e dell'email in corso...
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
        clientId={Number(clientId)}
        title="Invia Email per Firma Tradizionale"
        presetSubject={emailSubject}
        presetMessage={emailBody}
        onSubmit={handleSendEmail}
        useClientSelector={true}
        attachmentUrl={documentUrl}
        includeCustomFooter={false}
      />
    </>
  );
} 