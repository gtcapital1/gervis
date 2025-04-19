import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Icons
import { AlertCircle, Mail, Phone, CalendarClock, MessageSquare, Trash2, Edit, Plus } from "lucide-react";

// Form validation
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// CSS per animazioni
import "@/styles/animations.css";

// Types
export type ClientLog = {
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

// Log form schema
const logFormSchema = z.object({
  type: z.enum(["email", "note", "call", "meeting"]),
  title: z.string().min(1, { message: "Il titolo è obbligatorio" }),
  content: z.string().min(1, { message: "Il contenuto è obbligatorio" }),
  emailSubject: z.string().optional(),
  emailRecipients: z.string().optional(),
  logDate: z.date(),
  clientId: z.number(),
  createdBy: z.number().optional(),
});

type LogFormValues = z.infer<typeof logFormSchema>;

interface ClientLogListProps {
  logs: ClientLog[];
  clientId: number;
  showAddButton?: boolean;
  onAddLog?: () => void;
}

export default function ClientLogList({ 
  logs, 
  clientId, 
  showAddButton = false,
  onAddLog
}: ClientLogListProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<ClientLog | null>(null);
  
  // Stato per tracciare l'ID del log espanso (al click invece che all'hover)
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  // Form for log editing
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
  
  // Funzione per gestire il click sulla card
  const handleCardClick = (logId: number) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  // Delete log mutation
  const deleteLogMutation = useMutation({
    mutationFn: (logId: number) => apiRequest(`/api/client-logs/${logId}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-logs", clientId] });
      toast({
        title: t("Log eliminato"),
        description: t("Il log è stato eliminato con successo"),
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: t("Errore"),
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  // Update log mutation
  const updateLogMutation = useMutation({
    mutationFn: (data: LogFormValues) => {
      if (!editingLog) return Promise.reject("No log selected for editing");
      return apiRequest(`/api/client-logs/${editingLog.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-logs", clientId] });
      toast({
        title: t("Log aggiornato"),
        description: t("Il log è stato aggiornato con successo"),
      });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: t("Errore"),
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleDeleteClick = (logId: number) => {
    setSelectedLogId(logId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedLogId) {
      deleteLogMutation.mutate(selectedLogId);
    }
  };

  const handleEditClick = (log: ClientLog) => {
    setEditingLog(log);
    form.reset({
      type: log.type,
      title: log.title,
      content: log.content,
      emailSubject: log.emailSubject || "",
      emailRecipients: log.emailRecipients || "",
      logDate: new Date(log.logDate),
      clientId: log.clientId,
      createdBy: log.createdBy || undefined,
    });
    setIsEditDialogOpen(true);
  };

  const onSubmitEdit = (data: LogFormValues) => {
    updateLogMutation.mutate(data);
  };

  // Helper functions
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "d MMMM yyyy, HH:mm", { locale: it });
  };

  const getLogTypeIcon = (type: ClientLog["type"]) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "call":
        return <Phone className="h-4 w-4" />;
      case "meeting":
        return <CalendarClock className="h-4 w-4" />;
      case "note":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getLogTypeTranslation = (type: ClientLog["type"]) => {
    switch (type) {
      case "email":
        return t("Email");
      case "call":
        return t("Chiamata");
      case "meeting":
        return t("Incontro");
      case "note":
        return t("Nota");
      default:
        return type;
    }
  };

  const getLogTypeColor = (type: ClientLog["type"]) => {
    switch (type) {
      case "email":
        return "bg-sky-500";
      case "call":
        return "bg-blue-500";
      case "meeting":
        return "bg-purple-500";
      case "note":
        return "bg-amber-500";
      default:
        return "bg-gray-500";
    }
  };

  // Raggruppa i log per mese e anno
  const groupLogsByMonth = (logs: ClientLog[]) => {
    const sorted = [...logs].sort((a, b) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime());
    const grouped: Record<string, ClientLog[]> = {};

    sorted.forEach(log => {
      const date = new Date(log.logDate);
      const monthYear = format(date, "MMMM yyyy", { locale: it });
      
      if (!grouped[monthYear]) {
        grouped[monthYear] = [];
      }
      
      grouped[monthYear].push(log);
    });

    return grouped;
  };

  const groupedLogs = groupLogsByMonth(logs);

  return (
    <>
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
            {showAddButton && (
              <Button
                className="mt-4 bg-blue-500 hover:bg-blue-600 text-white"
                onClick={onAddLog}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("Aggiungi interazione")}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          {/* Aggiungi log button */}
          {showAddButton && (
            <div className="absolute -top-14 right-0">
              <Button onClick={onAddLog} className="bg-blue-500 hover:bg-blue-600">
                <Plus className="h-4 w-4 mr-2" />
                {t("Aggiungi interazione")}
              </Button>
            </div>
          )}
          
          {/* Timeline moderna con linea continua */}
          <div className="mt-6 relative">
            {/* Linea verticale continua */}
            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200 z-0" style={{ height: "100%" }}></div>
            
            {Object.entries(groupedLogs).map(([monthYear, monthLogs]) => (
              <div key={monthYear} className="mb-8">
                {/* Data del mese fuori dalla timeline ma allineata */}
                <h3 className="text-md font-medium text-muted-foreground mb-4 pl-12">{monthYear}</h3>
                
                <div className="relative pl-12">
                  {monthLogs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    return (
                      <div 
                        key={log.id} 
                        className="mb-6 relative"
                      >
                        {/* Dot on timeline */}
                        <div className={`absolute -left-[9px] w-4 h-4 rounded-full ${getLogTypeColor(log.type)} border-2 border-white z-10`}>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help"></span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{getLogTypeTranslation(log.type)}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        
                        {/* Card with click to expand */}
                        <Card 
                          className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'shadow-md' : 'shadow-sm'} cursor-pointer`}
                          onClick={(e) => {
                            // Previene l'attivazione se si fa click sui pulsanti
                            if (!(e.target as HTMLElement).closest('button')) {
                              handleCardClick(log.id);
                            }
                          }}
                        >
                          <CardHeader className="py-3 px-4">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center space-x-2">
                                <div className="mr-2">
                                  {getLogTypeIcon(log.type)}
                                </div>
                                <div>
                                  <CardTitle className="text-base">{log.title}</CardTitle>
                                  <CardDescription className="text-xs">
                                    {format(new Date(log.logDate), "d MMM yyyy, HH:mm", { locale: it })}
                                  </CardDescription>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1 z-10">
                                <Badge 
                                  className={`mr-2 px-2 py-0 ${getLogTypeColor(log.type)} text-white`}
                                >
                                  {getLogTypeTranslation(log.type)}
                                </Badge>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditClick(log);
                                  }}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(log.id);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          
                          {/* Content conditionally rendered on click */}
                          {isExpanded && (
                            <CardContent className="py-3 px-4 bg-gray-50 border-t text-sm animate-fadeIn">
                              <p className="whitespace-pre-wrap">{log.content}</p>
                            </CardContent>
                          )}
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Modifica log")}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitEdit)} className="space-y-4">
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
                      <Input placeholder={t("Titolo del log")} {...field} />
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
                        placeholder={t("Contenuto del log")}
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
                              <span>Seleziona una data</span>
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
                <Button type="submit" disabled={updateLogMutation.isPending}>
                  {updateLogMutation.isPending ? t("Salvataggio...") : t("Salva")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
} 