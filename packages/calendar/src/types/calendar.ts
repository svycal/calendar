import type { ReactNode } from 'react';

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
  clientName?: string;
  status?: 'confirmed' | 'canceled';
  metadata?: Record<string, unknown>;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface AvailabilityRange {
  startTime: string;
  endTime: string;
}

export interface SelectedRange {
  resourceId: string;
  startTime: string;
  endTime: string;
}

export interface TimeAxisConfig {
  startHour?: number;
  endHour?: number;
  intervalMinutes?: number;
}

export interface ResourceGridViewClassNames {
  root?: string;
  grid?: string;
  cornerCell?: string;
  headerCell?: string;
  headerName?: string;
  headerAvatar?: string;
  gutterCell?: string;
  gutterCellMinor?: string;
  gutterLabel?: string;
  bodyCell?: string;
  bodyCellMinor?: string;
  eventColumn?: string;
  event?: string;
  eventColorBar?: string;
  eventTitle?: string;
  eventTime?: string;
  eventClientName?: string;
  nowIndicator?: string;
  slotHighlight?: string;
  selectionHighlight?: string;
  unavailableOverlay?: string;
}

export interface PositionedEvent {
  event: CalendarEvent;
  top: number;
  height: number;
  subColumn: number;
  totalSubColumns: number;
}

export interface ResourceGridViewProps {
  date: string;
  timeZone: string;
  resources: CalendarResource[];
  events: CalendarEvent[];
  availability?: Record<string, AvailabilityRange[]>;
  unavailability?: Record<string, AvailabilityRange[]>;
  timeAxis?: TimeAxisConfig;
  onEventClick?: (event: CalendarEvent) => void;
  slotDuration?: number;
  onSlotClick?: (info: {
    resource: CalendarResource;
    startTime: string;
    endTime: string;
  }) => void;
  className?: string;
  selectedRange?: SelectedRange | null;
  onSelect?: (range: SelectedRange | null) => void;
  classNames?: ResourceGridViewClassNames;
  hourHeight?: number;
  columnMinWidth?: number;
  renderHeader?: (props: { resource: CalendarResource }) => ReactNode;
  renderEvent?: (
    event: CalendarEvent,
    position: PositionedEvent,
  ) => ReactNode;
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
