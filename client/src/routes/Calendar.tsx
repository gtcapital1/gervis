import React from 'react';
import CalendarView from '@/components/CalendarView';

const Calendar = () => {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Calendario Appuntamenti</h1>
      <CalendarView />
    </div>
  );
};

export default Calendar; 