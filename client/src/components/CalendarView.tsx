import React, { useEffect, useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/lib/utils';
import { format, addHours, parseISO, isSameDay, getHours, setHours, startOfDay, endOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import api from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';

// Define meeting interface
interface Meeting {
  id: number;
  clientId: number;
  advisorId: number;
  subject: string;
  title?: string;
  location?: string;
  dateTime: string;
  duration: number;
  notes?: string;
  createdAt: string;
}

// Define client interface
interface Client {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
}

const CalendarView = () => {
  const { user } = useAuth();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [location, setLocation] = useState('zoom');
  const [meetingTime, setMeetingTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [notes, setNotes] = useState('');
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [meetingsForSelectedDate, setMeetingsForSelectedDate] = useState<Meeting[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<number | null>(null);

  // Fetch meetings and clients on component mount
  useEffect(() => {
    fetchMeetings();
    fetchClients();
  }, []);

  // Filter meetings for selected date
  useEffect(() => {
    if (date && meetings.length > 0) {
      console.log('Filtering meetings for date:', date);
      console.log('Available meetings:', meetings);
      
      const filtered = meetings.filter(meeting => {
        const meetingDate = parseISO(meeting.dateTime);
        const isSame = isSameDay(meetingDate, date);
        console.log(`Meeting ${meeting.id}: ${meeting.dateTime} - isSameDay: ${isSame}`);
        return isSame;
      });
      
      console.log('Filtered meetings for selected date:', filtered);
      setMeetingsForSelectedDate(filtered);
    } else {
      setMeetingsForSelectedDate([]);
    }
  }, [date, meetings]);

  // Fetch all meetings for the logged-in advisor
  const fetchMeetings = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching meetings...');
      const response = await api.get('/api/meetings');
      console.log('Meetings response:', response.data);
      
      if (response.data.success) {
        console.log('Setting meetings in state:', response.data.meetings);
        setMeetings(response.data.meetings);
        
        // Debug meeting dates
        if (response.data.meetings && response.data.meetings.length > 0) {
          response.data.meetings.forEach((meeting: Meeting) => {
            const meetingDate = parseISO(meeting.dateTime);
            console.log(`Meeting ${meeting.id} date: ${meeting.dateTime}, parsed:`, meetingDate);
          });
        }
      } else {
        console.warn('Failed to fetch meetings:', response.data.message);
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare gli appuntamenti',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all clients for the logged-in advisor
  const fetchClients = async () => {
    try {
      const response = await api.get('/api/clients');
      if (response.data.success) {
        setClients(response.data.clients);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare i clienti',
        variant: 'destructive',
      });
    }
  };

  // Handle dialog close and form reset
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setIsEditMode(false);
    resetForm();
  };

  // Reset form fields
  const resetForm = () => {
    setSelectedClient('');
    setSubject('');
    setLocation('zoom');
    setMeetingTime('');
    setDuration('60');
    setNotes('');
    setSelectedMeeting(null);
  };

  // Open dialog to add new meeting
  const handleAddMeeting = () => {
    setIsEditMode(false);
    if (date) {
      const timeNow = new Date();
      const defaultTime = `${timeNow.getHours().toString().padStart(2, '0')}:${timeNow.getMinutes().toString().padStart(2, '0')}`;
      setMeetingTime(defaultTime);
    }
    setIsDialogOpen(true);
  };

  // Open dialog to edit existing meeting
  const handleEditMeeting = (meeting: Meeting) => {
    setIsEditMode(true);
    setSelectedMeeting(meeting);
    setSelectedClient(meeting.clientId.toString());
    setSubject(meeting.subject);
    setLocation(meeting.location || 'zoom');
    
    const meetingDate = new Date(meeting.dateTime);
    setMeetingTime(`${meetingDate.getHours().toString().padStart(2, '0')}:${meetingDate.getMinutes().toString().padStart(2, '0')}`);
    
    setDuration(meeting.duration.toString());
    setNotes(meeting.notes || '');
    setIsDialogOpen(true);
  };

  // Handle meeting submission (create or update)
  const handleSubmit = async () => {
    if (!date || !selectedClient || !subject || !meetingTime) {
      toast({
        title: 'Dati mancanti',
        description: 'Completa tutti i campi obbligatori',
        variant: 'destructive',
      });
      return;
    }

    // Check if user is authenticated
    if (!user?.id) {
      toast({
        title: 'Errore',
        description: 'Utente non autenticato. Impossibile salvare il meeting.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const [hours, minutes] = meetingTime.split(':').map(Number);
      const meetingDateTime = new Date(date);
      meetingDateTime.setHours(hours, minutes, 0, 0);

      const meetingData = {
        clientId: parseInt(selectedClient),
        advisorId: user.id, // Use the current user ID from auth context
        subject,
        location,
        dateTime: meetingDateTime.toISOString(),
        duration: parseInt(duration),
        notes,
        sendEmail: true
      };

      console.log('Sending meeting data:', meetingData);

      let response;
      if (isEditMode && selectedMeeting) {
        // Update existing meeting
        console.log(`Updating meeting with ID ${selectedMeeting.id}`);
        response = await api.put(`/api/meetings/${selectedMeeting.id}`, meetingData);
        console.log('Update response:', response.data);
        toast({
          title: 'Appuntamento aggiornato',
          description: 'L\'appuntamento è stato modificato con successo',
        });
      } else {
        // Create new meeting
        console.log('Creating new meeting');
        response = await api.post('/api/meetings', meetingData);
        console.log('Create response:', response.data);
        toast({
          title: 'Appuntamento creato',
          description: 'Nuovo appuntamento aggiunto con successo',
        });
      }

      if (response.data.success) {
        console.log('Server reported success. Refreshing meetings list.');
        fetchMeetings();
        handleCloseDialog();
      } else {
        console.error('Server returned success:false. Details:', response.data);
        toast({
          title: 'Errore',
          description: response.data.message || 'Errore durante il salvataggio dell\'appuntamento',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error saving meeting:', error);
      if (error.response) {
        console.error('Server response:', error.response.data);
        console.error('Status code:', error.response.status);
      } else if (error.request) {
        console.error('No response received from server. Request:', error.request);
      } else {
        console.error('Error setting up request:', error.message);
      }
      toast({
        title: 'Errore',
        description: 'Impossibile salvare l\'appuntamento',
        variant: 'destructive',
      });
    }
  };

  // Handle meeting deletion
  const handleDeleteMeeting = (meetingId: number) => {
    setMeetingToDelete(meetingId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteMeeting = async () => {
    if (!meetingToDelete) return;

    try {
      const response = await api.delete(`/api/meetings/${meetingToDelete}`);
      if (response.data.success) {
        fetchMeetings();
        toast({
          title: 'Appuntamento eliminato',
          description: 'L\'appuntamento è stato eliminato con successo',
        });
      }
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile eliminare l\'appuntamento',
        variant: 'destructive',
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setMeetingToDelete(null);
    }
  };

  // Format meeting time for display
  const formatMeetingTime = (dateTimeString: string) => {
    const date = parseISO(dateTimeString);
    return format(date, 'HH:mm', { locale: it });
  };

  // Get client name by ID
  const getClientName = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.firstName} ${client.lastName}` : 'Cliente';
  };

  // Helper function to group meetings by hour for the selected date
  const getMeetingsByHour = () => {
    if (!date) return [];
    
    // Create time slots for the day (1-hour slots)
    const businessHours = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 to 19:00
    
    return businessHours.map(hour => {
      // Since we've already checked that date is not undefined above, we can safely use it here
      const currentDate = date as Date; // Cast to satisfy TypeScript
      const slotStart = setHours(currentDate, hour);
      const slotEnd = addHours(slotStart, 1);
      
      // Find meetings that start within this hour
      const slotMeetings = meetingsForSelectedDate.filter(meeting => {
        const meetingTime = parseISO(meeting.dateTime);
        const meetingHour = getHours(meetingTime);
        return meetingHour === hour;
      });
      
      return {
        hour,
        timeLabel: format(slotStart, 'HH:00', { locale: it }),
        meetings: slotMeetings
      };
    });
  };

  // Modified render for selected date meetings view with time slots
  const renderTimeSlots = () => {
    const timeSlots = getMeetingsByHour();
    
    return (
      <div className="space-y-2">
        {timeSlots.map(slot => (
          <div key={slot.hour} className="border-b pb-2 mb-2 last:border-b-0">
            <div className="flex items-center">
              <div className="w-16 font-semibold text-gray-500">{slot.timeLabel}</div>
              <div className="flex-1">
                {slot.meetings.length > 0 ? (
                  slot.meetings.map(meeting => (
                    <Card key={meeting.id} className="p-3 mb-2 border hover:shadow-md transition-shadow">
                      <div className="flex justify-between">
                        <div>
                          <h3 className="font-semibold">{meeting.subject}</h3>
                          <p className="text-xs text-gray-500">
                            {formatMeetingTime(meeting.dateTime)} - {getClientName(meeting.clientId)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {meeting.location || 'Online'} - {meeting.duration} minuti
                          </p>
                          {meeting.notes && (
                            <p className="text-xs mt-1 text-gray-700">{meeting.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => handleEditMeeting(meeting)}
                          >
                            Modifica
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => handleDeleteMeeting(meeting.id)}
                          >
                            Elimina
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div 
                    className="h-10 border border-dashed border-gray-200 rounded-md flex items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      if (date) {
                        const newDate = new Date(date);
                        newDate.setHours(slot.hour, 0, 0, 0);
                        setDate(newDate);
                        handleAddMeeting();
                      }
                    }}
                  >
                    + Aggiungi appuntamento
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-1/2">
          <Card>
            <CardHeader>
              <CardTitle>Calendario</CardTitle>
              <CardDescription>Gestisci i tuoi appuntamenti</CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={date}
                onSelect={(newDate) => {
                  console.log('Date selected:', newDate);
                  setDate(newDate);
                }}
                className="rounded-md border"
                modifiersClassNames={{
                  selected: 'bg-primary text-primary-foreground',
                  today: 'bg-accent text-accent-foreground',
                  meeting: "bg-blue-100 font-bold"
                }}
                modifiers={{
                  meeting: (calendarDate) => {
                    if (!calendarDate || !meetings || meetings.length === 0) return false;
                    
                    // Make sure we're comparing just the date parts (year, month, day)
                    const calendarDateString = calendarDate.toISOString().split('T')[0];
                    
                    const hasMeeting = meetings.some((meeting: Meeting) => {
                      let meetingDate;
                      try {
                        // Try to parse the date if it's a string
                        meetingDate = parseISO(meeting.dateTime);
                        const meetingDateString = meetingDate.toISOString().split('T')[0];
                        
                        // For debugging - log when we have a match
                        if (meetingDateString === calendarDateString) {
                          console.log(`Meeting match found for ${calendarDateString}:`, meeting);
                          return true;
                        }
                        return false;
                      } catch (e) {
                        console.error('Error parsing meeting date:', e);
                        return false;
                      }
                    });
                    
                    return hasMeeting;
                  }
                }}
              />
              <div className="mt-4 flex justify-between">
                <Button onClick={handleAddMeeting}>Aggiungi Appuntamento</Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    console.log('Manual refresh triggered');
                    fetchMeetings();
                    toast({
                      title: 'Aggiornato',
                      description: 'Calendario aggiornato',
                    });
                  }}
                >
                  Aggiorna
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:w-1/2">
          <Card>
            <CardHeader>
              <CardTitle>
                {date ? (
                  <>Agenda del {format(date, 'dd MMMM yyyy', { locale: it })}</>
                ) : (
                  <>Nessuna data selezionata</>
                )}
              </CardTitle>
              <CardDescription>
                {meetingsForSelectedDate.length > 0
                  ? `${meetingsForSelectedDate.length} appuntamenti in programma`
                  : 'Nessun appuntamento in programma'}
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-[500px] overflow-y-auto">
              {isLoading ? (
                <p>Caricamento appuntamenti...</p>
              ) : date ? (
                renderTimeSlots()
              ) : (
                <p>Seleziona una data per visualizzare gli appuntamenti.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Modifica appuntamento' : 'Nuovo appuntamento'}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? 'Modifica i dettagli dell\'appuntamento'
                : 'Inserisci i dettagli per il nuovo appuntamento'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="client" className="text-right">
                Cliente
              </Label>
              <Select
                value={selectedClient}
                onValueChange={setSelectedClient}
              >
                <SelectTrigger className="col-span-3">
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subject" className="text-right">
                Oggetto
              </Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="location" className="text-right">
                Luogo
              </Label>
              <Select
                value={location}
                onValueChange={setLocation}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleziona un luogo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zoom">Zoom</SelectItem>
                  <SelectItem value="office">Ufficio</SelectItem>
                  <SelectItem value="phone">Telefono</SelectItem>
                  <SelectItem value="other">Altro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="time" className="text-right">
                Orario
              </Label>
              <Input
                id="time"
                type="time"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="duration" className="text-right">
                Durata (min)
              </Label>
              <Select
                value={duration}
                onValueChange={setDuration}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleziona la durata" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minuti</SelectItem>
                  <SelectItem value="30">30 minuti</SelectItem>
                  <SelectItem value="45">45 minuti</SelectItem>
                  <SelectItem value="60">1 ora</SelectItem>
                  <SelectItem value="90">1 ora e 30 minuti</SelectItem>
                  <SelectItem value="120">2 ore</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right align-top mt-2">
                Note
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="col-span-3"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Annulla
            </Button>
            <Button onClick={handleSubmit}>
              {isEditMode ? 'Aggiorna' : 'Salva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Conferma cancellazione"
        description="Sei sicuro di voler cancellare questo appuntamento? Questa operazione non può essere annullata."
        confirmLabel="Cancella appuntamento"
        onConfirm={confirmDeleteMeeting}
        confirmVariant="destructive"
        showWarningIcon={true}
      />
    </div>
  );
};

export default CalendarView; 