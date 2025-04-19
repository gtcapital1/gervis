import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, CalendarClock, MessageSquare } from "lucide-react";

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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// Form validation
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// Form schema per la creazione di log
const logFormSchema = z.object({
  type: z.enum(["email", "note", "call", "meeting"]),
  title: z.string().min(1, { message: "Il titolo è obbligatorio" }),
  content: z.string().min(1, { message: "Il contenuto è obbligatorio" }),
  emailSubject: z.string().optional(),
  emailRecipients: z.string().optional(),
  logDate: z.date().default(() => new Date()),
  clientId: z.number(),
  createdBy: z.number().optional(),
});

type LogFormValues = z.infer<typeof logFormSchema>;

interface AddLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
}

export default function AddLogDialog({ open, onOpenChange, clientId }: AddLogDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form per la creazione di log
  const form = useForm<LogFormValues>({
    resolver: zodResolver(logFormSchema),
    defaultValues: {
      type: "call",
      title: "",
      content: "",
      emailSubject: "",
      emailRecipients: "",
      logDate: new Date(),
      clientId: clientId,
      createdBy: undefined,
    },
  });

  // Mutazione per creare un nuovo log
  const createLogMutation = useMutation({
    mutationFn: (data: LogFormValues) => {
      return apiRequest("/api/client-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          logDate: data.logDate.toISOString()
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-logs", clientId] });
      toast({
        title: t('Log creato'),
        description: t('Il log è stato creato con successo'),
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: t('Errore'),
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  // Funzione per gestire la sottomissione del form di log
  function onSubmitLog(data: LogFormValues) {
    createLogMutation.mutate(data);
  }

  // Reinizializzare il form quando si apre il dialog
  useEffect(() => {
    if (open) {
      form.reset({
        type: "call",
        title: "",
        content: "",
        emailSubject: "",
        emailRecipients: "",
        logDate: new Date(),
        clientId: clientId,
        createdBy: undefined,
      });
    }
  }, [open, clientId, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("Aggiungi nuova interazione")}</DialogTitle>
          <DialogDescription>
            {t("Registra una nuova interazione con il cliente")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmitLog)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Tipo di interazione")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("Seleziona un tipo")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="email">{t("Email")}</SelectItem>
                      <SelectItem value="call">{t("Chiamata")}</SelectItem>
                      <SelectItem value="meeting">{t("Incontro")}</SelectItem>
                      <SelectItem value="note">{t("Nota")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Titolo")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("Titolo dell'interazione")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Contenuto")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("Descrivi l'interazione con il cliente")}
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("type") === "email" && (
              <>
                <FormField
                  control={form.control}
                  name="emailSubject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Oggetto email")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("Oggetto dell'email")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emailRecipients"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Destinatari")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("Destinatari dell'email")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="logDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t("Data")}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="pl-3 text-left font-normal"
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: it })
                          ) : (
                            <span>{t("Seleziona una data")}</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                {t("Annulla")}
              </Button>
              <Button type="submit" disabled={createLogMutation.isPending}>
                {createLogMutation.isPending ? t("Salvataggio...") : t("Salva")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 