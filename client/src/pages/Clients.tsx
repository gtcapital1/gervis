import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  Calendar
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
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();

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
      console.log(`[DEBUG] Avvio eliminazione cliente ${clientId}`);
      
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
      
      console.log(`[DEBUG] Risposta eliminazione:`, deleteResponse);
      
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
      
      console.log(`[DEBUG] Verifica post-eliminazione:`, verifyResponse);
      
      // Controlla se il cliente è ancora presente
      const clientStillExists = verifyResponse.clients?.some((c: any) => c.id === clientId);
      
      if (clientStillExists) {
        console.error(`[ERROR] Il cliente ${clientId} risulta ancora presente dopo l'eliminazione!`);
        
        // Tenta un'altra richiesta DELETE più aggressiva come fallback
        console.warn(`[DEBUG] Tentativo di recupero eliminazione per cliente ${clientId}...`);
        
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
          console.error(`[ERROR] Eliminazione fallita anche dopo il recovery!`);
          throw new Error("Impossibile eliminare il cliente. Si prega di contattare l'assistenza.");
        } else {
          console.log(`[DEBUG] Eliminazione riuscita dopo recovery`);
          return { success: true, message: "Client deleted successfully (after recovery)" };
        }
      }
      
      // Se arriva qui, il cliente è stato eliminato con successo
      return { success: true, message: "Client deleted successfully", verified: true };
    },
    onSuccess: (data) => {
      console.log(`[DEBUG] Eliminazione cliente completata con successo:`, data);
      
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
      console.error(`[ERROR] Errore nell'eliminazione cliente:`, error);
      
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
                          client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (client.phone && client.phone.includes(searchQuery));
    
    const matchesArchiveFilter = showArchived ? client.isArchived : !client.isArchived;
    
    return matchesSearch && matchesArchiveFilter;
  });

  function formatDate(date: Date | string | null) {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
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
  
  function scheduleMeeting() {
    if (clientToMeeting && meetingDate && meetingSubject) {
      // Combine date and time
      const [hours, minutes] = meetingTime.split(':').map(Number);
      const dateTime = new Date(meetingDate);
      dateTime.setHours(hours, minutes, 0, 0);
      
      scheduleMeetingMutation.mutate({
        clientId: clientToMeeting.id,
        subject: meetingSubject,
        dateTime: dateTime.toISOString(),
        notes: meetingNotes
      });
    }
  }

  // Funzione per renderizzare un badge colorato in base al segmento cliente
  function renderClientSegmentBadge(segment: string | null) {
    if (!segment) return null;
    
    const segmentColors = {
      mass_market: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      affluent: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      hnw: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      vhnw: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      uhnw: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
    };
    
    const segmentEmojis = {
      mass_market: "🧊",
      affluent: "🔵",
      hnw: "🟣",
      vhnw: "🟡",
      uhnw: "🔴"
    };
    
    const color = segmentColors[segment as keyof typeof segmentColors] || "bg-gray-100 text-gray-800";
    const emoji = segmentEmojis[segment as keyof typeof segmentEmojis] || "";
    
    return (
      <Badge variant="outline" className={`${color} font-semibold`}>
        {emoji} {segment === 'mass_market' ? 'Mass Market' : 
          segment === 'hnw' ? 'HNW' : 
          segment === 'vhnw' ? 'VHNW' : 
          segment === 'uhnw' ? 'UHNW' : 
          segment.charAt(0).toUpperCase() + segment.slice(1)}
      </Badge>
    );
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
              <CardTitle>{t('dashboard.clients')}</CardTitle>
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
                      <TableHead>{t('dashboard.name')}</TableHead>
                      <TableHead>{t('dashboard.email')}</TableHead>
                      <TableHead>{t('dashboard.phone')}</TableHead>
                      <TableHead>{t('dashboard.segment')}</TableHead>
                      <TableHead>{t('dashboard.status')}</TableHead>
                      <TableHead>{t('dashboard.created')}</TableHead>
                      <TableHead className="text-right">{t('dashboard.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client: Client) => (
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
                        <TableCell className="whitespace-nowrap hidden md:table-cell">{client.phone || "—"}</TableCell>
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
      <Dialog open={isMeetingDialogOpen} onOpenChange={setIsMeetingDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('dashboard.schedule_meeting')}</DialogTitle>
            <DialogDescription>
              {t('dashboard.schedule_meeting_with')} {clientToMeeting?.firstName} {clientToMeeting?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="meeting-subject" className="text-sm font-medium">
                {t('dashboard.subject')}
              </label>
              <Input
                id="meeting-subject"
                value={meetingSubject}
                onChange={(e) => setMeetingSubject(e.target.value)}
                placeholder={t('dashboard.meeting_details')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">
                  {t('dashboard.date')}
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="text-left font-normal justify-start"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {meetingDate ? format(meetingDate, "PPP", { locale: it }) : t('dashboard.select_date')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={meetingDate}
                      onSelect={setMeetingDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <label htmlFor="meeting-time" className="text-sm font-medium">
                  {t('dashboard.time')}
                </label>
                <select
                  id="meeting-time"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                >
                  {Array.from({ length: 24 }, (_, hour) => {
                    return ['00', '30'].map(minute => {
                      const time = `${hour.toString().padStart(2, '0')}:${minute}`;
                      return (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      );
                    });
                  }).flat()}
                </select>
              </div>
            </div>
            <div className="grid gap-2">
              <label htmlFor="meeting-notes" className="text-sm font-medium">
                {t('dashboard.notes_optional')}
              </label>
              <Textarea
                id="meeting-notes"
                value={meetingNotes}
                onChange={(e) => setMeetingNotes(e.target.value)}
                placeholder={t('dashboard.add_meeting_details')}
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMeetingDialogOpen(false)}>
              {t('dashboard.cancel')}
            </Button>
            <Button onClick={scheduleMeeting}>
              <Calendar className="mr-2 h-4 w-4" />
              {t('dashboard.schedule_meeting')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Upgrade Dialog */}
      <UpgradeDialog 
        open={isUpgradeDialogOpen}
        onOpenChange={setIsUpgradeDialogOpen}
        userId={user?.id || 0}
      />
    </div>
  );
} 