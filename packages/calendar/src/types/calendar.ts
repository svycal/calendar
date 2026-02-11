import type { Temporal } from 'temporal-polyfill';
import type { ReactNode, Ref } from 'react';

export interface CalendarResource {
  id: string;
  name: string;
  avatarUrl?: string;
  color?: string;
}

interface BaseCalendarEvent {
  id: string;
  title: ReactNode;
  resourceId: string;
  color?: string;
  clientName?: ReactNode;
  status?: 'confirmed' | 'canceled' | 'tentative';
}

export interface TimedCalendarEvent extends BaseCalendarEvent {
  allDay?: false;
  startTime: Temporal.ZonedDateTime;
  endTime: Temporal.ZonedDateTime;
}

export interface AllDayCalendarEvent extends BaseCalendarEvent {
  allDay: true;
  startDate: Temporal.PlainDate;
  endDate: Temporal.PlainDate;
}

export type CalendarEvent = TimedCalendarEvent | AllDayCalendarEvent;

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

/** Partial event data for phantom event rendering (omits fields derived from the selection range) */
export type SelectionEventData = Partial<
  Omit<
    TimedCalendarEvent,
    'id' | 'resourceId' | 'startTime' | 'endTime' | 'allDay'
  >
>;

/** Discriminated union: simple string for highlight, object for event style */
export type SelectionAppearance =
  | 'highlight'
  | { style: 'event'; eventData?: SelectionEventData };

export interface TimeAxisConfig {
  startHour?: number;
  endHour?: number;
  intervalMinutes?: number;
}

export interface GridViewClassNames {
  root?: string;
  grid?: string;
  cornerCell?: string;
  headerCell?: string;
  headerName?: string;
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

export interface ResourceGridViewClassNames extends GridViewClassNames {
  headerAvatar?: string;
}

export interface DayGridViewClassNames extends GridViewClassNames {
  headerWeekday?: string;
  headerDayNumber?: string;
  headerToday?: string;
  allDayLane?: string;
  allDayEvent?: string;
  allDayEventSelected?: string;
  allDayEventColorBar?: string;
  allDayEventTitle?: string;
}

export type EventLayout = 'columns' | 'stacked';

export interface PositionedEvent {
  event: TimedCalendarEvent;
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
  snapDuration?: number;
  placeholderDuration?: number;
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
    event: TimedCalendarEvent;
    position: PositionedEvent;
  }) => ReactNode;
  selectionAppearance?: SelectionAppearance;
  dragPreviewAppearance?: SelectionAppearance;
  selectionRef?: Ref<HTMLDivElement>;
  /** How long (ms) the selection overlay remains in DOM after clearing, to allow popover close transitions. Default: 0 */
  selectionLingerMs?: number;
  selectedEventId?: string | null;
  selectedEventRef?: Ref<HTMLDivElement>;
  renderCorner?: (props: {
    timeZone: string;
    date: Temporal.PlainDate;
  }) => ReactNode;
  eventGap?: number;
  eventLayout?: EventLayout;
  stackOffset?: number;
}

export interface DayGridSelectedRange {
  startTime: Temporal.ZonedDateTime;
  endTime: Temporal.ZonedDateTime;
}

export interface DayGridViewProps {
  activeRange: {
    startDate: Temporal.PlainDate;
    endDate: Temporal.PlainDate;
  };
  timeZone: string;
  events: CalendarEvent[];
  availability?: AvailabilityRange[];
  unavailability?: AvailabilityRange[];
  timeAxis?: TimeAxisConfig;
  onEventClick?: (event: CalendarEvent) => void;
  snapDuration?: number;
  placeholderDuration?: number;
  onSlotClick?: (info: {
    date: Temporal.PlainDate;
    startTime: Temporal.ZonedDateTime;
    endTime: Temporal.ZonedDateTime;
  }) => void;
  className?: string;
  selectedRange?: DayGridSelectedRange | null;
  onSelect?: (range: DayGridSelectedRange | null) => void;
  classNames?: DayGridViewClassNames;
  hourHeight?: number;
  columnMinWidth?: number;
  renderHeader?: (props: {
    date: Temporal.PlainDate;
    isToday: boolean;
  }) => ReactNode;
  renderEvent?: (props: {
    event: TimedCalendarEvent;
    position: PositionedEvent;
  }) => ReactNode;
  selectionAppearance?: SelectionAppearance;
  dragPreviewAppearance?: SelectionAppearance;
  selectionRef?: Ref<HTMLDivElement>;
  selectionLingerMs?: number;
  selectedEventId?: string | null;
  selectedEventRef?: Ref<HTMLDivElement>;
  renderCorner?: (props: { timeZone: string }) => ReactNode;
  eventGap?: number;
  eventLayout?: EventLayout;
  stackOffset?: number;
}
