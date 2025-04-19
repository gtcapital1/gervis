import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
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
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AlertCircle, CalendarClock } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import ClientLogList, { ClientLog } from "@/components/ClientLogList";

// Form schema per i log
const logFormSchema = z.object({
  type: z.enum(["note", "call", "meeting"], {
    required_error: "Seleziona il tipo di log",
  }),
  title: z.string().min(1, {
    message: "Il titolo è obbligatorio",
  }),
  content: z.string().min(1, {
    message: "Il contenuto è obbligatorio",
  }),
  emailSubject: z.string().optional(),
  emailRecipients: z.string().optional(),
  logDate: z.date().default(() => {
    const date = new Date();
    date.setHours(10, 0, 0, 0);
    return date;
  }),
  clientId: z.number(),
  createdBy: z.number().optional(),
});

type LogFormValues = z.infer<typeof logFormSchema>;

// Tipo per i dettagli del cliente
type Client = {
  id: number;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
};

export default function ClientLogs() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { id } = useParams<{ id: string }>();
  const clientId = parseInt(id);
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Form per la creazione di log
  const form = useForm<LogFormValues>({
    resolver: zodResolver(logFormSchema),
    defaultValues: {
      type: "call",
      title: "",
      content: "",
      emailSubject: "",
      emailRecipients: "",
      logDate: (() => {
        const date = new Date();
        date.setHours(10, 0, 0, 0);
        return date;
      })(),
      clientId: clientId,
      createdBy: undefined,
    },
  });

  // Query per recuperare i dettagli del cliente
  const clientQuery = useQuery({
    queryKey: ["/api/clients", clientId],
    queryFn: () => apiRequest(`/api/clients/${clientId}`),
  });

  // Query per recuperare i log del cliente
  const logsQuery = useQuery({
    queryKey: ["/api/client-logs", clientId],
    queryFn: () => apiRequest(`/api/client-logs/${clientId}`),
  });

  // Mutazione per creare un nuovo log
  const createLogMutation = useMutation({
    mutationFn: (data: LogFormValues) => {
      // Assicuriamoci che la data venga serializzata correttamente per JSON
      return apiRequest("/api/client-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          // Convertiamo esplicitamente la data in formato ISO per garantire che arrivi correttamente al server
          logDate: data.logDate.toISOString()
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Log creato",
        description: "Il log è stato creato con successo",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/client-logs", clientId] });
      form.reset();
      setIsAddDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: `Errore durante la creazione del log: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Funzione per gestire la sottomissione del form
  function onSubmit(data: LogFormValues) {
    createLogMutation.mutate(data);
  }

  // Reset del form quando si apre il dialog di creazione
  useEffect(() => {
    if (isAddDialogOpen) {
      form.reset({
        type: "call",
        title: "", 
        content: "",
        emailSubject: "",
        emailRecipients: "",
        logDate: (() => {
          const date = new Date();
          date.setHours(10, 0, 0, 0);
          return date;
        })(),
        clientId: clientId,
        createdBy: undefined,
      });
    }
  }, [isAddDialogOpen, clientId, form]);

  // Imposta l'ora a 10:00 quando si cambia la data del calendario
  const handleCalendarSelect = (date: Date, field: any) => {
    // Mantieni l'ora corrente se già impostata, altrimenti imposta alle 10:00
    const currentHours = field.value ? field.value.getHours() : 10;
    const currentMinutes = field.value ? field.value.getMinutes() : 0;
    
    date.setHours(currentHours, currentMinutes, 0, 0);
    field.onChange(date);
  };

  if (clientQuery.isLoading || logsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (clientQuery.error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-xl font-semibold">Errore nel caricamento del cliente</h1>
        <p>{(clientQuery.error as Error).message}</p>
      </div>
    );
  }

  const client = clientQuery.data?.client as Client;
  const logs = logsQuery.data?.logs as ClientLog[] || [];

  return (
    <div className="container mx-auto py-6 px-6 md:px-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">
            {t("Interazioni cliente")} - {client.firstName} {client.lastName}
          </h1>
          <p className="text-muted-foreground">{client.email}</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>{t("Aggiungi Log")}</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t("Aggiungi nuovo log")}</DialogTitle>
              <DialogDescription>
                {t("Registra una nuova interazione con il cliente")}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Tipo di interazione")}</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("Seleziona un tipo di interazione")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="call">{t("Chiamata")}</SelectItem>
                          <SelectItem value="meeting">{t("Incontro")}</SelectItem>
                          <SelectItem value="note">{t("Nota")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {field.value === "note" ? 
                          t("Le note non vengono conteggiate nelle statistiche di interazione") : 
                          t("Seleziona il tipo di interazione con il cliente")}
                      </FormDescription>
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
                        <Input placeholder={t("Inserisci un titolo")} {...field} />
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
                          placeholder={t("Descrivi l'interazione")}
                          className="min-h-[200px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {t("Inserisci tutti i dettagli rilevanti dell'interazione")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="logDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t("Data dell'interazione")}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP HH:mm", { locale: it })
                              ) : (
                                <span>{t("Seleziona una data e ora")}</span>
                              )}
                              <CalendarClock className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <div className="p-2">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => date && handleCalendarSelect(date, field)}
                              initialFocus
                            />
                            <div className="flex items-center justify-between mt-4 px-3">
                              <div className="grid gap-1">
                                <label className="text-sm font-medium">{t("Ora")}</label>
                                <select 
                                  className="border border-input bg-background rounded p-1"
                                  value={field.value ? field.value.getHours() : 12}
                                  onChange={(e) => {
                                    const date = new Date(field.value || new Date());
                                    date.setHours(parseInt(e.target.value));
                                    field.onChange(date);
                                  }}
                                >
                                  {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                                    <option key={hour} value={hour}>{hour.toString().padStart(2, '0')}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="grid gap-1">
                                <label className="text-sm font-medium">{t("Minuti")}</label>
                                <select
                                  className="border border-input bg-background rounded p-1"
                                  value={field.value ? field.value.getMinutes() : 0}
                                  onChange={(e) => {
                                    const date = new Date(field.value || new Date());
                                    date.setMinutes(parseInt(e.target.value));
                                    field.onChange(date);
                                  }}
                                >
                                  {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                                    <option key={minute} value={minute}>{minute.toString().padStart(2, '0')}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        {t("Data e ora dell'interazione con il cliente")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <input type="hidden" {...form.register("clientId")} />
                <DialogFooter>
                  <Button type="submit" disabled={createLogMutation.isPending}>
                    {createLogMutation.isPending ? t("Salvataggio...") : t("Salva")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Use the ClientLogList component instead of rendering logs directly */}
      <ClientLogList 
        logs={logs} 
        clientId={clientId}
        showAddButton={true}
        onAddLog={() => setIsAddDialogOpen(true)}
      />
    </div>
  );
}