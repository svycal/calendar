export interface CalendarResource {
  id: string;
  name: string;
  avatarUrl?: string;
  color?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  resourceId: string;
  color?: string;
  metadata?: Record<string, unknown>;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface TimeAxisConfig {
  startHour?: number;
  endHour?: number;
  intervalMinutes?: number;
}

export interface ResourceGridViewProps {
  date: string;
  timeZone: string;
  resources: CalendarResource[];
  events: CalendarEvent[];
  availability?: TimeSlot[];
  timeAxis?: TimeAxisConfig;
  onEventClick?: (event: CalendarEvent) => void;
  className?: string;
}

export interface WeekViewProps {
  date: string;
  timeZone: string;
  resource: CalendarResource;
  events: CalendarEvent[];
  availability?: TimeSlot[];
  timeAxis?: TimeAxisConfig;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  onEventClick?: (event: CalendarEvent) => void;
  className?: string;
}
