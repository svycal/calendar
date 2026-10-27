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
  /** Plain-text label used for aria-label attributes and screen reader announcements.
   *  When title or clientName are ReactNode elements, set this to avoid "[object Object]" in accessible labels. */
  ariaLabel?: string;
  /**
   * Higher values are packed into earlier columns, so they stay visible
   * when overlapping events are capped. Default: 0.
   */
  priority?: number;
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
  'highlight' | { style: 'event'; eventData?: SelectionEventData };

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
  overflowChip?: string;
  overflowChipLabel?: string;
  overflowPopover?: string;
  overflowPopoverEvent?: string;
  overflowPopoverTitle?: string;
  overflowPopoverTime?: string;
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
  /** How many sub-columns this event spans. Defaults to 1 when omitted. */
  colSpan?: number;
  /** Full-width overlay drawn above packed neighbors (promoted overflow events). */
  overlay?: boolean;
}

export interface OverflowClickInfo {
  events: TimedCalendarEvent[];
  anchor: HTMLElement;
}

export interface OverflowPopoverRenderProps {
  events: TimedCalendarEvent[];
  onClose: () => void;
  onEventClick?: (event: CalendarEvent) => void;
}

export interface ResourceGridViewProps {
  date: Temporal.PlainDate;
  timeZone: string;
  resources: CalendarResource[];
  events: CalendarEvent[];
  availability?: Record<string, AvailabilityRange[]>;
  unavailability?: Record<string, AvailabilityRange[]>;
  defaultUnavailable?: boolean;
  timeAxis?: TimeAxisConfig;
  /**
   * Hour of day (in the grid's time zone) to scroll into view on initial mount,
   * and whenever the active date changes. Fractional hours are allowed
   * (e.g. 6.5 = 6:30 AM). Clamped to the timeAxis range. When omitted, the grid
   * keeps its current default (scrolled to the top of the timeAxis).
   *
   * This only sets the *initial* scroll for a given date — it does not fight the
   * user's manual scrolling, and it does not re-scroll on data/prop updates
   * other than a date change.
   */
  initialScrollHour?: number;
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
  /**
   * Minimum width in pixels for a side-by-side event column. Used to derive
   * how many overlapping events can stay visible before collapsing extras
   * into a "+N more" chip. Set to `0` to disable the width-based cap.
   * Default: 80.
   */
  eventMinWidth?: number;
  /**
   * Hard cap on how many overlapping events are shown side-by-side (or
   * stacked). Combined with `eventMinWidth` as
   * `min(eventMaxStack, floor(columnWidth / eventMinWidth))`. Omit for no
   * hard cap.
   */
  eventMaxStack?: number;
  onOverflowClick?: (info: OverflowClickInfo) => void;
  renderOverflowPopover?: (props: OverflowPopoverRenderProps) => ReactNode;
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
  defaultUnavailable?: boolean;
  timeAxis?: TimeAxisConfig;
  /**
   * Hour of day (in the grid's time zone) to scroll into view on initial mount,
   * and whenever the active range changes. Fractional hours are allowed
   * (e.g. 6.5 = 6:30 AM). Clamped to the timeAxis range. When omitted, the grid
   * keeps its current default (scrolled to the top of the timeAxis).
   *
   * This only sets the *initial* scroll for a given range — it does not fight
   * the user's manual scrolling, and it does not re-scroll on data/prop updates
   * other than a range change.
   */
  initialScrollHour?: number;
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
  /**
   * Minimum width in pixels for a side-by-side event column. Used to derive
   * how many overlapping events can stay visible before collapsing extras
   * into a "+N more" chip. Set to `0` to disable the width-based cap.
   * Default: 80.
   */
  eventMinWidth?: number;
  /**
   * Hard cap on how many overlapping events are shown side-by-side (or
   * stacked). Combined with `eventMinWidth` as
   * `min(eventMaxStack, floor(columnWidth / eventMinWidth))`. Omit for no
   * hard cap.
   */
  eventMaxStack?: number;
  onOverflowClick?: (info: OverflowClickInfo) => void;
  renderOverflowPopover?: (props: OverflowPopoverRenderProps) => ReactNode;
}

