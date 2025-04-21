import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar as CalendarIcon, Clock, User, MapPin, FileText, Edit, Trash2, MoreHorizontal, Calendar, ArrowLeft, Plus, CalendarCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, parse, startOfWeek, addDays } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { CalendarDialog } from "@/components/dialog";
import { CalendarEvent } from "@/types/calendar";

// Definizione interfacce
interface Event {
  id: number;
  title: string;
  type: string;
  startTime: string;
  endTime: string;
  clientId: number;
  clientName: string;
  location: string;
  date: string; // Data in formato YYYY-MM-DD
}

// Aggiungi il campo sendEmail al tipo Meeting
type Meeting = {
  id: number;
  advisorId: number;
  clientId: number;
  title: string;
  subject: string;
  dateTime: Date;
  duration: number;
  location: string;
  notes: string;
  sendEmail?: boolean;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("09:00");
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState<Event | null>(null);
  const { t } = useTranslation();
  
  // Fetch dei meeting usando l'API esistente
  const { data: meetingsData, isLoading, isError, refetch } = useQuery<{success: boolean, meetings: any[]} | null>({
    queryKey: ['/api/meetings'],
    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });
  
  // Quando l'utente cambia la data selezionata, rifacciamo la query
  useEffect(() => {
    if (selectedDate) {
      refetch();
    }
  }, [selectedDate, refetch]);

  // Dopo che i dati vengono caricati, aggiungiamo più log di debug
  useEffect(() => {
    if (meetingsData?.success && meetingsData.meetings) {
      console.log('Meeting data received:', meetingsData.meetings);
      
      // Log dei primi 5 meeting per un controllo rapido
      meetingsData.meetings.slice(0, 5).forEach((meeting, index) => {
        console.log(`Meeting ${index + 1}:`, {
          id: meeting.id,
          subject: meeting.subject,
          dateTime: meeting.dateTime
        });
      });
    }
  }, [meetingsData]);
  
  // Fetch dei clienti per il dropdown
  const { data: clientsData } = useQuery<{clients: any[]} | null>({
    queryKey: ['/api/clients'],
    retry: 2,
    refetchOnWindowFocus: false,
  });
  
  const clients = clientsData?.clients || [];
  
  // Eventi dal backend - trasformiamo i meeting nel formato di eventi richiesto dal calendario
  const events = useMemo(() => {
    if (!meetingsData?.success || !meetingsData.meetings || !meetingsData.meetings.length) {
      return [];
    }
    
    return meetingsData.meetings.map(meeting => {
      // Parsing della data e ora del meeting
      const meetingDate = new Date(meeting.dateTime);
      const endTime = new Date(meetingDate);
      endTime.setMinutes(endTime.getMinutes() + (meeting.duration || 60));
      
      // Formattazione della data per il calendar (YYYY-MM-DD)
      const formattedDate = format(meetingDate, "yyyy-MM-dd");
      // Formattazione dell'orario di inizio (HH:mm)
      const startTime = format(meetingDate, "HH:mm");
      // Formattazione dell'orario di fine (HH:mm)
      const endTimeString = format(endTime, "HH:mm");
      
      // Trova il cliente corrispondente nell'elenco dei client
      const client = clients.find(c => c.id === meeting.clientId);
      const clientName = client 
        ? `${client.firstName} ${client.lastName}` 
        : 'Cliente';
      
      // Creazione dell'oggetto evento nel formato richiesto dal calendario
      return {
        id: meeting.id,
        title: meeting.subject || 'Meeting',
        type: 'meeting',
        startTime: startTime,
        endTime: endTimeString,
        clientId: meeting.clientId,
        clientName: clientName,
        location: meeting.location || 'Online',
        date: formattedDate
      } as Event;
    });
  }, [meetingsData, clients]);
  
  // Giorni della settimana
  const weekDays = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì"];
  
  // Mostriamo slot orari di 1 ora nel calendario
  const dayHours = [];
  for (let i = 8; i <= 19; i++) {
    // Assicuriamoci che le ore vengano sempre formattate con due cifre (08:00 invece di 8:00)
    const formattedHour = i.toString().padStart(2, "0");
    dayHours.push(`${formattedHour}:00`);
  }
  
  // Mutation per aggiornare un meeting
  const updateMeetingMutation = useMutation({
    mutationFn: async (meeting: Meeting) => {
      console.log("[Calendar] Tentativo di aggiornamento meeting:", meeting);
      try {
        // Log completo della richiesta
        console.log("[Calendar] Dettagli richiesta di aggiornamento:", {
          url: `/api/meetings/${meeting.id}`,
          method: 'PUT',
          body: meeting
        });
        
        const response = await apiRequest(`/api/meetings/${meeting.id}`, {
          method: 'PUT',
          body: JSON.stringify(meeting),
        });
        
        // Log completo della risposta
        console.log("[Calendar] Risposta API aggiornamento completa:", {
          status: response?.status,
          statusText: response?.statusText,
          data: response?.data,
          headers: response?.headers,
          response: response
        });
        
        // Ritorna sempre un valore valido se non ci sono errori di rete
        return { success: true, meeting: meeting };
      } catch (error) {
        console.error("[Calendar Error] Errore dettagliato nell'aggiornamento:", error);
        console.error("[Calendar Error] Stack trace:", error instanceof Error ? error.stack : "No stack trace");
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("[Calendar] Meeting aggiornato con successo:", data);
      setIsEditDialogOpen(false);
      toast({
        title: "Successo",
        description: "Meeting aggiornato con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
    },
    onError: (error) => {
      console.error("[Calendar Error] Errore nell'aggiornamento del meeting:", error);
      toast({
        title: "Errore",
        description: "Problema durante l'aggiornamento dell'evento, ma le modifiche potrebbero essere state salvate. Ricarica la pagina per verificare.",
        variant: "destructive",
      });
    }
  });
  
  // Mutation per eliminare un meeting
  const deleteMeetingMutation = useMutation({
    mutationFn: async (id: number) => {
      try {
        const response = await apiRequest(`/api/meetings/${id}`, {
          method: 'DELETE',
        });
        
        console.log("[Calendar] Risposta eliminazione:", response);
        return { success: true };
      } catch (error) {
        console.error("[Calendar Error] Errore durante l'eliminazione:", error);
        throw error;
      }
    },
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      toast({
        title: "Successo",
        description: "Meeting eliminato con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Problema durante l'eliminazione dell'evento. Ricarica la pagina per verificare.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation per creare un nuovo meeting
  const createMeetingMutation = useMutation({
    mutationFn: async (meetingData: Omit<Meeting, 'id' | 'title'> & { subject: string }) => {
      console.log("[Calendar] Tentativo di creazione meeting:", meetingData);
      try {
        // Log completo della richiesta
        console.log("[Calendar] Dettagli richiesta:", {
          url: '/api/meetings',
          method: 'POST',
          body: meetingData
        });
        
        const response = await apiRequest('/api/meetings', {
          method: 'POST',
          body: JSON.stringify(meetingData),
        });
        
        // Log completo della risposta
        console.log("[Calendar] Risposta API completa:", {
          status: response?.status,
          statusText: response?.statusText,
          data: response?.data,
          headers: response?.headers,
          response: response
        });
        
        // Ritorna sempre un valore valido se non ci sono errori di rete
        return { success: true };
      } catch (error) {
        console.error("[Calendar Error] Errore dettagliato nella chiamata API:", error);
        console.error("[Calendar Error] Stack trace:", error instanceof Error ? error.stack : "No stack trace");
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("[Calendar] Meeting creato con successo:", data);
      setIsCreateDialogOpen(false);
      toast({
        title: "Successo",
        description: "Meeting creato con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
    },
    onError: (error) => {
      console.error("[Calendar Error] Errore nella creazione del meeting:", error);
      toast({
        title: "Errore",
        description: "Problema durante la creazione dell'evento, ma l'evento potrebbe essere stato creato. Ricarica la pagina per verificare.",
        variant: "destructive",
      });
    }
  });
  
  // Funzioni per gestire l'editing di un evento
  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setIsEditDialogOpen(true);
  };
  
  // Funzione per la submissione dell'evento modificato (per CalendarDialog)
  const handleSubmitEditEvent = (updatedEvent: CalendarEvent, sendEmail: boolean) => {
    if (editingEvent) {
      try {
        // Estrai dateTime dall'event aggiornato
        const dateTime = new Date(updatedEvent.dateTime);
        
        // Prepara l'oggetto per l'API
        updateMeetingMutation.mutate({
          id: editingEvent.id,
          advisorId: user?.id || 1,
          clientId: updatedEvent.clientId,
          title: updatedEvent.title,
          subject: updatedEvent.title, // Usiamo il titolo come subject
          dateTime: dateTime,
          duration: updatedEvent.duration,
          location: updatedEvent.location || 'office',
          notes: updatedEvent.notes || '',
          sendEmail: sendEmail
        });
      } catch (error) {
        toast({
          title: "Errore",
          description: "Si è verificato un errore con la data selezionata. Riprova.",
          variant: "destructive",
        });
      }
    }
  };
  
  // Funzioni per gestire l'eliminazione di un evento
  const handleDeleteEvent = (event: Event) => {
    setDeleteConfirmEvent(event);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDeleteEvent = () => {
    if (deleteConfirmEvent) {
      
      deleteMeetingMutation.mutate(deleteConfirmEvent.id);
    } else {
      
    }
  };
  
  // Formatta l'ora in formato hh:mm
  const formatTime = (timeString: string) => {
    return timeString;
  };
  
  // Modifica per intervalli di 15 minuti invece di 30
  const getTimeOptions = () => {
    const options = [];
    for (let hour = 8; hour < 20; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const formattedHour = hour.toString().padStart(2, "0");
        const formattedMinute = minute.toString().padStart(2, "0");
        options.push(
          <option key={`${formattedHour}:${formattedMinute}`} value={`${formattedHour}:${formattedMinute}`}>
            {`${formattedHour}:${formattedMinute}`}
          </option>
        );
      }
    }
    return options;
  };
  
  // Modifica la funzione che filtra gli eventi per la data selezionata
  const filteredEvents = events.filter(event => {
    if (selectedDate && event.date) {
      // Formatta la data selezionata nel formato YYYY-MM-DD per confrontarla con event.date
      const formattedSelectedDate = format(selectedDate, "yyyy-MM-dd");
      return event.date === formattedSelectedDate;
    }
    return false;
  });
  
  // Aggiorna la visualizzazione della settimana per mostrare eventi nella data corretta
  const weekDaysWithDates = Array.from({ length: 5 }, (_, i) => {
    if (selectedDate) {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Inizia da lunedì
      const date = addDays(weekStart, i);
      // Controlla se la data è oggi
      const isToday = format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
      return {
        name: format(date, "EEEE", { locale: it }),
        date: date,
        dateString: format(date, "yyyy-MM-dd"),
        isToday
      };
    }
    return {
      name: weekDays[i],
      date: new Date(),
      dateString: "",
      isToday: false
    };
  });
  
  // Funzione per ottenere eventi per una specifica ora e un giorno specifico
  const getEventsForHourAndDay = (dayIndex: number, hour: string) => {
    if (!weekDaysWithDates[dayIndex]) return [];
    
    // Ottieni la data per il giorno specifico
    const dateString = weekDaysWithDates[dayIndex].dateString;
    
    // Estrai l'ora del time slot (ad es. "09:00" -> "09")
    const hourValue = hour.split(':')[0];
    
    // Filtra gli eventi che hanno la stessa data e iniziano alla stessa ora
    return events.filter(event => {
      const eventStartHour = event.startTime.split(':')[0];
      return event.date === dateString && eventStartHour === hourValue;
    });
  };
  
  // Raggruppa gli eventi per ora
  const eventsByHour = dayHours.reduce((acc, hour) => {
    acc[hour] = filteredEvents.filter(event => {
      const eventStartHour = event.startTime.split(':')[0];
      const currentHour = hour.split(':')[0];
      return eventStartHour === currentHour;
    });
    return acc;
  }, {} as Record<string, Event[]>);

  // Funzione per aprire il dialogo di creazione evento con uno slot orario preselezionato
  const handleCreateEventClick = (timeSlot: string) => {
    setIsCreateDialogOpen(true);
  };

  // Funzione per gestire il click su una cella oraria nella vista settimanale
  const handleWeeklyTimeSlotClick = (dayIndex: number, hour: string) => {
    if (selectedDate) {
      const currentDate = new Date(selectedDate);
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Lunedì
      const targetDate = addDays(weekStart, dayIndex);
      
      // Prepara l'orario in formato corretto (HH:MM)
      let formattedHour = hour;
      if (hour.includes(':')) {
        const [h, m] = hour.split(':');
        formattedHour = `${h.padStart(2, '0')}:${m}`;
      }
      
      // Imposta la data e ora selezionata
      setSelectedDate(targetDate);
      setSelectedTime(formattedHour);
      
      // Apri il dialog per creare un nuovo evento
      setIsCreateDialogOpen(true);
    }
  };

  // Funzione per gestire la creazione di un nuovo evento (per CalendarDialog)
  const handleSubmitCreateEvent = (newEvent: CalendarEvent, sendEmail: boolean) => {
    try {
      // Controlla advisor ID
      if (!user?.id) {
        toast({
          title: "Errore",
          description: 'Non sei autorizzato a programmare incontri',
          variant: "destructive"
        });
        return;
      }

      // Crea una data da dateTime
      const dateTime = new Date(newEvent.dateTime);
      
      // Prepara l'oggetto per l'API
      const requestBody = {
        clientId: Number(newEvent.clientId),
        advisorId: Number(user.id),
        subject: newEvent.title,
        title: newEvent.title, // Aggiunto per soddisfare il tipo Meeting
        dateTime: dateTime,
        duration: newEvent.duration,
        location: newEvent.location || 'office',
        notes: newEvent.notes || '',
        sendEmail: sendEmail
      };

      // Esegui la chiamata API tramite mutation
      createMeetingMutation.mutate(requestBody);
    } catch (error) {
      console.error('Error in handleSubmitCreateEvent:', error);
      toast({
        title: "Errore",
        description: 'Si è verificato un errore durante la programmazione dell\'incontro',
        variant: "destructive"
      });
    }
  };

  return (
    <div className="h-[calc(100vh-10px)] flex flex-col">
      <div className="grid grid-cols-12 gap-1 flex-1 overflow-hidden">
        {/* Vista giornaliera a sinistra */}
        <div className="col-span-3">
          <Card className="h-full overflow-hidden flex flex-col">
            <CardHeader className="py-0.5 px-2">
              <CardTitle className="text-base">Programma giornaliero</CardTitle>
              <CardDescription className="text-xs">
                {selectedDate && format(selectedDate, "EEEE d MMMM yyyy", { locale: it })}
              </CardDescription>
            </CardHeader>
            <CardContent className="py-1 px-2 flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="py-2 text-center text-muted-foreground text-sm">
                  Caricamento...
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="py-2 text-center text-muted-foreground text-sm">
                  Nessun evento oggi
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filteredEvents.map((event) => (
                    <div key={event.id} className="flex flex-col p-1 border rounded-md hover:bg-gray-50 transition-colors shadow-sm text-xs">
                      <div className="flex items-center gap-1">
                        <div className="bg-primary/10 p-1 rounded-md">
                          <User className="h-3 w-3 text-primary" />
                        </div>
                        <span className="font-medium truncate flex-1">{event.title}</span>
                      </div>
                      <div className="ml-4 text-xs text-muted-foreground">
                        {formatTime(event.startTime)} - {formatTime(event.endTime)}
                      </div>
                      <div className="ml-4 text-xs text-muted-foreground truncate">
                        Cliente: {event.clientName}
                      </div>
                      <div className="flex items-center justify-between mt-1 pt-1 border-t border-gray-100">
                        <Badge className={
                          event.location === 'zoom' ? "bg-blue-500 text-xs py-0 px-1" :
                          event.location === 'office' ? "bg-green-500 text-xs py-0 px-1" :
                          "bg-amber-500 text-xs py-0 px-1"
                        }>
                          {event.location.charAt(0).toUpperCase() + event.location.slice(1)}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleEditEvent(event)}
                            className="h-5 w-5 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEvent(event);
                            }}
                            className="h-5 w-5 p-0 text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Vista settimanale a destra */}
        <div className="col-span-9">
          <Card className="h-full overflow-hidden flex flex-col">
            <CardHeader className="py-0.5 px-2">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base">Vista settimanale</CardTitle>
                  <CardDescription className="text-xs">
                    {selectedDate && format(selectedDate, "MMMM yyyy", { locale: it })}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.href = '/dashboard'}
                    className="h-8 text-sm"
                  >
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Dashboard
                  </Button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-8 text-sm">
                        <CalendarIcon className="mr-1 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP", { locale: it }) : "Seleziona data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <div className="h-full overflow-auto">
                <table className="w-full divide-y divide-gray-200 border rounded-md table-fixed">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="h-6">
                      <th className="w-14 py-1"></th>
                      {weekDaysWithDates.map((day, index) => (
                        <th key={index} className="text-center py-1 px-1 border-b text-xs w-1/5">
                          <div className="text-xs">{day.name}</div>
                          <div className={`text-xs ${day.isToday ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                            {format(day.date, "d MMM", { locale: it })}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dayHours.map((hour) => (
                      <tr key={hour} className="h-[calc((100vh-90px)/11)]">
                        <td className="w-14 border-r border-gray-100 text-center text-xs font-medium text-gray-500 px-1">
                          {hour}
                        </td>
                        {weekDaysWithDates.map((day, dayIndex) => (
                          <td 
                            key={dayIndex} 
                            className="group w-1/5 border-b border-r border-gray-100 relative p-0 hover:bg-blue-50 active:bg-blue-100 cursor-pointer transition-colors"
                            onClick={() => handleWeeklyTimeSlotClick(dayIndex, hour)}
                          >
                            {/* Pulsante per aggiungere evento in questa cella */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 hover:opacity-100 text-gray-400 hover:text-gray-600 h-3 w-3 p-0 m-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleWeeklyTimeSlotClick(dayIndex, hour);
                              }}
                            >
                              <Plus className="h-2 w-2" />
                            </Button>
                            
                            {/* Mostra gli eventi solo per il giorno corretto nella settimana */}
                            {getEventsForHourAndDay(dayIndex, hour).map((event, eventIndex) => {
                              // Calcolare la durata dell'evento in minuti
                              const startMinutes = parseInt(event.startTime.split(':')[0]) * 60 + parseInt(event.startTime.split(':')[1]);
                              const endMinutes = parseInt(event.endTime.split(':')[0]) * 60 + parseInt(event.endTime.split(':')[1]);
                              let durationMinutes = endMinutes - startMinutes;
                              if (durationMinutes <= 0) durationMinutes = 60; // Default 60 min se calcolo errato
                              
                              // Calcolare l'altezza proporzionale alla durata (60 min = 100%)
                              const heightPercentage = Math.min(100, (durationMinutes / 60) * 100);
                              
                              // Calcolare l'offset verticale in base ai minuti (0 = inizio ora, 30 = metà ora)
                              const startMinuteInHour = parseInt(event.startTime.split(':')[1]);
                              const topPercentage = (startMinuteInHour / 60) * 100;
                              
                              // Gestire le sovrapposizioni orizzontalmente
                              const overlappingEvents = getEventsForHourAndDay(dayIndex, hour).length;
                              const widthPercentage = overlappingEvents > 1 ? (100 / overlappingEvents) - 2 : 95;
                              const leftPercentage = overlappingEvents > 1 ? (eventIndex * (100 / overlappingEvents)) + 1 : 2.5;
                              
                              return (
                                <div 
                                  key={event.id}
                                  className="absolute bg-blue-100 rounded p-1 shadow-sm truncate border-l-2 border-blue-500 hover:bg-blue-200 transition"
                                  style={{
                                    height: `${heightPercentage}%`, 
                                    top: `${topPercentage}%`,
                                    left: `${leftPercentage}%`,
                                    width: `${widthPercentage}%`,
                                    zIndex: 10 + eventIndex
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditEvent(event);
                                  }}
                                >
                                  <div className="flex justify-between items-start overflow-hidden">
                                    <span className="font-medium text-xs truncate text-blue-800 block w-4/5">{event.title}</span>
                                    <div className="flex">
                                      <Edit 
                                        className="h-3 w-3 text-blue-600 hover:text-blue-800 cursor-pointer flex-shrink-0 mr-1"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditEvent(event);
                                        }}
                                      />
                                      <Trash2 
                                        className="h-3 w-3 text-red-500 hover:text-red-700 cursor-pointer flex-shrink-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteEvent(event);
                                        }}
                                      />
                                    </div>
                                  </div>
                                  {heightPercentage >= 30 && (
                                    <div className="text-xs text-blue-600 truncate flex items-center">
                                      <User className="h-2.5 w-2.5 mr-1 inline" />
                                      {event.clientName || "Cliente"}
                                    </div>
                                  )}
                                  {heightPercentage >= 45 && (
                                    <div className="text-xs text-blue-600 truncate flex items-center">
                                      <Clock className="h-2.5 w-2.5 mr-1 inline" />
                                      {event.startTime}-{event.endTime}
                                    </div>
                                  )}
                                  {heightPercentage >= 60 && (
                                    <div className="text-xs text-blue-600 truncate flex items-center">
                                      <MapPin className="h-2.5 w-2.5 mr-1 inline" />
                                      {event.location.charAt(0).toUpperCase() + event.location.slice(1)}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sostituisce il dialog di modifica con CalendarDialog */}
      {editingEvent && (
        <CalendarDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          mode="edit"
          selectedDate={new Date(editingEvent.date)}
          clientId={editingEvent.clientId}
          event={{
            id: editingEvent.id,
            clientId: editingEvent.clientId,
            clientName: editingEvent.clientName,
            title: editingEvent.title,
            location: editingEvent.location,
            dateTime: `${editingEvent.date}T${editingEvent.startTime}:00`,
            duration: 60, // Fornisci una durata di default o calcola da startTime/endTime
            notes: ""  // Da popolare se disponibile
          }}
          useClientSelector={true}
          onSubmit={handleSubmitEditEvent}
        />
      )}
      
      {/* Sostituisce il dialog di conferma eliminazione (lasciato originale) */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Elimina appuntamento</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare questo appuntamento?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Annulla
            </Button>
            <Button variant="destructive" onClick={confirmDeleteEvent}>
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sostituisce il dialog di creazione con CalendarDialog */}
      <CalendarDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        mode="create"
        selectedDate={selectedDate || new Date()}
        event={{
          clientId: 0, // Sarà selezionato dall'utente
          title: "",
          dateTime: selectedDate ? 
            `${format(selectedDate, "yyyy-MM-dd")}T${selectedTime}:00` : 
            new Date().toISOString(),
          duration: 60,
          location: "office",
          notes: ""
        }}
        useClientSelector={true}
        onSubmit={handleSubmitCreateEvent}
      />
    </div>
  );
} 