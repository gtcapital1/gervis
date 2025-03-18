import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Mail, AlertCircle } from "lucide-react";
import { PinVerificationDialog } from "./PinVerificationDialog";

interface VerificationAlertProps {
  email: string;
}

export function VerificationAlert({ email }: VerificationAlertProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleResendVerification = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest('/api/resend-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.success) {
        toast({
          title: "PIN inviato",
          description: "Abbiamo inviato un nuovo PIN di verifica alla tua email.",
          variant: "default",
        });
        setDialogOpen(true);
      } else {
        toast({
          title: "Errore",
          description: response.message || "Si è verificato un errore durante l'invio del PIN di verifica.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'invio del PIN di verifica.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationSuccess = () => {
    toast({
      title: "Verifica completata",
      description: "Il tuo account è stato verificato con successo. Ora puoi accedere a tutte le funzionalità.",
      variant: "default",
    });
    setDialogOpen(false);
    // Aggiorniamo la pagina per riflettere il nuovo stato dell'utente
    window.location.reload();
  };

  return (
    <>
      <Alert className="mb-4 border-amber-500 bg-amber-50 text-amber-900">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Email non verificata</AlertTitle>
        <AlertDescription className="mt-2">
          Per accedere a tutte le funzionalità, verifica il tuo indirizzo email.
          Abbiamo inviato un codice PIN all'indirizzo {email}.
          <div className="mt-2">
            <Button
              size="sm"
              variant="default"
              className="mr-2"
              onClick={() => setDialogOpen(true)}
            >
              Inserisci PIN
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleResendVerification}
              disabled={isLoading}
            >
              <Mail className="mr-2 h-4 w-4" />
              {isLoading ? "Invio in corso..." : "Invia nuovo PIN"}
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      <PinVerificationDialog
        open={dialogOpen}
        email={email}
        onSuccess={handleVerificationSuccess}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}