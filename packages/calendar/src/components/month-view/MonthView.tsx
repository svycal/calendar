import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Temporal } from 'temporal-polyfill';
import { cn } from '@/lib/utils';
import { formatDayOfWeek } from '@/lib/time';
import {
  DAYS_PER_WEEK,
  applyMonthOverflow,
  getMonthEventSpan,
  getMonthWeeks,
  layoutMonthWeek,
  type MonthEventSpan,
} from '@/lib/month';
import { describeEvent } from '@/lib/accessibility';
import type {
  CalendarEvent,
  MonthSelectedRange,
  MonthViewClassNames,
  MonthViewProps,
  SelectionAppearance,
} from '@/types/calendar';
import { useAnnouncer } from '../shared/useAnnouncer';
import { monthViewDefaults } from './defaults';
import {
  DAY_HEADER_HEIGHT,
  LANE_GAP,
  MonthWeekRow,
  type SelectedEventAnchor,
} from './MonthWeekRow';

const BOTTOM_PADDING = 2;
const SELECTION_PLACEHOLDER_ID = '__month-view-selection__';
const DEFAULT_SELECTION_APPEARANCE: SelectionAppearance = { style: 'event' };

function orderRange(
  a: Temporal.PlainDate,
  b: Temporal.PlainDate
): MonthSelectedRange {
  return Temporal.PlainDate.compare(a, b) <= 0
    ? { startDate: a, endDate: b }
    : { startDate: b, endDate: a };
}

/** Inclusive columns of `range` that fall in `dates`, or null. */
function weekHighlight(
  range: MonthSelectedRange | null | undefined,
  dates: Temporal.PlainDate[]
) {
  if (!range) return null;
  const weekStart = dates[0];
  const weekEnd = dates[dates.length - 1];
  if (
    Temporal.PlainDate.compare(range.startDate, weekEnd) > 0 ||
    Temporal.PlainDate.compare(range.endDate, weekStart) < 0
  ) {
    return null;
  }
  const startCol =
    Temporal.PlainDate.compare(range.startDate, weekStart) < 0
      ? 0
      : range.startDate.since(weekStart, { largestUnit: 'days' }).days;
  const endCol =
    Temporal.PlainDate.compare(range.endDate, weekEnd) > 0
      ? dates.length - 1
      : range.endDate.since(weekStart, { largestUnit: 'days' }).days;
  return { startCol, endCol };
}

