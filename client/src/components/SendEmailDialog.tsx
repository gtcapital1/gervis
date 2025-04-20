import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Mail, Paperclip, X } from "lucide-react";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";

// Form validation
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// Form schema per l'invio di email
const emailFormSchema = z.object({
  subject: z.string().min(1, { message: "L'oggetto è obbligatorio" }),
  message: z.string().min(1, { message: "Il messaggio è obbligatorio" }),
  language: z.literal("italian").default("italian"),
  includeAttachment: z.boolean().default(false),
  attachmentUrl: z.string().optional(),
});

type EmailFormValues = z.infer<typeof emailFormSchema>;

interface SendEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
  clientName: string;
  clientEmail: string;
  attachmentUrl?: string;
}

export default function SendEmailDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  clientEmail,
  attachmentUrl
}: SendEmailDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isSending, setIsSending] = useState(false);

  // Form per l'invio di email
  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      subject: "",
      message: "",
      language: "italian",
      includeAttachment: !!attachmentUrl,
      attachmentUrl: attachmentUrl || "",
    },
  });

  // Mutazione per inviare email
  const sendEmailMutation = useMutation({
    mutationFn: (data: EmailFormValues) => {
      setIsSending(true);
      return apiRequest(`/api/clients/${clientId}/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      // Aggiorna la lista dei logs
      queryClient.invalidateQueries({ queryKey: ["/api/client-logs", clientId] });
      
      toast({
        title: t('Email inviata'),
        description: t('L\'email è stata inviata con successo'),
      });
      
      form.reset();
      onOpenChange(false);
      setIsSending(false);
    },
    onError: (error: any) => {
      setIsSending(false);
      
      // Estrai eventuali dettagli specifici dell'errore se disponibili
      let errorMessage = (error as Error).message;
      
      // Controlla se c'è un errore di configurazione email
      if (error.configurationRequired) {
        errorMessage = t('È necessario configurare un server SMTP nelle impostazioni utente per inviare email');
      }
      
      toast({
        title: t('Errore nell\'invio dell\'email'),
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Funzione per gestire la sottomissione del form
  function onSubmitEmail(data: EmailFormValues) {
    sendEmailMutation.mutate(data);
  }

  // Reinizializzare il form quando si apre il dialog
  useEffect(() => {
    if (open) {
      form.reset({
        subject: "",
        message: "",
        language: "italian",
        includeAttachment: !!attachmentUrl,
        attachmentUrl: attachmentUrl || "",
      });
    }
  }, [open, attachmentUrl, form]);



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t("Invia email al cliente")}</DialogTitle>
          <DialogDescription>
            {t("L'email verrà inviata a")}: {clientEmail}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmitEmail)} className="space-y-4">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Oggetto")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("Oggetto dell'email")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Messaggio")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("Scrivi il contenuto dell'email")}
                      className="min-h-[200px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {attachmentUrl && (
              <FormField
                control={form.control}
                name="includeAttachment"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>{t("Includi allegato")}</FormLabel>
                      <FormDescription>
                        {attachmentUrl.split('/').pop()}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                {t("Annulla")}
              </Button>
              <Button 
                type="submit" 
                disabled={isSending}
                className="gap-2"
              >
                <Mail className="h-4 w-4" />
                {isSending ? t("Invio in corso...") : t("Invia email")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 