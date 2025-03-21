import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Mail, Phone, CalendarClock, MessageSquare, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// Form schema per i log
const logFormSchema = z.object({
  type: z.enum(["email", "call", "meeting"], {
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
  logDate: z.date().default(() => new Date()),
  clientId: z.number(),
  createdBy: z.number().optional(),
});

type LogFormValues = z.infer<typeof logFormSchema>;

// Tipo per i log dei clienti
type ClientLog = {
  id: number;
  clientId: number;
  type: "email" | "note" | "call" | "meeting";
  title: string;
  content: string;
  emailSubject?: string | null;
  emailRecipients?: string | null;
  logDate: string;
  createdAt: string;
  createdBy?: number | null;
};

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
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Form per la creazione/modifica di log
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
      return apiRequest("/api/client-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
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

  // Mutazione per eliminare un log
  const deleteLogMutation = useMutation({
    mutationFn: (logId: number) => {
      return apiRequest(`/api/client-logs/${logId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Log eliminato",
        description: "Il log è stato eliminato con successo",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/client-logs", clientId] });
      setIsDeleteDialogOpen(false);
      setSelectedLogId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: `Errore durante l'eliminazione del log: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Funzione per gestire la sottomissione del form
  function onSubmit(data: LogFormValues) {
    createLogMutation.mutate(data);
  }

  // Apertura dialog per eliminazione con conferma
  function handleDeleteClick(logId: number) {
    setSelectedLogId(logId);
    setIsDeleteDialogOpen(true);
  }

  // Conferma eliminazione
  function confirmDelete() {
    if (selectedLogId) {
      deleteLogMutation.mutate(selectedLogId);
    }
  }

  // Funzione per formattare la data
  function formatDate(dateString: string) {
    try {
      const date = new Date(dateString);
      return format(date, "dd MMMM yyyy, HH:mm", { locale: it });
    } catch (e) {
      return dateString;
    }
  }

  // Funzione per ottenere l'icona in base al tipo di log
  function getLogTypeIcon(type: string) {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "call":
        return <Phone className="h-4 w-4" />;
      case "meeting":
        return <CalendarClock className="h-4 w-4" />;
      case "note":
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  }

  // Funzione per ottenere il colore della badge in base al tipo di log
  function getLogTypeBadgeVariant(type: string) {
    switch (type) {
      case "email":
        return "default";
      case "call":
        return "outline";
      case "meeting":
        return "secondary";
      case "note":
      default:
        return "destructive";
    }
  }

  // Traduzioni per i tipi di log
  function getLogTypeTranslation(type: string) {
    switch (type) {
      case "email":
        return t("Email");
      case "call":
        return t("Chiamata");
      case "meeting":
        return t("Incontro");
      case "note":
      default:
        return t("Nota");
    }
  }

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
            {t("Log del cliente")} - {client.firstName} {client.lastName}
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
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("Seleziona un tipo di interazione")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="email">{t("Email")}</SelectItem>
                          <SelectItem value="call">{t("Chiamata")}</SelectItem>
                          <SelectItem value="meeting">{t("Incontro")}</SelectItem>
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
                
                {form.watch("type") === "email" && (
                  <>
                    <FormField
                      control={form.control}
                      name="emailSubject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("Oggetto dell'email")}</FormLabel>
                          <FormControl>
                            <Input placeholder={t("Inserisci l'oggetto dell'email")} {...field} />
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
                            <Input placeholder={t("email@esempio.com, altro@esempio.com")} {...field} />
                          </FormControl>
                          <FormDescription>
                            {t("Separare gli indirizzi email con una virgola")}
                          </FormDescription>
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
                              onSelect={field.onChange}
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

      {logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-10">
            <MessageSquare className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-xl font-semibold text-center">
              {t("Nessun log disponibile")}
            </p>
            <p className="text-muted-foreground text-center mt-2">
              {t("Non ci sono ancora interazioni registrate per questo cliente")}
            </p>
            <Button
              className="mt-4"
              onClick={() => setIsAddDialogOpen(true)}
            >
              {t("Aggiungi il primo log")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {logs.map((log) => (
            <Card key={log.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Badge variant={getLogTypeBadgeVariant(log.type) as any} className="flex items-center gap-1">
                      {getLogTypeIcon(log.type)}
                      {getLogTypeTranslation(log.type)}
                    </Badge>
                    <CardTitle className="text-xl">{log.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(log.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <CardDescription>{formatDate(log.createdAt)}</CardDescription>
              </CardHeader>
              <CardContent className="whitespace-pre-line">
                {log.content}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Conferma eliminazione")}</DialogTitle>
            <DialogDescription>
              {t("Sei sicuro di voler eliminare questo log? Questa azione non può essere annullata.")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              {t("Annulla")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteLogMutation.isPending}
            >
              {deleteLogMutation.isPending ? t("Eliminazione...") : t("Elimina")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}