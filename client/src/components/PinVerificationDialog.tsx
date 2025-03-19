import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Form schema
const pinVerificationSchema = z.object({
  pin: z.string().length(4, {
    message: "Il PIN deve essere di 4 cifre",
  }),
});

type PinVerificationFormValues = z.infer<typeof pinVerificationSchema>;

interface PinVerificationDialogProps {
  open: boolean;
  email: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function PinVerificationDialog({
  open,
  email,
  onSuccess,
  onClose
}: PinVerificationDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const form = useForm<PinVerificationFormValues>({
    resolver: zodResolver(pinVerificationSchema),
    defaultValues: {
      pin: "",
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset();
    }
  }, [open, form]);

  const handleResendPin = async () => {
    try {
      setIsResending(true);
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
          description: "Abbiamo inviato un nuovo PIN di verifica al tuo indirizzo email.",
          variant: "default",
        });
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
      setIsResending(false);
    }
  };

  const onSubmit = async (data: PinVerificationFormValues) => {
    try {
      setIsVerifying(true);
      const response = await apiRequest('/api/verify-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          pin: data.pin,
        }),
      });

      if (response.success) {
        // Verifica se l'utente è in attesa di approvazione
        if (response.pendingApproval) {
          toast({
            title: "Verifica completata",
            description: "Email verificata con successo. In attesa di approvazione da parte del management di Gervis.",
            variant: "default",
          });
          
          // Mostri un toast più a lungo per enfatizzare il messaggio di approvazione in attesa
          setTimeout(() => {
            toast({
              title: "Approvazione richiesta",
              description: "Il tuo account è in attesa di approvazione. Riceverai un'email quando sarà approvato.",
              variant: "default",
              duration: 10000, // 10 secondi
            });
          }, 1000);
        } else {
          toast({
            title: "Verifica completata",
            description: "Il tuo account è stato verificato con successo.",
            variant: "default",
          });
        }
        onSuccess();
      } else {
        toast({
          title: "Verifica fallita",
          description: response.message || "PIN non valido. Controlla la tua email e riprova.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la verifica del PIN.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Verifica il tuo indirizzo email</DialogTitle>
          <DialogDescription>
            Ti abbiamo inviato un codice PIN di 4 cifre all'indirizzo {email}. Inserisci il codice per completare la verifica.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="pin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Codice PIN</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Inserisci il PIN a 4 cifre"
                      {...field}
                      maxLength={4}
                      className="text-center text-lg letter-spacing-2"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                className="w-full"
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifica in corso...
                  </>
                ) : (
                  "Verifica PIN"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleResendPin}
                disabled={isResending}
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Invio in corso...
                  </>
                ) : (
                  "Invia nuovo PIN"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}