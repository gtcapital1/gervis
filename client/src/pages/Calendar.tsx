import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar as CalendarIcon, Clock, User, MapPin, FileText, Edit, Trash2, MoreHorizontal, Calendar, ArrowLeft, Plus } from "lucide-react";
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

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventLocation, setEventLocation] = useState("zoom");
  const [eventDate, setEventDate] = useState<Date | undefined>(new Date());
  const [eventTime, setEventTime] = useState("10:00");
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState<Event | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newEventClientId, setNewEventClientId] = useState<number | null>(null);
  const [newEventNotes, setNewEventNotes] = useState("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [eventDuration, setEventDuration] = useState<number>(60); // Durata di default: 60 minuti
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // Fetch degli eventi dall'agenda
  const { data, isLoading, isError, refetch } = useQuery<{events: Event[]} | null>({
    queryKey: ['/api/agenda/today'],
    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });
  
  // Quando l'utente cambia la data selezionata, rifacciamo la query
  useEffect(() => {
    if (selectedDate) {
      console.log("Data selezionata cambiata, ricarichiamo gli eventi");
      refetch();
    }
  }, [selectedDate, refetch]);

  // Dopo che i dati vengono caricati, aggiungiamo più log di debug
  useEffect(() => {
    if (data?.events) {
      console.log(`Ricevuti ${data.events.length} eventi dall'API`);
      // Log dei primi 5 eventi per un controllo rapido
      data.events.slice(0, 5).forEach((event, index) => {
        console.log(`Evento ${index + 1}:`, {
          id: event.id,
          title: event.title,
          date: event.date,
          startTime: event.startTime,
          clientName: event.clientName
        });
      });
    }
  }, [data]);
  
  // Eventi dal backend
  const events = data?.events || [];
  
  // Giorni della settimana
  const weekDays = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];
  
  // Ore del giorno (dalle 8 alle 18)
  const dayHours = Array.from({ length: 11 }, (_, i) => `${i + 8}:00`);
  
  // Fetch dei clienti per il dropdown
  const { data: clientsData } = useQuery<{clients: any[]} | null>({
    queryKey: ['/api/clients'],
    retry: 2,
    refetchOnWindowFocus: false,
  });
  
  const clients = clientsData?.clients || [];
  
  // Mutation per aggiornare un meeting
  const updateMeetingMutation = useMutation({
    mutationFn: (data: { id: number, title: string, location: string, dateTime: string, duration: number }) => {
      return apiRequest(`/api/meetings/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: data.title,
          location: data.location,
          dateTime: data.dateTime,
          duration: data.duration
        }),
      });
    },
    onSuccess: () => {
      setIsEditDialogOpen(false);
      toast({
        title: t('dashboard.meeting_updated'),
        description: t('dashboard.meeting_updated_success'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/agenda/today'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update meeting. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation per eliminare un meeting
  const deleteMeetingMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/meetings/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      toast({
        title: t('dashboard.meeting_deleted'),
        description: t('dashboard.meeting_deleted_success'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/agenda/today'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete meeting. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation per creare un nuovo meeting
  const createMeetingMutation = useMutation({
    mutationFn: (data: { clientId: number, subject: string, dateTime: string, duration: number, location: string, notes: string }) => {
      console.log("Creating meeting with data:", data);
      return apiRequest('/api/meetings', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      setIsCreateDialogOpen(false);
      setNewEventClientId(null);
      setEventTitle("");
      setNewEventNotes("");
      setSelectedTimeSlot("");
      toast({
        title: "Meeting creato",
        description: "Il meeting è stato creato con successo.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/agenda/today'] });
    },
    onError: (error) => {
      console.error("Error creating meeting:", error);
      toast({
        title: "Errore",
        description: "Impossibile creare il meeting. Riprova più tardi.",
        variant: "destructive",
      });
    },
  });
  
  // Funzioni per gestire l'editing di un evento
  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setEventTitle(event.title);
    setEventLocation(event.location);
    
    // Estrai data e ora dall'evento
    if (event.startTime) {
      // Combina la data corrente con l'ora dell'evento
      const [hours, minutes] = event.startTime.split(':').map(Number);
      // Crea una data basata sulla data dell'evento (in una implementazione reale, avresti la data effettiva dell'evento)
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      setEventDate(date);
      setEventTime(event.startTime);
    }
    
    setIsEditDialogOpen(true);
  };
  
  const handleUpdateEvent = () => {
    if (editingEvent && eventTitle && eventDate) {
      try {
        // Combina data e ora in un formato datetime
        const [hours, minutes] = eventTime.split(':').map(Number);
        const dateTime = new Date(eventDate);
        dateTime.setHours(hours, minutes, 0, 0);
        
        // Verifica che dateTime sia un oggetto Date valido e converti a stringa ISO
        console.log("Updating meeting with date:", dateTime);
        
        // Converte la data in una stringa ISO standard
        const dateTimeStr = dateTime.toISOString();
        
        updateMeetingMutation.mutate({
          id: editingEvent.id,
          title: eventTitle,
          location: eventLocation,
          dateTime: dateTimeStr,
          duration: eventDuration
        });
      } catch (error) {
        console.error("Error creating date object:", error);
        toast({
          title: "Errore data",
          description: "Si è verificato un errore con la data selezionata. Riprova.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Campi mancanti",
        description: "Compilare tutti i campi richiesti (titolo e data).",
        variant: "destructive",
      });
    }
  };
  
  // Funzioni per gestire l'eliminazione di un evento
  const handleDeleteEvent = (event: Event) => {
    setDeleteConfirmEvent(event);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDeleteEvent = () => {
    if (deleteConfirmEvent) {
      console.log("Confirming delete for event:", deleteConfirmEvent.id);
      deleteMeetingMutation.mutate(deleteConfirmEvent.id);
    } else {
      console.error("No event selected for deletion");
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
  const weekDaysWithDates = Array.from({ length: 7 }, (_, i) => {
    if (selectedDate) {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Inizia da lunedì
      const date = addDays(weekStart, i);
      return {
        name: format(date, "EEEE", { locale: it }),
        date: date,
        dateString: format(date, "yyyy-MM-dd")
      };
    }
    return {
      name: weekDays[i],
      date: new Date(),
      dateString: ""
    };
  });
  
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
    setSelectedTimeSlot(timeSlot);
    setEventTime(timeSlot);
    setIsCreateDialogOpen(true);
  };

  // Funzione per creare un nuovo evento
  const handleCreateEvent = () => {
    if (!eventTitle || !eventDate || !newEventClientId) {
      toast({
        title: "Errore",
        description: "Compila tutti i campi obbligatori",
        variant: "destructive",
      });
      return;
    }

    try {
      // Estrae ore e minuti dalla stringa oraria selezionata
      const [hours, minutes] = eventTime.split(':').map(Number);
      
      // Crea una nuova data basata sulla data selezionata
      const startDateTime = new Date(eventDate);
      
      // Imposta l'ora selezionata nella data
      startDateTime.setHours(hours, minutes, 0, 0);
      
      // Ottieni l'offset di fuso orario in minuti per questa data
      const timezoneOffset = startDateTime.getTimezoneOffset();
      
      // Converte la data in una stringa ISO standard
      // L'offset di timezone è già automaticamente gestito da toISOString()
      const dateTimeStr = startDateTime.toISOString();
      
      // Log di debug
      console.log("Data selezionata:", eventDate);
      console.log("Ora selezionata:", eventTime);
      console.log("Data creata:", startDateTime);
      console.log("Timezone offset (minuti):", timezoneOffset);
      console.log("ISO String:", dateTimeStr);
      console.log("Durata:", eventDuration);
      
      // Crea l'oggetto meeting con i campi richiesti dall'API
      const meeting = {
        clientId: newEventClientId,
        subject: eventTitle,
        dateTime: dateTimeStr,
        duration: eventDuration,
        location: eventLocation,
        notes: newEventNotes || ""
      };
      
      console.log("Creating meeting:", meeting);
      
      createMeetingMutation.mutate(meeting, {
        onSuccess: () => {
          toast({
            title: "Appuntamento creato",
            description: "L'appuntamento è stato creato con successo",
          });
          setIsCreateDialogOpen(false);
          // Reset form
          setEventTitle("");
          setEventDate(new Date());
          setEventTime("09:00");
          setEventLocation("zoom");
          setNewEventClientId(null);
          setNewEventNotes("");
          setEventDuration(60);
        },
        onError: (error) => {
          console.error("Error creating meeting:", error);
          toast({
            title: "Errore",
            description: "Si è verificato un errore durante la creazione dell'appuntamento",
            variant: "destructive",
          });
        }
      });
    } catch (error) {
      console.error("Errore nella creazione della data:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore con il formato della data",
        variant: "destructive",
      });
    }
  };

  // Funzione per gestire il click su una cella oraria nella vista settimanale
  const handleWeeklyTimeSlotClick = (dayIndex: number, hour: string) => {
    if (selectedDate) {
      const currentDate = new Date(selectedDate);
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Lunedì
      const targetDate = addDays(weekStart, dayIndex);
      setEventDate(targetDate);
      setEventTime(hour);
      setIsCreateDialogOpen(true);
    }
  };

  // Funzione per ottenere le opzioni di durata in minuti
  const getDurationOptions = () => {
    const options = [
      { value: 15, label: "15 minuti" },
      { value: 30, label: "30 minuti" },
      { value: 45, label: "45 minuti" },
      { value: 60, label: "1 ora" },
      { value: 90, label: "1 ora e 30 minuti" },
      { value: 120, label: "2 ore" },
      { value: 180, label: "3 ore" }
    ];
    
    return options.map(option => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ));
  };

  // Funzione per ottenere gli eventi di una specifica giornata della settimana e ora specifica
  const getEventsForHourAndDay = (dayIndex: number, hour: string): Event[] => {
    if (!selectedDate || !events.length) return [];
    
    try {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const targetDate = addDays(weekStart, dayIndex);
      
      // Formatta la data target in YYYY-MM-DD
      const targetDateStr = format(targetDate, 'yyyy-MM-dd');
      const hourStr = hour.split(':')[0];
      
      console.log(`Cercando eventi per data ${targetDateStr} e ora ${hourStr}`);
      
      // Filtra gli eventi che hanno la stessa data e lo stesso orario
      const filteredEvents = events.filter(event => {
        const matchesDate = event.date === targetDateStr;
        const matchesHour = event.startTime.startsWith(hourStr);
        
        if (matchesDate && matchesHour) {
          console.log(`Trovato evento per ${targetDateStr} ${hourStr}:`, event);
        }
        
        return matchesDate && matchesHour;
      });
      
      return filteredEvents;
    } catch (e) {
      console.error("Errore nel calcolo eventi settimanali:", e);
      return [];
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
                <table className="min-w-full divide-y divide-gray-200 border rounded-md">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="h-6">
                      <th className="w-14 py-1"></th>
                      {weekDaysWithDates.map((day, index) => (
                        <th key={index} className="text-center py-1 px-1 border-b text-xs">
                          <div className="text-xs">{day.name}</div>
                          <div className="text-xs text-gray-500">{format(day.date, "d MMM", { locale: it })}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dayHours.map((hour) => (
                      <tr key={hour} className="h-[calc((100vh-90px)/11)]">
                        <td className="border-r border-gray-100 text-center text-xs font-medium text-gray-500 px-1">
                          {hour}
                        </td>
                        {weekDaysWithDates.map((day, dayIndex) => (
                          <td 
                            key={dayIndex} 
                            className="border-b border-r border-gray-100 relative p-0"
                            onClick={() => handleWeeklyTimeSlotClick(dayIndex, hour)}
                          >
                            {/* Pulsante per aggiungere evento in questa cella */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-0 right-0 opacity-0 hover:opacity-100 text-gray-400 hover:text-gray-600 h-3 w-3 p-0 m-0"
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
                                        className="h-3 w-3 text-blue-600 hover:text-blue-800 cursor-pointer flex-shrink-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditEvent(event);
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
      
      {/* Dialog per modificare un evento */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifica appuntamento</DialogTitle>
            <DialogDescription>
              Modifica i dettagli dell'appuntamento
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="event-title" className="text-sm font-medium">
                Titolo
              </label>
              <Input
                id="event-title"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">
                  Data
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="text-left font-normal justify-start"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {eventDate ? format(eventDate, "PPP", { locale: it }) : "Seleziona data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={eventDate}
                      onSelect={setEventDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <label htmlFor="event-time" className="text-sm font-medium">
                  Ora
                </label>
                <select
                  id="event-time"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                >
                  {getTimeOptions()}
                </select>
              </div>
            </div>
            <div className="grid gap-2">
              <label htmlFor="event-location" className="text-sm font-medium">
                Luogo
              </label>
              <select
                id="event-location"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
              >
                <option value="zoom">Zoom</option>
                <option value="office">Ufficio</option>
                <option value="phone">Telefono</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleUpdateEvent}>Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog per confermare l'eliminazione */}
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

      {/* Dialog per creare un nuovo evento */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Nuovo appuntamento</DialogTitle>
            <DialogDescription>Pianifica un nuovo incontro con un cliente</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-5 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                <User className="h-4 w-4 mr-2 text-muted-foreground" />
                Cliente <span className="text-red-500 ml-1">*</span>
              </label>
              <Select
                onValueChange={(value) => setNewEventClientId(parseInt(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleziona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.firstName} {client.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                Titolo <span className="text-red-500 ml-1">*</span>
              </label>
              <Input 
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Es. Revisione portafoglio"
                className="w-full"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                  Data <span className="text-red-500 ml-1">*</span>
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      {eventDate ? format(eventDate, "dd MMMM yyyy", { locale: it }) : "Seleziona data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={eventDate}
                      onSelect={setEventDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  Ora <span className="text-red-500 ml-1">*</span>
                </label>
                <select 
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {getTimeOptions()}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  Durata
                </label>
                <select 
                  value={eventDuration}
                  onChange={(e) => setEventDuration(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {getDurationOptions()}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                  Luogo
                </label>
                <select 
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="zoom">Zoom</option>
                  <option value="office">Ufficio</option>
                  <option value="phone">Telefono</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                Note
              </label>
              <Textarea 
                value={newEventNotes}
                onChange={(e) => setNewEventNotes(e.target.value)}
                placeholder="Inserisci eventuali note per il meeting"
                className="resize-none min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between items-center pt-2">
            <div className="text-xs text-muted-foreground">
              * Campi obbligatori
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Annulla
              </Button>
              <Button onClick={handleCreateEvent} className="bg-primary">
                Crea appuntamento
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 