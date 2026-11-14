import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Temporal } from 'temporal-polyfill';
import { cn } from '@/lib/utils';
import {
  generateTimeSlots,
  formatTimeRange,
  generateDateRange,
  formatDayOfWeek,
  shiftDays,
} from '@/lib/time';
import {
  computePositionedEventsByDate,
  layoutAllDayEvents,
} from '@/lib/overlap';
import {
  computeUnavailableBlocks,
  type UnavailableBlock,
} from '@/lib/availability';
import type {
  AllDayCalendarEvent,
  BackgroundEvent,
  CalendarEvent,
  DayGridSelectedRange,
  DayGridViewClassNames,
  DayGridViewProps,
  TimedCalendarEvent,
} from '@/types/calendar';
import { UnavailabilityOverlay } from '../shared/UnavailabilityOverlay';
import { dayGridViewDefaults } from './defaults';
import { DayHeader } from './DayHeader';
import { DayColumn } from './DayColumn';
import { TimeGutter } from '../shared/TimeGutter';
import {
  SlotInteractionLayer,
  type DragPreview,
  type SlotRange,
} from '../shared/SlotInteractionLayer';
import { BackgroundEventLayer } from './BackgroundEventLayer';
import { SelectionOverlay } from '../shared/SelectionOverlay';
import { NowIndicator } from '../shared/NowIndicator';
import { AllDaySection } from './AllDaySection';
import { useEffectiveHourHeight } from '../shared/useEffectiveHourHeight';
import { useInitialScroll } from '../shared/useInitialScroll';
import { useAnnouncer } from '../shared/useAnnouncer';
import { describeEvent } from '@/lib/accessibility';