export interface MonthSelectedRange {
  startDate: Temporal.PlainDate;
  /** Inclusive */
  endDate: Temporal.PlainDate;
}

export interface MonthOverflowClickInfo {
  date: Temporal.PlainDate;
  /** Every event on the day, in display order (including the visible ones). */
  events: CalendarEvent[];
  anchor: HTMLElement;
}

export interface MonthOverflowPopoverRenderProps {
  date: Temporal.PlainDate;
  events: CalendarEvent[];
  onClose: () => void;
  onEventClick?: (event: CalendarEvent) => void;
}

export interface MonthViewClassNames {
  root?: string;
  grid?: string;
  headerCell?: string;
  week?: string;
  dayCell?: string;
  dayCellOutside?: string;
  dayNumber?: string;
  dayNumberToday?: string;
  dayNumberOutside?: string;
  dayNumberButton?: string;
  event?: string;
  eventSelected?: string;
  eventColorBar?: string;
  eventTitle?: string;
  eventTime?: string;
  timedEvent?: string;
  timedEventSelected?: string;
  timedEventDot?: string;
  timedEventTime?: string;
  timedEventTitle?: string;
  moreButton?: string;
  selectionHighlight?: string;
  morePopover?: string;
  morePopoverHeader?: string;
  morePopoverWeekday?: string;
  morePopoverDayNumber?: string;
  morePopoverEvents?: string;
}

export interface MonthViewProps {
  /** The month to display. */
  month: Temporal.PlainYearMonth;
  timeZone: string;
  events: CalendarEvent[];
  /** First day of the week, using Temporal's numbering (1 = Monday … 7 = Sunday). Default: 7. */
  weekStartsOn?: number;
  /** Always render six week rows, so the grid height doesn't change between months. Default: false. */
  fixedWeekCount?: boolean;
  /**
   * Minimum height in pixels for each week row. Rows grow to fill the
   * container; when the container is shorter than this, the grid scrolls.
   * Default: 100.
   */
  minWeekHeight?: number;
  /** Height in pixels of each event row inside a day cell. Default: 20. */
  eventHeight?: number;
  /** Hard cap on event rows per day (including the "+N more" row). Omit to fit as many as the cell height allows. */
  maxEventRows?: number;
  onEventClick?: (event: CalendarEvent) => void;
  /** Called when the day number is clicked (e.g. to navigate to a day view). */
  onDayNumberClick?: (date: Temporal.PlainDate) => void;
  /** Controlled day-range selection. */
  selectedRange?: MonthSelectedRange | null;
  /** Called when the user clicks or drags across empty day space, or clears the selection. */
  onSelect?: (range: MonthSelectedRange | null) => void;
  /** Ref attached to the selection in the last selected week, for positioning popovers. */
  selectionRef?: Ref<HTMLDivElement>;
  /**
   * How the selection renders. Default `{ style: 'event' }`: a placeholder bar
   * (titled "(No title)" unless `eventData.title` is set) pinned to the top of
   * each selected day. `'highlight'` tints the selected day cells instead.
   */
  selectionAppearance?: SelectionAppearance;
  selectedEventId?: string | null;
  /**
   * Ref attached to the selected event. When the event is hidden behind a
   * "+N more" button, the ref attaches to that button instead.
   */
  selectedEventRef?: Ref<HTMLElement>;
  onOverflowClick?: (info: MonthOverflowClickInfo) => void;
  renderOverflowPopover?: (props: MonthOverflowPopoverRenderProps) => ReactNode;
  renderHeader?: (props: {
    dayOfWeek: number;
    date: Temporal.PlainDate;
  }) => ReactNode;
  className?: string;
  classNames?: MonthViewClassNames;
}
