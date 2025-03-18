import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircle, CheckCircle } from "lucide-react";

interface VerificationAlertProps {
  email: string;
}

export function VerificationAlert({ email }: VerificationAlertProps) {
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleResendVerification = async () => {
    try {
      setIsResending(true);
      const response = await apiRequest('/api/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.success) {
        setIsSent(true);
        toast({
          title: "Email inviata",
          description: "Abbiamo inviato una nuova email di verifica al tuo indirizzo.",
          variant: "default",
        });
      } else {
        toast({
          title: "Errore",
          description: response.message || "Si è verificato un errore durante l'invio dell'email di verifica.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'invio dell'email di verifica.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Verifica richiesta</AlertTitle>
      <AlertDescription>
        <p className="mb-4">
          Devi verificare il tuo indirizzo email prima di poter accedere. 
          Controlla la tua casella di posta elettronica.
        </p>
        {isSent ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>Email di verifica inviata</span>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={handleResendVerification}
            disabled={isResending}
            className="bg-white hover:bg-gray-100"
          >
            {isResending ? "Invio in corso..." : "Invia nuovamente l'email di verifica"}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}