export function DayGridView({
  activeRange,
  timeZone,
  events,
  availability,
  unavailability,
  defaultUnavailable,
  timeAxis,
  initialScrollHour,
  scrollKey,
  onEventClick,
  snapDuration,
  placeholderDuration,
  selectedRange,
  onSelect,
  onSlotClick,
  className,
  classNames,
  hourHeight = 60,
  columnMinWidth = 120,
  renderHeader,
  renderEvent,
  selectionAppearance,
  dragPreviewAppearance,
  selectionRef,
  selectionLingerMs = 0,
  selectedEventId,
  selectedEventRef,
  renderCorner,
  formatGutterLabel,
  backgroundEvents,
  renderBackgroundEvent,
  onSlotHover,
  multiDaySelection = false,
  eventGap,
  eventLayout = 'columns',
  stackOffset = 8,
  eventMinWidth,
  eventMaxStack,
  onOverflowClick,
  renderOverflowPopover,
}: DayGridViewProps) {
  const startHour = timeAxis?.startHour ?? 0;
  const endHour = timeAxis?.endHour ?? 24;
  const intervalMinutes = timeAxis?.intervalMinutes ?? 60;

  const dates = useMemo(
    () => generateDateRange(activeRange.startDate, activeRange.endDate),
    [activeRange.startDate, activeRange.endDate]
  );

  const todayStr = useMemo(() => {
    return Temporal.Now.plainDateISO(timeZone).toString();
  }, [timeZone]);

  const {
    effectiveHourHeight,
    rootRef,
    headerRef,
    allDayRef,
    gridRef,
    headerHeight,
    containerHeight,
  } = useEffectiveHourHeight(hourHeight, endHour - startHour);

  useInitialScroll({
    rootRef,
    initialScrollHour,
    startHour,
    endHour,
    effectiveHourHeight,
    containerHeight,
    scrollKey: `${activeRange.startDate.toString()}/${activeRange.endDate.toString()}/${scrollKey ?? ''}`,
  });

  const cls = useCallback(
    (key: keyof DayGridViewClassNames) =>
      cn(dayGridViewDefaults[key], classNames?.[key]),
    [classNames]
  );

  // Keep the selection overlay mounted briefly after clearing so popover
  // close transitions can finish without losing their reference element.
  const staleSelectionRef = useRef<DayGridSelectedRange | null>(null);
  const lingerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [staleSelection, setStaleSelection] =
    useState<DayGridSelectedRange | null>(null);

  useEffect(() => {
    if (selectedRange) {
      if (lingerTimerRef.current !== null) {
        clearTimeout(lingerTimerRef.current);
        lingerTimerRef.current = null;
      }
      staleSelectionRef.current = selectedRange;
    } else if (staleSelectionRef.current && selectionLingerMs > 0) {
      const last = staleSelectionRef.current;
      staleSelectionRef.current = null;
      setStaleSelection(last);
      lingerTimerRef.current = setTimeout(() => {
        lingerTimerRef.current = null;
        setStaleSelection(null);
      }, selectionLingerMs);
    }
  }, [selectedRange, selectionLingerMs]);

  const effectiveSelectedRange = selectedRange ?? staleSelection;

  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);

  // Each selected day repeats the range's time window. A range without
  // `endDate` covers one day.
  const selectionSegments = useMemo(() => {
    if (!effectiveSelectedRange || effectiveSelectedRange.allDay) return [];
    const { startTime, endTime, endDate } = effectiveSelectedRange;
    const startDate = startTime.withTimeZone(timeZone).toPlainDate();
    const dayCount = endDate ? startDate.until(endDate).days + 1 : 1;
    return Array.from({ length: Math.max(dayCount, 1) }, (_, i) => ({
      startTime: shiftDays(startTime, i, timeZone),
      endTime: shiftDays(endTime, i, timeZone),
    }));
  }, [effectiveSelectedRange, timeZone]);

  // Whole days selected from the all-day row, drawn there.
  const selectedDays = useMemo(() => {
    if (!effectiveSelectedRange?.allDay) return null;
    const startDate = effectiveSelectedRange.startTime
      .withTimeZone(timeZone)
      .toPlainDate();
    return {
      startDate,
      endDate: effectiveSelectedRange.endDate ?? startDate,
    };
  }, [effectiveSelectedRange, timeZone]);

  // Each day column's part of a multi-day drag preview, by date.
  const previewRangeByDate = useMemo(() => {
    const map = new Map<string, { startMin: number; endMin: number }>();
    if (!dragPreview) return map;
    const anchor = Temporal.PlainDate.from(dragPreview.columnId);
    const end = Temporal.PlainDate.from(dragPreview.endColumnId);
    const first = Temporal.PlainDate.compare(anchor, end) <= 0 ? anchor : end;
    const dayCount = Math.abs(anchor.until(end).days) + 1;
    const range = {
      startMin: dragPreview.startMin,
      endMin: dragPreview.endMin,
    };
    for (let i = 0; i < dayCount; i++) {
      map.set(first.add({ days: i }).toString(), range);
    }
    return map;
  }, [dragPreview]);

  const timeSlots = useMemo(
    () => generateTimeSlots({ startHour, endHour, intervalMinutes }),
    [startHour, endHour, intervalMinutes]
  );

  const { allDayEvents, timedEvents } = useMemo(() => {
    const allDay: AllDayCalendarEvent[] = [];
    const timed: TimedCalendarEvent[] = [];
    for (const event of events) {
      if (event.allDay) {
        allDay.push(event);
      } else {
        timed.push(event);
      }
    }
    return { allDayEvents: allDay, timedEvents: timed };
  }, [events]);

  const positionedAllDayEvents = useMemo(
    () => layoutAllDayEvents(allDayEvents, dates),
    [allDayEvents, dates]
  );

  const positionedByDate = useMemo(
    () =>
      computePositionedEventsByDate(
        timedEvents,
        timeZone,
        dates,
        startHour,
        endHour,
        effectiveHourHeight
      ),
    [timedEvents, timeZone, dates, startHour, endHour, effectiveHourHeight]
  );

  const effectiveAvailability = useMemo(
    () => (defaultUnavailable ? (availability ?? []) : availability),
    [defaultUnavailable, availability]
  );

  const unavailableByDate = useMemo(() => {
    if (effectiveAvailability === undefined && !unavailability)
      return new Map<string, UnavailableBlock[]>();

    const map = new Map<string, UnavailableBlock[]>();
    for (const date of dates) {
      const blocks = computeUnavailableBlocks(
        effectiveAvailability,
        unavailability,
        timeZone,
        date,
        startHour,
        endHour,
        effectiveHourHeight
      );
      if (blocks.length > 0) {
        map.set(date.toString(), blocks);
      }
    }
    return map;
  }, [
    effectiveAvailability,
    unavailability,
    timeZone,
    dates,
    startHour,
    endHour,
    effectiveHourHeight,
  ]);

  const { message: announcerMessage, announce } = useAnnouncer();

  const gridAriaLabel = useMemo(() => {
    const startStr = formatDayOfWeek(activeRange.startDate);
    const endStr = formatDayOfWeek(activeRange.endDate);
    return `Schedule for ${startStr} to ${endStr}`;
  }, [activeRange.startDate, activeRange.endDate]);

  const handleEventClick = useCallback(
    (event: CalendarEvent) => {
      onSelect?.(null);
      onEventClick?.(event);

      announce(`Selected: ${describeEvent(event, timeZone)}`);
    },
    [onSelect, onEventClick, timeZone, announce]
  );

  const handleOverflowClick = useCallback(
    (info: Parameters<NonNullable<DayGridViewProps['onOverflowClick']>>[0]) => {
      onSelect?.(null);
      onOverflowClick?.(info);
    },
    [onSelect, onOverflowClick]
  );

  const handleSlotInteractionSelect = useCallback(
    (range: SlotRange | null) => {
      if (!range) {
        onSelect?.(null);
        return;
      }
      const dayGridRange: DayGridSelectedRange = {
        startTime: range.startTime,
        endTime: range.endTime,
      };
      if (range.endColumnId && range.endColumnId !== range.columnId) {
        const anchor = Temporal.PlainDate.from(range.columnId);
        const other = Temporal.PlainDate.from(range.endColumnId);
        const offset = anchor.until(other).days;
        if (offset < 0) {
          dayGridRange.startTime = shiftDays(range.startTime, offset, timeZone);
          dayGridRange.endTime = shiftDays(range.endTime, offset, timeZone);
          dayGridRange.endDate = anchor;
        } else {
          dayGridRange.endDate = other;
        }
      }
      onSelect?.(dayGridRange);
      const parts = [formatTimeRange(range.startTime, range.endTime, timeZone)];
      if (dayGridRange.endDate) {
        parts.push(
          `${formatDayOfWeek(
            dayGridRange.startTime.withTimeZone(timeZone).toPlainDate()
          )} to ${formatDayOfWeek(dayGridRange.endDate)}`
        );
      }
      announce(`Selected time: ${parts.join(', ')}`);
    },
    [onSelect, timeZone, announce]
  );

  const handleSelectDays = useCallback(
    (
      days: {
        startDate: Temporal.PlainDate;
        endDate: Temporal.PlainDate;
      } | null
    ) => {
      if (!days) {
        onSelect?.(null);
        return;
      }
      const { startDate, endDate } = days;
      const range: DayGridSelectedRange = {
        startTime: startDate.toZonedDateTime(timeZone),
        endTime: startDate.add({ days: 1 }).toZonedDateTime(timeZone),
        allDay: true,
      };
      if (Temporal.PlainDate.compare(endDate, startDate) > 0) {
        range.endDate = endDate;
      }
      onSelect?.(range);
      announce(
        `Selected days: ${formatDayOfWeek(startDate)} to ${formatDayOfWeek(endDate)}`
      );
    },
    [onSelect, timeZone, announce]
  );

  // The day column under the pointer. The pointer is first clamped to the
  // visible part of the grid, right of the sticky gutter, so a drag past an
  // edge picks the outermost visible column rather than a scrolled-out one.
  const resolveColumnId = useCallback(
    (clientX: number): string | null => {
      const columns =
        gridRef.current?.querySelectorAll<HTMLElement>('[data-day-column]');
      const root = rootRef.current;
      const gutter = allDayRef.current;
      if (!columns || columns.length === 0 || !root || !gutter) return null;
      const x = Math.min(
        Math.max(clientX, gutter.getBoundingClientRect().right),
        root.getBoundingClientRect().right - 1
      );
      for (const column of columns) {
        if (x < column.getBoundingClientRect().right) {
          return column.dataset.dayColumn ?? null;
        }
      }
      return columns[columns.length - 1].dataset.dayColumn ?? null;
    },
    [gridRef, rootRef, allDayRef]
  );

  const handleSlotHover = useCallback(
    (range: SlotRange | null) => {
      onSlotHover?.(
        range && {
          date: Temporal.PlainDate.from(range.columnId),
          startTime: range.startTime,
          endTime: range.endTime,
        }
      );
    },
    [onSlotHover]
  );

  const belowEvents = useMemo(
    () => (backgroundEvents ?? []).filter((e) => e.layer !== 'above'),
    [backgroundEvents]
  );
  const aboveEvents = useMemo(
    () => (backgroundEvents ?? []).filter((e) => e.layer === 'above'),
    [backgroundEvents]
  );

  const renderBackgroundLayers = (events: BackgroundEvent[], layer: string) =>
    events.length > 0 &&
    dates.map((date, i) => (
      <BackgroundEventLayer
        key={`${layer}-${date.toString()}`}
        events={events}
        date={date}
        column={i + 2}
        timeZone={timeZone}
        startHour={startHour}
        endHour={endHour}
        hourHeight={effectiveHourHeight}
        renderBackgroundEvent={renderBackgroundEvent}
      />
    ));

  const handleSlotClick = useCallback(
    (info: {
      columnId: string;
      startTime: Temporal.ZonedDateTime;
      endTime: Temporal.ZonedDateTime;
    }) => {
      const date = Temporal.PlainDate.from(info.columnId);
      onSlotClick?.({
        date,
        startTime: info.startTime,
        endTime: info.endTime,
      });
    },
    [onSlotClick]
  );

  useEffect(() => {
    if (!selectedRange || !onSelect) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSelect(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedRange, onSelect]);

  const rowHeight = (effectiveHourHeight * intervalMinutes) / 60;

  // Find today index for now indicator
  const todayDate = dates.find((d) => d.toString() === todayStr);

  return (
    <div ref={rootRef} className={cn(cls('root'), className)}>
      <div
        ref={gridRef}
        className={cls('grid')}
        role="region"
        aria-roledescription="calendar"
        aria-label={gridAriaLabel}
        style={{
          display: 'grid',
          gridTemplateColumns: `max-content repeat(${dates.length}, minmax(${columnMinWidth}px, 1fr))`,
          gridTemplateRows: `auto auto repeat(${timeSlots.length}, ${rowHeight}px)`,
        }}
      >
        {/* Corner cell */}
        <div
          ref={headerRef}
          className={cls('cornerCell')}
          style={{ gridRow: 1, gridColumn: 1 }}
        >
          {renderCorner?.({ timeZone })}
        </div>

        {/* Header cells */}
        {dates.map((date, i) => (
          <DayHeader
            key={date.toString()}
            date={date}
            isToday={date.toString() === todayStr}
            column={i + 2}
            cls={cls}
            renderHeader={renderHeader}
          />
        ))}

        {/* All-day gutter cell */}
        <div
          ref={allDayRef}
          className={cn(cls('allDayCell'), 'left-0 z-30')}
          style={{
            gridRow: 2,
            gridColumn: 1,
            top: headerHeight,
          }}
        />

        {/* All-day section (subgrid spanning all date columns) */}
        <AllDaySection
          positioned={positionedAllDayEvents}
          dates={dates}
          headerHeight={headerHeight}
          cls={cls}
          onEventClick={handleEventClick}
          selectedEventId={selectedEventId}
          selectedEventRef={selectedEventRef}
          onSelectDays={
            multiDaySelection && onSelect ? handleSelectDays : undefined
          }
          resolveColumnId={resolveColumnId}
          selectedDays={selectedDays}
          selectionRef={selectionRef}
        />

        {/* Gutter cells */}
        {timeSlots.map((slot) => (
          <TimeGutter
            key={slot.index}
            label={
              formatGutterLabel
                ? formatGutterLabel(
                    Temporal.PlainTime.from({
                      hour: slot.hour,
                      minute: slot.minute,
                    })
                  )
                : slot.label
            }
            row={slot.index + 3}
            isHourStart={slot.isHourStart}
            isFirst={slot.index === 0}
            cls={cls}
          />
        ))}

        {/* Body cells */}
        {timeSlots.map((slot) =>
          dates.map((date, colIdx) => (
            <div
              key={`${slot.index}-${date.toString()}`}
              className={cls(slot.isHourStart ? 'bodyCell' : 'bodyCellMinor')}
              style={{
                gridRow: slot.index + 3,
                gridColumn: colIdx + 2,
                ...(!slot.isHourStart
                  ? { borderTopStyle: 'dotted' as const }
                  : {}),
                ...(slot.index === 0 ? { borderTopWidth: 0 } : {}),
                ...(colIdx === dates.length - 1 ? { borderRightWidth: 0 } : {}),
              }}
            />
          ))
        )}

        {/* Unavailability overlays */}
        {dates.map((date, i) => {
          const blocks = unavailableByDate.get(date.toString());
          if (!blocks) return null;
          return (
            <UnavailabilityOverlay
              key={`unavail-${date.toString()}`}
              blocks={blocks}
              column={i + 2}
              cls={cls}
            />
          );
        })}

        {/* Background events beneath timed events */}
        {renderBackgroundLayers(belowEvents, 'below')}

        {/* Slot interaction layers */}
        {snapDuration != null &&
          dates.map((date, i) => (
            <SlotInteractionLayer
              key={`slot-${date.toString()}`}
              columnId={date.toString()}
              column={i + 2}
              date={date}
              timeZone={timeZone}
              startHour={startHour}
              endHour={endHour}
              hourHeight={effectiveHourHeight}
              snapDuration={snapDuration}
              placeholderDuration={placeholderDuration ?? 15}
              cls={cls}
              onSlotClick={onSlotClick ? handleSlotClick : undefined}
              onSelect={onSelect ? handleSlotInteractionSelect : undefined}
              onSlotHover={onSlotHover ? handleSlotHover : undefined}
              resolveColumnId={
                multiDaySelection && onSelect ? resolveColumnId : undefined
              }
              onDragPreviewChange={
                multiDaySelection && onSelect ? setDragPreview : undefined
              }
              previewRange={previewRangeByDate.get(date.toString()) ?? null}
              dragPreviewAppearance={dragPreviewAppearance}
              renderEvent={renderEvent}
            />
          ))}

        {/* Day columns with events */}
        {dates.map((date, i) => (
          <DayColumn
            key={date.toString()}
            positionedEvents={positionedByDate.get(date.toString()) ?? []}
            column={i + 2}
            timeZone={timeZone}
            cls={cls}
            onEventClick={handleEventClick}
            renderEvent={renderEvent}
            eventGap={eventGap}
            eventLayout={eventLayout}
            stackOffset={stackOffset}
            selectedEventId={selectedEventId}
            selectedEventRef={selectedEventRef}
            eventMinWidth={eventMinWidth}
            eventMaxStack={eventMaxStack}
            onOverflowClick={handleOverflowClick}
            renderOverflowPopover={renderOverflowPopover}
          />
        ))}

        {/* Background events above timed events */}
        {renderBackgroundLayers(aboveEvents, 'above')}

        {/* Selection overlay */}
        {(() => {
          let refAttached = false;
          return selectionSegments.map((segment) => {
            const selDate = segment.startTime
              .withTimeZone(timeZone)
              .toPlainDate();
            const colIdx = dates.findIndex(
              (d) => Temporal.PlainDate.compare(d, selDate) === 0
            );
            if (colIdx === -1) return null;
            // selectionRef goes to the first visible day
            const segmentRef = refAttached ? undefined : selectionRef;
            refAttached = true;
            return (
              <SelectionOverlay
                key={`selection-${selDate.toString()}`}
                startTime={segment.startTime}
                endTime={segment.endTime}
                column={colIdx + 2}
                viewDate={dates[colIdx]}
                timeZone={timeZone}
                startHour={startHour}
                endHour={endHour}
                hourHeight={effectiveHourHeight}
                cls={cls}
                appearance={selectionAppearance}
                selectionRef={segmentRef}
                renderEvent={renderEvent}
              />
            );
          });
        })()}

        {/* Now indicator — only if today is in the active range */}
        {todayDate && (
          <NowIndicator
            date={todayDate}
            timeZone={timeZone}
            startHour={startHour}
            endHour={endHour}
            hourHeight={effectiveHourHeight}
            cls={cls}
          />
        )}
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
