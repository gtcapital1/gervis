import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, MapPin, CalendarDays, Send } from "lucide-react";
import { CalendarEvent } from "@/types/calendar";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Client } from "@shared/schema";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, addHours, parseISO, setHours, setMinutes } from "date-fns";
import { it } from "date-fns/locale";

// Proprietà del dialogo
interface CalendarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  selectedDate?: Date;
  clientId?: number; // Opzionale, se specificato seleziona automaticamente il cliente
  event: CalendarEvent;
  useClientSelector?: boolean; // Flag per abilitare il selettore clienti
  onSubmit: (event: CalendarEvent, sendEmail: boolean) => void;
}

export function CalendarDialog({
  open,
  onOpenChange,
  mode,
  selectedDate = new Date(),
  clientId,
  event,
  useClientSelector = false,
  onSubmit,
}: CalendarDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Stati del form
  const [title, setTitle] = useState(() => event.title || "");
  const [date, setDate] = useState<Date | undefined>(() => 
    event.dateTime ? new Date(event.dateTime) : selectedDate
  );
  const [time, setTime] = useState(() => 
    event.dateTime 
      ? format(new Date(event.dateTime), "HH:mm") 
      : format(selectedDate, "HH:mm")
  );
  const [duration, setDuration] = useState(() => event.duration || 60);
  const [location, setLocation] = useState(() => event.location || "office");
  const [notes, setNotes] = useState(() => event.notes || "");
  const [sendEmail, setSendEmail] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | undefined>(() =>
    clientId || event.clientId
  );

  // Riferimento per tenere traccia dello stato precedente del dialog
  const prevOpenRef = useRef(false);

  // Ottieni i dati del cliente dal clientId attualmente selezionato
  const { data: clientData, isLoading: isClientLoading } = useQuery({
    queryKey: ['client', selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return null;
      const response = await apiRequest(`/api/clients/${selectedClientId}`);
      if (!response) {
        console.warn(`Risposta API vuota per ID: ${selectedClientId}`);
        return null;
      }
      if (response.data) {
        return response.data;
      } else if (response.client) {
        return response.client;
      } else {
        console.warn(`Dati cliente non trovati per ID: ${selectedClientId}`, response);
        return null;
      }
    },
    enabled: open && !!selectedClientId,
    staleTime: 60000, // Cache per 1 minuto
    retry: 2,
  });

  // Ottieni lista clienti se useClientSelector è true
  const { data: clientsList, isLoading: isClientsLoading } = useQuery({
    queryKey: ['clients-list'],
    queryFn: async () => {
      console.log("Caricamento lista clienti da API in CalendarDialog");
      const response = await apiRequest('/api/clients');
      return response.clients || [];
    },
    enabled: open && useClientSelector,
    staleTime: 60000, // Cache per 1 minuto
  });

  // Reset completo dello stato quando il dialog passa da chiuso ad aperto
  useEffect(() => {
    // Se il dialog passa da chiuso ad aperto
    if (open && !prevOpenRef.current) {
      // Inizializza tutti i valori del form in base alle props
      setTitle(event.title || "");
      setDate(event.dateTime ? new Date(event.dateTime) : selectedDate);
      setTime(event.dateTime 
        ? format(new Date(event.dateTime), "HH:mm") 
        : format(selectedDate, "HH:mm"));
      setDuration(event.duration || 60);
      setLocation(event.location || "office");
      setNotes(event.notes || "");
      setSelectedClientId(clientId || event.clientId);
      setSendEmail(false);
      
      console.log(`Reset completo del CalendarDialog:`, {
        mode,
        clientId,
        eventClientId: event.clientId
      });
    }
    
    // Aggiorna il ref per il prossimo render
    prevOpenRef.current = open;
  }, [open, event, selectedDate, clientId, mode]);

  // Costruisci la data/ora completa dal date + time
  const getDateTime = (): string => {
    if (!date) return new Date().toISOString();
    
    const [hours, minutes] = time.split(':').map(Number);
    const newDate = new Date(date);
    newDate.setHours(hours, minutes, 0, 0);
    
    return newDate.toISOString();
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!title.trim()) {
      toast({
        title: "Attenzione",
        description: "Il titolo dell'evento è obbligatorio",
        variant: "destructive",
      });
      return;
    }

    if (!selectedClientId) {
      toast({
        title: "Attenzione",
        description: "Seleziona un cliente per l'evento",
        variant: "destructive",
      });
      return;
    }

    if (!date) {
      toast({
        title: "Attenzione",
        description: "Seleziona una data per l'evento",
        variant: "destructive",
      });
      return;
    }

    const updatedEvent: CalendarEvent = {
      ...event,
      clientId: selectedClientId,
      title: title,
      dateTime: getDateTime(),
      duration: duration,
      location: location,
      notes: notes
    };

    try {
      onSubmit(updatedEvent, sendEmail);
      
      // Reset del form
      setTitle("");
      setDate(new Date());
      setTime("10:00");
      setDuration(60);
      setLocation("office");
      setNotes("");
      setSendEmail(false);
      
      // Chiudi il dialog
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la creazione dell'evento",
        variant: "destructive",
      });
    }
  };

  // Rendering del selettore cliente
  const renderClientField = () => {
    // Log per debug
    console.log("Rendering client field:", {
      useClientSelector,
      isClientsLoading,
      clientsListLength: clientsList?.length || 0,
      selectedClientId,
      isClientLoading
    });
    
    // Se abbiamo attivato il selettore clienti
    if (useClientSelector) {
      if (isClientsLoading) {
        return (
          <div className="p-2 border rounded-md bg-gray-50">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-3/4 mt-1" />
          </div>
        );
      }

      if (clientsList && clientsList.length > 0) {
        return (
          <Select 
            value={selectedClientId?.toString() || ""}
            onValueChange={(value) => {
              const id = parseInt(value);
              console.log(`Cliente selezionato nel dropdown: ${id}`);
              setSelectedClientId(id);
            }}
          >
            <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500">
              <SelectValue placeholder="Seleziona un cliente" />
            </SelectTrigger>
            <SelectContent>
              {clientsList.map((client: Client) => (
                <SelectItem key={client.id} value={client.id.toString()}>
                  {client.firstName} {client.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      } else {
        // Non ci sono clienti disponibili
        return (
          <div className="p-2 border rounded-md bg-yellow-50 text-yellow-800">
            <span>Nessun cliente disponibile per la selezione</span>
          </div>
        );
      }
    }

    // Se abbiamo un cliente specifico
    if (selectedClientId) {
      if (isClientLoading) {
        return (
          <div className="p-2 border rounded-md bg-gray-50">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-3/4 mt-1" />
          </div>
        );
      }

      // Cliente specifico
      if (clientData) {
        return (
          <div className="p-2 border rounded-md bg-gray-50 text-gray-800">
            <span>
              {clientData.firstName} {clientData.lastName}
            </span>
          </div>
        );
      } else {
        // Cliente non trovato ma abbiamo un ID
        console.log("Cliente non trovato ma ID presente:", selectedClientId);
        return (
          <div className="p-2 border rounded-md bg-yellow-50 text-yellow-800">
            <span>Caricamento cliente in corso... ({selectedClientId})</span>
          </div>
        );
      }
    }

    // Fallback, non dovrebbe mai accadere
    return (
      <div className="p-2 border rounded-md bg-red-50 text-red-800">
        <span>Nessun cliente selezionato</span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-lg shadow-xl border-0">
        <div className="bg-gradient-to-r from-green-500 to-teal-600 p-4 text-white">
          <DialogTitle className="text-xl font-bold">
            {mode === "create" ? t("Nuovo appuntamento") : t("Modifica appuntamento")}
          </DialogTitle>
          <DialogDescription className="text-green-100 mt-1">
            {t("Programma un incontro con il cliente")}
          </DialogDescription>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {/* Cliente */}
            <div className="space-y-2">
              <Label htmlFor="client" className="text-sm font-medium flex items-center">
                <CalendarDays className="h-4 w-4 mr-2 text-green-500" />
                <span>Cliente:</span>
              </Label>
              
              {renderClientField()}
            </div>
            
            {/* Titolo */}
            <div className="space-y-2">
              <Label htmlFor="event-title" className="text-sm font-medium flex items-center">
                <span>Titolo:</span>
              </Label>
              <Input 
                id="event-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Titolo dell'appuntamento"
              />
            </div>
            
            {/* Data e ora */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-green-500" />
                  <span>Data:</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      {date ? (
                        format(date, "dd MMMM yyyy", { locale: it })
                      ) : (
                        <span>Seleziona una data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-green-500" />
                  <span>Ora:</span>
                </Label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* Durata e Luogo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Durata:</Label>
                <Select
                  value={duration.toString()}
                  onValueChange={(value) => setDuration(parseInt(value))}
                >
                  <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Seleziona durata" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minuti</SelectItem>
                    <SelectItem value="60">1 ora</SelectItem>
                    <SelectItem value="90">1 ora e 30 minuti</SelectItem>
                    <SelectItem value="120">2 ore</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-green-500" />
                  <span>Luogo:</span>
                </Label>
                <Select
                  value={location}
                  onValueChange={setLocation}
                >
                  <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Seleziona luogo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="office">Ufficio</SelectItem>
                    <SelectItem value="client_office">Ufficio del cliente</SelectItem>
                    <SelectItem value="zoom">Videochiamata Zoom</SelectItem>
                    <SelectItem value="teams">Videochiamata Teams</SelectItem>
                    <SelectItem value="phone">Telefonata</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Note */}
            <div className="space-y-2">
              <Label htmlFor="event-notes" className="text-sm font-medium">
                Note:
              </Label>
              <Textarea 
                id="event-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px] bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Note aggiuntive sull'appuntamento..."
              />
            </div>

            {/* Notifica email */}
            <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <Label>{t("Invia notifica via email")}</Label>
                <p className="text-sm text-muted-foreground">
                  Una email di promemoria sarà inviata al cliente
                </p>
              </div>
              <Switch
                checked={sendEmail}
                onCheckedChange={setSendEmail}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="bg-gray-50 p-4 flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="bg-white"
          >
            {t("Annulla")}
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!title.trim() || !selectedClientId || !date}
            className="bg-green-600 hover:bg-green-700 gap-2"
          >
            {mode === "create" ? (
              <>
                <Calendar className="h-4 w-4" />
                {t("Crea appuntamento")}
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {t("Aggiorna appuntamento")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 