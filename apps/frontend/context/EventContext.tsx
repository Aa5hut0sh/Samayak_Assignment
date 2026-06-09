'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const EventContext = createContext<any>(null);

export const EventProvider = ({ children }: { children: React.ReactNode }) => {
  const [lastEvent, setLastEvent] = useState<any>(null);

  useEffect(() => {
    const eventSource = new EventSource("http://localhost:3001/api/events/dashboard-stream");

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setLastEvent(data);
    };

    return () => eventSource.close();
  }, []);

  return (
    <EventContext.Provider value={{ lastEvent }}>
      {children}
    </EventContext.Provider>
  );
};

export const useEvents = () => useContext(EventContext);