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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Camera, FileText, Check, AlertTriangle, Smartphone, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

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
  const [step, setStep] = useState<'initial' | 'email-preview' | 'desktop-qr' | 'success' | 'error'>('initial');
  const [sessionUrl, setSessionUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Email state
  const [emailSubject, setEmailSubject] = useState<string>(`${t('client.digital_signature')} - Documento MIFID`);
  const [emailBody, setEmailBody] = useState<string>("");

  // Generate a secure link for mobile verification
  const generateSecureLink = async () => {
    setIsLoading(true);
    try {
      // Debug per verificare documentUrl
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
      
      // Move to email preview step
      setStep('email-preview');
      
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

  // Handle sending email
  const handleSendEmail = async () => {
    setIsSending(true);
    try {
      // Invia l'email con il link per la firma digitale
      const response = await fetch(`/api/clients/${clientId}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject: emailSubject,
          message: emailBody,
          language: 'italian'
        })
      });

      if (!response.ok) {
        throw new Error('Errore nell\'invio dell\'email');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Errore sconosciuto');
      }
      
      toast({
        title: "Email inviata",
        description: "L'email con il link per la firma digitale è stata inviata con successo."
      });
      
      // Chiudiamo direttamente il dialog dopo l'invio dell'email
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Errore",
        description: "Impossibile inviare l'email. Riprova più tardi.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
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
      }, 300);
    }
  }, [open]);

  // content for different steps
  const renderContent = () => {
    switch (step) {
      case 'initial':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Invio Email per Firma Digitale</DialogTitle>
              <DialogDescription>
                Invia un'email al cliente con un link per la firma sicura tramite riconoscimento facciale.
              </DialogDescription>
            </DialogHeader>

            <div className="py-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Documento da firmare</CardTitle>
                  <CardDescription>
                    Prepara l'email con il link per la firma digitale del seguente documento:
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
                      <li>Prepara e personalizza l'email con il link sicuro</li>
                      <li>Invia l'email al cliente</li>
                      <li>Il cliente apre il link sul proprio smartphone</li>
                      <li>Carica un documento d'identità (fronte/retro)</li>
                      <li>Fa un selfie per verificare la sua identità</li>
                      <li>Conferma la firma</li>
                    </ol>
                  </div>
                  
                  <div className="p-3 mt-4 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
                    <p className="font-medium">Nota</p>
                    <p>Per visualizzare la pagina di firma, il cliente dovrà aprire il link ricevuto via email con il suo smartphone.</p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={generateSecureLink}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generazione sessione...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Prepara Email con Link Firma Digitale
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
                Personalizza l'email che verrà inviata a {clientName} con il link per la firma digitale.
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
                <p>Il link per la firma digitale è incluso nel testo dell'email.</p>
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
                onClick={handleSendEmail}
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
      
      case 'desktop-qr':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Scansiona il QR Code</DialogTitle>
              <DialogDescription>
                Utilizza il tuo smartphone per scansionare il codice QR e completare la verifica.
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 flex flex-col items-center space-y-6">
              <div className="p-4 bg-white rounded-md">
                <QRCodeSVG 
                  value={sessionUrl} 
                  size={256}
                  level="H"
                  includeMargin={true}
                />
              </div>
              
              <div className="text-center text-sm space-y-2">
                <p className="font-medium">Non riesci a scansionare il codice?</p>
                <p className="text-muted-foreground">
                  <a 
                    href={sessionUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    Apri il link sul tuo smartphone
                  </a>
                </p>
              </div>
              
              <Card className="w-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Stato verifica</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 bg-amber-500 rounded-full animate-pulse"></div>
                    <span className="text-sm">Attesa scansione e completamento verifica...</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setStep('email-preview')}
              >
                Indietro
              </Button>
              
              {/* For demo purposes - in real app these would be triggered by backend webhooks */}
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={handleVerificationSuccess}
                  className="bg-green-500 text-white hover:bg-green-600"
                >
                  Simula Successo
                </Button>
                <Button
                  variant="outline"
                  onClick={handleVerificationError}
                  className="bg-red-500 text-white hover:bg-red-600"
                >
                  Simula Errore
                </Button>
              </div>
            </DialogFooter>
          </>
        );
      
      case 'success':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Firma completata con successo</DialogTitle>
              <DialogDescription>
                Il processo di verifica identità e firma è stato completato.
              </DialogDescription>
            </DialogHeader>

            <div className="py-8 flex flex-col items-center space-y-4">
              <div className="rounded-full bg-green-100 p-3">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-center">
                Il documento è stato firmato con successo e sarà archiviato nel sistema.
              </p>
            </div>
          </>
        );
      
      case 'error':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Verifica fallita</DialogTitle>
              <DialogDescription>
                Non è stato possibile completare il processo di verifica dell'identità.
              </DialogDescription>
            </DialogHeader>

            <div className="py-8 flex flex-col items-center space-y-4">
              <div className="rounded-full bg-red-100 p-3">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <p className="text-center">
                La verifica dell'identità non è andata a buon fine. Puoi riprovare o utilizzare un metodo di firma alternativo.
              </p>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setStep('initial')}
              >
                Riprova
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