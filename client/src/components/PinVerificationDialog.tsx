import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, CheckCircle2 } from "lucide-react";

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

  const [verificationSuccessful, setVerificationSuccessful] = useState(false);

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
        setVerificationSuccessful(true);
        
        // Notifica all'utente che la verifica è stata completata
        toast({
          title: t('approval.email_confirmation'),
          description: `${t('approval.email_sent_to')} ${email}`,
          variant: "default",
          duration: 5000,
        });
        
        // Mostri un toast più a lungo per enfatizzare il messaggio di approvazione in attesa
        setTimeout(() => {
          toast({
            title: t('approval.title'),
            description: t('approval.status_message'),
            variant: "default",
            duration: 8000,
          });
        }, 1000);
        
        // Chiudi il dialog e chiama onSuccess per reindirizzare l'utente
        setTimeout(() => {
          onSuccess();
        }, 2000);
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
        {verificationSuccessful ? (
          // Schermata di successo
          <>
            <DialogHeader>
              <DialogTitle>{t('approval.email_confirmation')}</DialogTitle>
              <DialogDescription>
                {t('approval.email_sent_to')} <span className="font-medium">{email}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center py-6">
              <div className="rounded-full bg-green-100 p-3 mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium mb-2">{t('approval.title')}</h3>
              <p className="text-center text-gray-500 mb-4">
                {t('approval.status_message')}
              </p>
              <p className="text-center text-sm text-gray-500">
                {t('approval.next_steps')}
              </p>
            </div>
          </>
        ) : (
          // Form di verifica
          <>
            <DialogHeader>
              <DialogTitle>{t('verification.title') || 'Verifica il tuo indirizzo email'}</DialogTitle>
              <DialogDescription>
                {t('verification.description')?.replace('{email}', email) || 
                  `Ti abbiamo inviato un codice PIN di 4 cifre all'indirizzo ${email}. Inserisci il codice per completare la verifica.`}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="pin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('verification.pin_code') || 'Codice PIN'}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('verification.pin_placeholder') || "Inserisci il PIN a 4 cifre"}
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
                        {t('verification.verifying') || 'Verifica in corso...'}
                      </>
                    ) : (
                      t('verification.verify') || 'Verifica PIN'
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
                        {t('verification.sending') || 'Invio in corso...'}
                      </>
                    ) : (
                      t('verification.resend') || 'Invia nuovo PIN'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}