export interface CalendarEvent {
  id?: number;
  clientId: number;
  clientName?: string;
  title: string;
  location?: string;
  dateTime: string;
  duration: number;
  notes?: string;
} 