import type { Temporal } from 'temporal-polyfill';
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
  startTime: Temporal.ZonedDateTime;
  endTime: Temporal.ZonedDateTime;
  resourceId: string;
  allDay?: boolean;
  color?: string;
  clientName?: string;
  selected?: boolean;
  status?: 'confirmed' | 'canceled';
  metadata?: Record<string, unknown>;
}

export interface TimeSlot {
  startTime: Temporal.ZonedDateTime;
  endTime: Temporal.ZonedDateTime;
  available: boolean;
}

export interface AvailabilityRange {
  startTime: Temporal.ZonedDateTime;
  endTime: Temporal.ZonedDateTime;
}

export interface SelectedRange {
  resourceId: string;
  startTime: Temporal.ZonedDateTime;
  endTime: Temporal.ZonedDateTime;
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
  eventSelected?: string;
  eventColorBar?: string;
  eventTitle?: string;
  eventTime?: string;
  eventClientName?: string;
  nowIndicator?: string;
  slotHighlight?: string;
  selectionHighlight?: string;
  allDayCell?: string;
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
  date: Temporal.PlainDate;
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
    startTime: Temporal.ZonedDateTime;
    endTime: Temporal.ZonedDateTime;
  }) => void;
  className?: string;
  selectedRange?: SelectedRange | null;
  onSelect?: (range: SelectedRange | null) => void;
  classNames?: ResourceGridViewClassNames;
  hourHeight?: number;
  columnMinWidth?: number;
  renderHeader?: (props: { resource: CalendarResource }) => ReactNode;
  renderEvent?: (props: {
    event: CalendarEvent;
    position: PositionedEvent;
  }) => ReactNode;
}

export interface WeekViewProps {
  date: Temporal.PlainDate;
  timeZone: string;
  resource: CalendarResource;
  events: CalendarEvent[];
  availability?: TimeSlot[];
  timeAxis?: TimeAxisConfig;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  onEventClick?: (event: CalendarEvent) => void;
  className?: string;
}
