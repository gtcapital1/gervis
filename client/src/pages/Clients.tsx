import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  ChevronRight, 
  Archive, 
  Clock, 
  Phone,
  Mail,
  UserX,
  AlertTriangle,
  RefreshCcw,
  Star,
  Zap,
  CalendarClock,
  Users,
  Calendar,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ClientDialog } from "../components/dashboard/ClientDialog";
import { UpgradeDialog } from "../components/pro/UpgradeDialog";
import { Client, CLIENT_SEGMENTS } from "@shared/schema";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/ui/page-header";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { EmailDialog, CalendarDialog } from "@/components/dialog";
import { CalendarEvent } from "@/types/calendar";
import { EmailFormData } from "@/types/email";

export default function Clients() {
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [clientToArchive, setClientToArchive] = useState<Client | null>(null);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [clientToMeeting, setClientToMeeting] = useState<Client | null>(null);
  const [isMeetingDialogOpen, setIsMeetingDialogOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState<Date | undefined>(new Date());
  const [meetingTime, setMeetingTime] = useState("10:00");
  const [meetingSubject, setMeetingSubject] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [meetingLocation, setMeetingLocation] = useState("office");
  const [meetingDuration, setMeetingDuration] = useState(60);
  const [sendMeetingEmail, setSendMeetingEmail] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [clientToEmail, setClientToEmail] = useState<Client | null>(null);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [sortColumn, setSortColumn] = useState<string>("lastName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const queryClient = useQueryClient();

  // Fetch clients
  const { data, isLoading, isError } = useQuery<{clients: Client[]} | null>({
    queryKey: ['/api/clients'],
    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });
  
  // Estrai i clienti dalla risposta o usa un array vuoto se non disponibili
  const clients = data?.clients || [];

  // Archive client mutation
  const archiveClientMutation = useMutation({
    mutationFn: (clientId: number) => {
      return apiRequest(`/api/clients/${clientId}/archive`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setIsArchiveDialogOpen(false);
      toast({
        title: "Client archived",
        description: "The client has been moved to the archive.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to archive client. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Restore client mutation
  const restoreClientMutation = useMutation({
    mutationFn: (clientId: number) => {
      return apiRequest(`/api/clients/${clientId}/restore`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: "Client restored",
        description: "The client has been restored from the archive.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to restore client. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Delete client mutation con verifica del risultato
  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: number) => {
      
      
      // Utilizziamo apiRequest standard per garantire la corretta gestione degli errori
      const deleteResponse = await apiRequest(`/api/clients/${clientId}?_t=${Date.now()}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '-1',
          'X-Requested-With': 'XMLHttpRequest',
          'X-No-HTML-Response': 'true',
          'X-Force-Content-Type': 'application/json',
          'X-Debug-Delete': 'true'
        }
      });
      
      
      
      // Verifica che l'eliminazione sia avvenuta realmente
      // Aspetta un momento e poi richiedi l'elenco dei clienti per verificare
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const verifyResponse = await apiRequest('/api/clients', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      
      
      // Controlla se il cliente è ancora presente
      const clientStillExists = verifyResponse.clients?.some((c: any) => c.id === clientId);
      
      if (clientStillExists) {
        
        
        // Tenta un'altra richiesta DELETE più aggressiva come fallback
        
        const recoveryResponse = await fetch(`/api/clients/${clientId}?_fallback=true&_t=${Date.now()}_${Math.random()}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '-1',
            'X-Requested-With': 'XMLHttpRequest',
            'X-No-HTML-Response': 'true',
            'X-Force-Content-Type': 'application/json',
            'X-Recovery-Delete': 'true'
          }
        });
        
        // Verifica nuovamente
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const secondVerifyResponse = await apiRequest('/api/clients', {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        const clientStillExistsAfterRecovery = secondVerifyResponse.clients?.some((c: any) => c.id === clientId);
        
        if (clientStillExistsAfterRecovery) {
          
          throw new Error("Impossibile eliminare il cliente. Si prega di contattare l'assistenza.");
        } else {
          
          return { success: true, message: "Client deleted successfully (after recovery)" };
        }
      }
      
      // Se arriva qui, il cliente è stato eliminato con successo
      return { success: true, message: "Client deleted successfully", verified: true };
    },
    onSuccess: (data) => {
      
      
      // Invalidiamo la query per aggiornare l'elenco clienti
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      
      // Toast di successo
      toast({
        title: t('dashboard.client_deleted'),
        description: t('dashboard.client_deleted_success'),
      });
      
      // Chiudi il dialog di conferma
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      // Log dettagliato dell'errore per debugging
      
      
      // Mostriamo un messaggio di errore all'utente
      toast({
        title: "Errore",
        description: `Non è stato possibile eliminare il cliente: ${error.message || 'Errore interno'}`,
        variant: "destructive",
      });
      
      // Chiudi il dialog di conferma
      setIsDeleteDialogOpen(false);
    },
  });

  // Schedule meeting mutation
  const scheduleMeetingMutation = useMutation({
    mutationFn: (data: { clientId: number, subject: string, dateTime: string, notes: string }) => {
      return apiRequest(`/api/meetings`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      setIsMeetingDialogOpen(false);
      toast({
        title: t('dashboard.meeting_scheduled'),
        description: t('dashboard.meeting_scheduled_success'),
      });
      
      // Reset form
      setMeetingSubject("");
      setMeetingDate(new Date());
      setMeetingTime("10:00");
      setMeetingNotes("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to schedule meeting. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter clients based on search query and archived status
  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          client.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesArchiveFilter = showArchived ? client.isArchived : !client.isArchived;
    
    return matchesSearch && matchesArchiveFilter;
  });
  
  // Sort clients based on the selected column and direction
  const sortedClients = [...filteredClients].sort((a, b) => {
    let valueA, valueB;
    
    switch (sortColumn) {
      case "name":
        valueA = `${a.lastName}, ${a.firstName}`.toLowerCase();
        valueB = `${b.lastName}, ${b.firstName}`.toLowerCase();
        break;
      case "email":
        valueA = a.email.toLowerCase();
        valueB = b.email.toLowerCase();
        break;
      case "totalAssets":
        valueA = a.totalAssets || 0;
        valueB = b.totalAssets || 0;
        break;
      case "clientSegment":
        valueA = a.clientSegment || "";
        valueB = b.clientSegment || "";
        break;
      case "isOnboarded":
        valueA = a.isOnboarded ? 1 : 0;
        valueB = b.isOnboarded ? 1 : 0;
        break;
      case "createdAt":
        valueA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        valueB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        break;
      default:
        valueA = `${a.lastName}, ${a.firstName}`.toLowerCase();
        valueB = `${b.lastName}, ${b.firstName}`.toLowerCase();
    }
    
    const compareResult = typeof valueA === "string" 
      ? valueA.localeCompare(valueB as string)
      : (valueA as number) - (valueB as number);
    
    return sortDirection === "asc" ? compareResult : -compareResult;
  });

  function formatDate(date: Date | string | null) {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  }

  function formatCurrency(amount: number | null) {
    if (amount === null) return "€0";
    return `€${amount.toLocaleString()}`;
  }

  function handleSortChange(column: string) {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new column and default to ascending
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

  function getSortIcon(column: string) {
    if (sortColumn !== column) return null;
    
    return sortDirection === "asc" 
      ? <ArrowUp className="h-4 w-4 inline ml-1" /> 
      : <ArrowDown className="h-4 w-4 inline ml-1" />;
  }

  function handleViewClient(id: number) {
    setLocation(`/clients/${id}`);
  }
  
  function handleArchiveClient(client: Client) {
    setClientToArchive(client);
    setIsArchiveDialogOpen(true);
  }
  
  function confirmArchiveClient() {
    if (clientToArchive) {
      archiveClientMutation.mutate(clientToArchive.id);
    }
  }
  
  function handleDeleteClient(client: Client) {
    setClientToDelete(client);
    setIsDeleteDialogOpen(true);
  }
  
  function confirmDeleteClient() {
    if (clientToDelete) {
      deleteClientMutation.mutate(clientToDelete.id);
    }
  }

  function handleScheduleMeeting(client: Client) {
    setClientToMeeting(client);
    setIsMeetingDialogOpen(true);
  }
  
  // Mutation per creare un nuovo meeting
  const createMeetingMutation = useMutation({
    mutationFn: async (meeting: {
      clientId: number;
      advisorId?: number;  // Added advisorId as optional
      subject: string;
      dateTime: string;
      duration: number;
      location: string;
      notes: string;
      sendEmail: boolean;
    }) => {
      console.log("[Clients] Tentativo di creazione meeting:", meeting);
      const response = await apiRequest('/api/meetings', {
        method: 'POST',
        body: JSON.stringify(meeting),
      });
      if (!response.success) {
        throw new Error(response.message || 'Errore durante la creazione del meeting');
      }
      return response.meeting;
    },
    onSuccess: (data) => {
      console.log("[Clients] Meeting creato con successo:", data);
      setIsMeetingDialogOpen(false);
      
      // Reset form
      setMeetingSubject("");
      setMeetingDate(new Date());
      setMeetingTime("10:00");
      setMeetingNotes("");
      setMeetingLocation("office");
      setMeetingDuration(60);
      setSendMeetingEmail(false);
      
      toast({
        title: t('dashboard.meeting_scheduled'),
        description: t('dashboard.meeting_scheduled_success'),
      });
      
      // Refresh data - now using the correct endpoint
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
    },
    onError: (error) => {
      console.error("[Clients] Errore nella creazione del meeting:", error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : 'Errore durante la creazione del meeting',
        variant: "destructive",
      });
    }
  });

  function scheduleMeeting(event: CalendarEvent, sendEmail: boolean) {
    if (clientToMeeting) {
      try {
        // Check if user is authenticated
        if (!user?.id) {
          toast({
            title: "Errore",
            description: "Utente non autenticato. Impossibile creare il meeting.",
            variant: "destructive",
          });
          return;
        }
        
        // Create meeting
        createMeetingMutation.mutate({
          clientId: clientToMeeting.id,
          advisorId: user.id,
          subject: event.title,
          dateTime: event.dateTime,
          duration: event.duration,
          location: event.location || "zoom",
          notes: event.notes || "",
          sendEmail: sendEmail
        });
      } catch (error) {
        console.error('Error in scheduleMeeting:', error);
        toast({
          title: "Errore",
          description: 'Si è verificato un errore durante la programmazione dell\'incontro',
          variant: "destructive"
        });
      }
    }
  }

  // Funzione per renderizzare un badge colorato in base al segmento cliente
  function renderClientSegmentBadge(segment: string | null) {
    if (!segment) return null;
    
    const segmentColors = {
      mass_market: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", // Blu più chiaro
      affluent: "bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200",    // Blu chiaro
      hnw: "bg-blue-300 text-blue-800 dark:bg-blue-700 dark:text-blue-200",         // Blu medio         // Blu più scuro
    };
    
    const color = segmentColors[segment as keyof typeof segmentColors] || "bg-gray-100 text-gray-800";
    
    return (
      <Badge variant="outline" className={`${color} font-semibold`}>
        {segment === 'mass_market' ? 'Mass Market' : 
          segment === 'hnw' ? 'HNW' : 
          segment.charAt(0).toUpperCase() + segment.slice(1)}
      </Badge>
    );
  }

  // Function to handle opening the email dialog
  function handleSendEmail(client: Client) {
    setClientToEmail(client);
    setIsEmailDialogOpen(true);
  }

  // Function to send email
  function sendEmail(data: EmailFormData) {
    // Determina l'ID client da usare (potrebbe essere undefined nelle email generiche)
    const targetClientId = data.clientId;
    
    // Controlla se abbiamo un client ID valido
    if (!targetClientId) {
      toast({
        title: "Errore",
        description: "ID cliente non valido",
        variant: "destructive",
      });
      return Promise.reject(new Error("ID cliente non valido"));
    }
    
    // Show loading toast
    const loadingToast = toast({
      title: "Invio email in corso...",
      description: "Attendere prego",
    });
    
    // Send the email via API
    return apiRequest(`/api/clients/${targetClientId}/send-email`, {
      method: 'POST',
      body: JSON.stringify({
        subject: data.subject,
        message: data.message,
        recipientName: data.recipientName,
        recipientEmail: data.recipientEmail,
        language: 'italian' // o 'english' in base alle preferenze
      })
    })
    .then(response => {
      // Dismiss loading toast
      loadingToast.dismiss();
      
      if (response.success) {
        toast({
          title: "Email inviata",
          description: "L'email è stata inviata con successo",
        });
        return response;
      } else {
        toast({
          title: "Errore",
          description: response.message || "Impossibile inviare l'email",
          variant: "destructive",
        });
        throw new Error(response.message);
      }
    })
    .catch(error => {
      // Dismiss loading toast
      loadingToast.dismiss();
      
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'invio dell'email",
        variant: "destructive",
      });
      throw error;
    });
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader 
        title={t('dashboard.clients')}
        subtitle={t('dashboard.manage_portfolio')}
      >
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowArchived(!showArchived)}
          className={showArchived ? "bg-muted" : ""}
        >
          {showArchived ? (
            <><RefreshCcw className="h-4 w-4 mr-2" /> {t('dashboard.show_active')}</>
          ) : (
            <><Archive className="h-4 w-4 mr-2" /> {t('dashboard.show_archived')}</>
          )}
        </Button>
        
        <Button onClick={() => setIsClientDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('dashboard.add_client')}
        </Button>
      </PageHeader>
      
      <div className="grid gap-6">
        {/* Clients List */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <CardTitle>{t('dashboard.clients_list')}</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('dashboard.search_clients')}
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <p>{t('dashboard.loading_clients')}</p>
              </div>
            ) : isError ? (
              <div className="flex justify-center items-center h-64">
                <p className="text-destructive">{t('dashboard.error_loading')}</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="flex flex-col justify-center items-center h-64 space-y-3">
                <p className="text-muted-foreground">{t('dashboard.no_clients_found')}</p>
                <Button 
                  variant="outline" 
                  onClick={() => setIsClientDialogOpen(true)}
                >
                  {t('dashboard.add_first_client')}
                </Button>
              </div>
            ) : (
              <div className="relative overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => handleSortChange("name")}
                      >
                        {t('dashboard.name')} {getSortIcon("name")}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => handleSortChange("email")}
                      >
                        {t('dashboard.email')} {getSortIcon("email")}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hidden md:table-cell"
                        onClick={() => handleSortChange("totalAssets")}
                      >
                        AuM {getSortIcon("totalAssets")}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => handleSortChange("clientSegment")}
                      >
                        {t('dashboard.segment')} {getSortIcon("clientSegment")}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => handleSortChange("isOnboarded")}
                      >
                        {t('dashboard.status')} {getSortIcon("isOnboarded")}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hidden md:table-cell"
                        onClick={() => handleSortChange("createdAt")}
                      >
                        {t('dashboard.created')} {getSortIcon("createdAt")}
                      </TableHead>
                      <TableHead className="text-right">{t('dashboard.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedClients.map((client: Client) => (
                      <TableRow 
                        key={client.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleViewClient(client.id)}
                      >
                        <TableCell className="font-medium whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${client.active ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span>{client.lastName}, {client.firstName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[140px] truncate">{client.email}</TableCell>
                        <TableCell className="whitespace-nowrap hidden md:table-cell">{formatCurrency(client.totalAssets)}</TableCell>
                        <TableCell>
                          {renderClientSegmentBadge(client.clientSegment)}
                        </TableCell>
                        <TableCell>
                          {client.isOnboarded ? (
                            <Badge variant="default" className="bg-green-600 text-white">{t('dashboard.onboarded')}</Badge>
                          ) : (
                            <Badge variant="secondary">{t('dashboard.not_onboarded')}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap hidden md:table-cell">{formatDate(client.createdAt)}</TableCell>
                        <TableCell>
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="flex justify-end"
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewClient(client.id);
                                  }}
                                >
                                  <ChevronRight className="mr-2 h-4 w-4" />
                                  {t('dashboard.view_details')}
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSendEmail(client);
                                  }}
                                >
                                  <Mail className="mr-2 h-4 w-4" />
                                  {t('dashboard.send_email')}
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleScheduleMeeting(client);
                                  }}
                                >
                                  <CalendarClock className="mr-2 h-4 w-4" />
                                  {t('dashboard.schedule_meeting')}
                                </DropdownMenuItem>
                                
                                {client.isArchived ? (
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      restoreClientMutation.mutate(client.id);
                                    }}
                                    className="text-green-600"
                                  >
                                    <RefreshCcw className="mr-2 h-4 w-4" />
                                    {t('dashboard.restore_client')}
                                  </DropdownMenuItem>
                                ) : (
                                  <>
                                    <DropdownMenuItem 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleArchiveClient(client);
                                      }}
                                      className="text-amber-600"
                                    >
                                      <Archive className="mr-2 h-4 w-4" />
                                      {t('dashboard.archive')}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClient(client);
                                      }}
                                      className="text-red-600"
                                    >
                                      <UserX className="mr-2 h-4 w-4" />
                                      {t('dashboard.delete_permanently')}
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <ClientDialog 
        open={isClientDialogOpen}
        onOpenChange={setIsClientDialogOpen}
      />
      
      {/* Archive Client Confirmation Dialog */}
      <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dashboard.archive')}</DialogTitle>
            <DialogDescription>
              {t('dashboard.confirm_delete', { name: clientToArchive?.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsArchiveDialogOpen(false)}>
              {t('dashboard.cancel')}
            </Button>
            <Button 
              variant="default"
              onClick={confirmArchiveClient}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Archive className="mr-2 h-4 w-4" />
              {t('dashboard.archive')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Client Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dashboard.delete')}</DialogTitle>
            <DialogDescription>
              {t('dashboard.confirm_delete', { name: clientToDelete?.name })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-md text-red-600 mb-4">
            <AlertTriangle className="h-5 w-5" />
            <div className="text-sm">
              {t('dashboard.delete_client_warning')}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              {t('dashboard.cancel')}
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmDeleteClient}
            >
              <UserX className="mr-2 h-4 w-4" />
              {t('dashboard.delete_permanently')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Schedule Meeting Dialog */}
      {clientToMeeting && (
        <CalendarDialog
          open={isMeetingDialogOpen}
          onOpenChange={setIsMeetingDialogOpen}
          mode="create"
          useClientSelector={true}
          selectedDate={new Date()}
          event={{
            clientId: clientToMeeting.id,
            title: "",
            dateTime: new Date().toISOString(),
            duration: 60,
            location: "zoom",
            notes: ""
          }}
          onSubmit={(event, sendEmailFlag) => {
            if (clientToMeeting && user?.id) {
              createMeetingMutation.mutate({
                clientId: clientToMeeting.id,
                advisorId: user.id,
                subject: event.title,
                dateTime: event.dateTime,
                duration: event.duration,
                location: event.location || "zoom",
                notes: event.notes || "",
                sendEmail: sendEmailFlag
              });
            }
          }}
        />
      )}
      
      {/* Email Dialog */}
      {clientToEmail && (
        <EmailDialog
          open={isEmailDialogOpen}
          onOpenChange={setIsEmailDialogOpen}
          clientId={clientToEmail.id}
          title={t('dashboard.send_email')}
          onSubmit={sendEmail}
          useClientSelector={true}
        />
      )}
      
      {/* Upgrade Dialog */}
      <UpgradeDialog 
        open={isUpgradeDialogOpen}
        onOpenChange={setIsUpgradeDialogOpen}
        userId={user?.id || 0}
      />
    </div>
  );
} 