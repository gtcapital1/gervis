import React from 'react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { Calendar, Clock, MapPin, User, Edit, Brain } from 'lucide-react';

interface Meeting {
  id?: number;
  clientId?: number;
  title: string;
  dateTime: string;
  duration: number;
  location?: string;
  notes?: string;
  client?: {
    firstName: string;
    lastName: string;
  };
  clientName?: string;
}

interface MeetingCardProps {
  meetings: Meeting[];
  title?: string;
  description?: string;
  onEditMeeting?: (meeting: Meeting) => void;
  onPrepareMeeting?: (meeting: Meeting) => void;
}

// Funzione per ottenere il nome del luogo
const getLocationName = (location: string) => {
  switch (location) {
    case 'office':
      return 'Ufficio';
    case 'client_office':
      return 'Ufficio del cliente';
    case 'zoom':
      return 'Videochiamata Zoom';
    case 'teams':
      return 'Videochiamata Teams';
    case 'phone':
      return 'Telefonata';
    default:
      return location;
  }
};

// Funzione per formattare la durata
const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return hours === 1 ? '1h' : `${hours}h`;
  return `${hours}h${remainingMinutes}m`;
};

export default function MeetingCard({ 
  meetings, 
  title = "Appuntamenti", 
  description,
  onEditMeeting,
  onPrepareMeeting
}: MeetingCardProps) {
  if (!meetings || meetings.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto bg-white rounded shadow-sm text-sm p-3 border-l-4 border-blue-500">
        <div className="font-medium text-blue-700 mb-1">{title}</div>
        {description && <div className="text-xs text-gray-500 mb-2">{description}</div>}
        <div className="text-gray-500">Nessun appuntamento trovato</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded shadow-sm border-l-4 border-blue-500 overflow-hidden">
      <div className="p-2 bg-blue-50">
        <div className="font-medium text-blue-700 text-sm">{title}</div>
        {description && <div className="text-xs text-gray-500">{description}</div>}
      </div>
      <div className="divide-y divide-gray-100">
        {meetings.map((meeting, index) => {
          const meetingDate = parseISO(meeting.dateTime);
          
          // Utilizza clientName se disponibile, altrimenti usa i dati del client, altrimenti mostra l'ID
          const clientName = meeting.clientName || 
            (meeting.client ? `${meeting.client.firstName} ${meeting.client.lastName}` : 
            (meeting.clientId ? `Cliente ${meeting.clientId}` : 'Cliente non specificato'));
          
          return (
            <div 
              key={meeting.id || index} 
              className="px-3 py-2 text-sm flex items-center hover:bg-gray-50"
            >
              {/* Prima colonna: cliente */}
              <div className="flex-1 flex items-center min-w-0 pr-2">
                <div className="flex items-center gap-1 flex-shrink-0">
                  <User className="h-3.5 w-3.5 text-blue-500" />
                  <span className="font-medium text-gray-800">{clientName}</span>
                </div>
              </div>
              
              {/* Seconda colonna: dettagli temporali e luogo */}
              <div className="flex items-center gap-2 flex-shrink-0 text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-blue-500" />
                  {format(meetingDate, "EEE d MMM", { locale: it })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-blue-500" />
                  {format(meetingDate, "HH:mm", { locale: it })}
                </span>
                <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs">
                  {formatDuration(meeting.duration)}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-blue-500" />
                  {getLocationName(meeting.location || 'office')}
                </span>
              </div>
              
              {/* Bottoni di azione */}
              <div className="flex items-center gap-2 ml-3">
                <button 
                  className="p-1.5 text-xs rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors flex items-center"
                  aria-label="Modifica appuntamento"
                  title="Modifica appuntamento"
                  onClick={() => onEditMeeting && onEditMeeting(meeting)}
                >
                  <Edit className="h-3.5 w-3.5" />
                </button>
                
                <button 
                  className="px-2 py-1 text-xs rounded-full bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700 transition-colors flex items-center"
                  aria-label="Prepara appuntamento con Gervis"
                  title="Prepara appuntamento con Gervis"
                  onClick={() => onPrepareMeeting && onPrepareMeeting(meeting)}
                >
                  <Brain className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                  <span>Prepara con Gervis</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 