export function MonthView({
  month,
  timeZone,
  events,
  weekStartsOn = 7,
  fixedWeekCount = false,
  minWeekHeight = 100,
  eventHeight = 20,
  maxEventRows,
  onEventClick,
  onDayNumberClick,
  selectedRange,
  onSelect,
  selectionRef,
  selectionAppearance = DEFAULT_SELECTION_APPEARANCE,
  selectedEventId,
  selectedEventRef,
  onOverflowClick,
  renderOverflowPopover,
  renderHeader,
  className,
  classNames,
}: MonthViewProps) {
  const cls = useCallback(
    (key: keyof MonthViewClassNames) =>
      cn(monthViewDefaults[key], classNames?.[key]),
    [classNames]
  );

  const todayStr = useMemo(
    () => Temporal.Now.plainDateISO(timeZone).toString(),
    [timeZone]
  );

  const weeks = useMemo(
    () => getMonthWeeks(month, weekStartsOn, fixedWeekCount),
    [month, weekStartsOn, fixedWeekCount]
  );

  // Measure a week row to work out how many event rows fit in each day
  const gridRef = useRef<HTMLDivElement>(null);
  const [weekHeight, setWeekHeight] = useState(minWeekHeight);

  useLayoutEffect(() => {
    const week =
      gridRef.current?.querySelector<HTMLElement>('[data-month-week]');
    if (!week) return;
    const measure = () => setWeekHeight(week.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(week);
    return () => observer.disconnect();
  }, [weeks]);

  const lanes = Math.max(
    1,
    Math.min(
      maxEventRows ?? Infinity,
      Math.floor(
        (weekHeight - DAY_HEADER_HEIGHT - LANE_GAP - BOTTOM_PADDING) /
          (eventHeight + LANE_GAP)
      )
    )
  );

  const spans = useMemo(
    () => events.map((event) => getMonthEventSpan(event, timeZone)),
    [events, timeZone]
  );

  const { message: announcerMessage, announce } = useAnnouncer();

  const handleEventClick = useCallback(
    (event: CalendarEvent) => {
      onSelect?.(null);
      onEventClick?.(event);
      announce(`Selected: ${describeEvent(event, timeZone)}`);
    },
    [onSelect, onEventClick, timeZone, announce]
  );

  // Drag across days to select a range; a click selects a single day
  const [dragRange, setDragRange] = useState<MonthSelectedRange | null>(null);
  const dragAnchorRef = useRef<Temporal.PlainDate | null>(null);
  const dragCurrentRef = useRef<Temporal.PlainDate | null>(null);
  const weeksRef = useRef(weeks);
  const onSelectRef = useRef(onSelect);
  const announceRef = useRef(announce);

  const handleDocMouseMove = useCallback((e: MouseEvent) => {
    const anchor = dragAnchorRef.current;
    const grid = gridRef.current;
    if (!anchor || !grid) return;
    const week = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest<HTMLElement>('[data-month-week]');
    if (!week || !grid.contains(week)) return;
    const dates = weeksRef.current[Number(week.dataset.monthWeek)];
    if (!dates) return;
    const rect = week.getBoundingClientRect();
    const col = Math.min(
      DAYS_PER_WEEK - 1,
      Math.max(
        0,
        Math.floor((e.clientX - rect.left) / (rect.width / DAYS_PER_WEEK))
      )
    );
    const date = dates[col];
    if (
      dragCurrentRef.current &&
      Temporal.PlainDate.compare(dragCurrentRef.current, date) === 0
    ) {
      return;
    }
    dragCurrentRef.current = date;
    setDragRange(orderRange(anchor, date));
  }, []);

  const handleDocMouseUpRef = useRef<() => void>(() => {});

  const handleDocMouseUp = useCallback(() => {
    const anchor = dragAnchorRef.current;
    const current = dragCurrentRef.current;
    dragAnchorRef.current = null;
    dragCurrentRef.current = null;
    setDragRange(null);
    document.removeEventListener('mousemove', handleDocMouseMove);
    document.removeEventListener('mouseup', handleDocMouseUpRef.current);
    if (!anchor || !current) return;
    const range = orderRange(anchor, current);
    onSelectRef.current?.(range);
    const startLabel = range.startDate.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
    });
    const endLabel = range.endDate.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
    });
    announceRef.current(
      Temporal.PlainDate.compare(range.startDate, range.endDate) === 0
        ? `Selected ${startLabel}`
        : `Selected ${startLabel} to ${endLabel}`
    );
  }, [handleDocMouseMove]);

  useLayoutEffect(() => {
    weeksRef.current = weeks;
    onSelectRef.current = onSelect;
    announceRef.current = announce;
    handleDocMouseUpRef.current = handleDocMouseUp;
  });

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleDocMouseMove);
      document.removeEventListener('mouseup', handleDocMouseUpRef.current);
    };
  }, [handleDocMouseMove]);

  const handleCellMouseDown = useCallback(
    (date: Temporal.PlainDate, e: React.MouseEvent) => {
      if (!onSelect || e.button !== 0) return;
      e.preventDefault(); // Prevent text selection
      onSelect(null);
      dragAnchorRef.current = date;
      dragCurrentRef.current = date;
      setDragRange({ startDate: date, endDate: date });
      document.addEventListener('mousemove', handleDocMouseMove);
      document.addEventListener('mouseup', handleDocMouseUp);
    },
    [onSelect, handleDocMouseMove, handleDocMouseUp]
  );

  useEffect(() => {
    if (!selectedRange || !onSelect) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSelect(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedRange, onSelect]);

  const highlightRange = dragRange ?? selectedRange;
  const isHighlightAppearance = selectionAppearance === 'highlight';
  const placeholderData = isHighlightAppearance
    ? undefined
    : selectionAppearance.eventData;
  const placeholderTitle = placeholderData?.title;
  const placeholderColor = placeholderData?.color;
  const placeholderStatus = placeholderData?.status;

  const highlights = useMemo(
    () =>
      weeks.map((dates) =>
        isHighlightAppearance ? weekHighlight(highlightRange, dates) : null
      ),
    [weeks, highlightRange, isHighlightAppearance]
  );
  // Attach selectionRef to the selection in the last selected week
  const selectionRefWeek = useMemo(() => {
    if (dragRange || !selectedRange) return -1;
    for (let w = weeks.length - 1; w >= 0; w--) {
      if (weekHighlight(selectedRange, weeks[w])) return w;
    }
    return -1;
  }, [dragRange, selectedRange, weeks]);

  // In event mode the selection renders as a placeholder bar pinned to the
  // top lane of each selected day, like Google Calendar's "(No title)" chip.
  const placeholderSpan = useMemo<MonthEventSpan | null>(() => {
    if (!highlightRange || isHighlightAppearance) return null;
    const { startDate, endDate } = highlightRange;
    return {
      event: {
        title: placeholderTitle ?? '(No title)',
        color: placeholderColor,
        status: placeholderStatus,
        id: SELECTION_PLACEHOLDER_ID,
        resourceId: '',
        allDay: true,
        startDate,
        endDate,
      },
      startDate,
      endDate,
      isBar: true,
      sortStart: 0,
      pinned: true,
    };
  }, [
    highlightRange,
    isHighlightAppearance,
    placeholderTitle,
    placeholderColor,
    placeholderStatus,
  ]);

  const layoutSpans = useMemo(
    () => (placeholderSpan ? [...spans, placeholderSpan] : spans),
    [spans, placeholderSpan]
  );

  const weekLayouts = useMemo(
    () =>
      weeks.map((dates) =>
        applyMonthOverflow(layoutMonthWeek(layoutSpans, dates), dates, lanes)
      ),
    [weeks, layoutSpans, lanes]
  );

  // The selected event's ref goes to its first visible segment, or to the
  // "+N more" button hiding it when it isn't visible anywhere.
  const selectedEventAnchors = useMemo(() => {
    const anchors = new Map<number, SelectedEventAnchor>();
    if (!selectedEventId) return anchors;
    const visibleWeek = weekLayouts.findIndex((layout) =>
      layout.visibleSegments.some((seg) => seg.event.id === selectedEventId)
    );
    if (visibleWeek !== -1) {
      anchors.set(visibleWeek, { kind: 'segment' });
      return anchors;
    }
    for (let w = 0; w < weekLayouts.length; w++) {
      const col = weekLayouts[w].days.findIndex(
        (day) =>
          day.moreCount > 0 && day.events.some((e) => e.id === selectedEventId)
      );
      if (col !== -1) {
        anchors.set(w, { kind: 'more', col });
        break;
      }
    }
    return anchors;
  }, [weekLayouts, selectedEventId]);

  const gridAriaLabel = useMemo(
    () =>
      month
        .toPlainDate({ day: 1 })
        .toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    [month]
  );

  return (
    <div data-month-view="" className={cn(cls('root'), className)}>
      <div
        ref={gridRef}
        className={cls('grid')}
        role="region"
        aria-roledescription="calendar"
        aria-label={gridAriaLabel}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${DAYS_PER_WEEK}, minmax(0, 1fr))`,
          gridTemplateRows: `auto repeat(${weeks.length}, minmax(${minWeekHeight}px, 1fr))`,
        }}
      >
        {weeks[0].map((date, i) => (
          <div
            key={date.dayOfWeek}
            role="columnheader"
            className={cls('headerCell')}
            style={{
              gridRow: 1,
              gridColumn: i + 1,
              ...(i === DAYS_PER_WEEK - 1 ? { borderRightWidth: 0 } : {}),
            }}
          >
            {renderHeader
              ? renderHeader({ dayOfWeek: date.dayOfWeek, date })
              : formatDayOfWeek(date)}
          </div>
        ))}

        {weekLayouts.map((layout, w) => (
          <MonthWeekRow
            key={layout.dates[0].toString()}
            weekIndex={w}
            layout={layout}
            month={month}
            todayStr={todayStr}
            lanes={lanes}
            eventHeight={eventHeight}
            timeZone={timeZone}
            cls={cls}
            onEventClick={handleEventClick}
            onDayNumberClick={onDayNumberClick}
            onCellMouseDown={onSelect ? handleCellMouseDown : undefined}
            onOverflowClick={onOverflowClick}
            renderOverflowPopover={renderOverflowPopover}
            highlight={highlights[w]}
            selectionRef={w === selectionRefWeek ? selectionRef : undefined}
            selectedEventId={selectedEventId}
            selectedEventAnchor={selectedEventAnchors.get(w) ?? null}
            selectedEventRef={selectedEventRef}
          />
        ))}
      </div>
      <div
        aria-live="polite"
        aria-atomic="true"
        role="status"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          borderWidth: 0,
        }}
      >
        {announcerMessage}
      </div>
    </div>
  );
}
