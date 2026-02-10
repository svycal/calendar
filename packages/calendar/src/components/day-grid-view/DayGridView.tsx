import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Temporal } from 'temporal-polyfill';
import { cn } from '@/lib/utils';
import {
  generateTimeSlots,
  formatTimeRange,
  generateDateRange,
  formatDayOfWeek,
} from '@/lib/time';
import {
  computePositionedEventsByDate,
  groupAllDayByDate,
} from '@/lib/overlap';
import type {
  AllDayCalendarEvent,
  CalendarEvent,
  DayGridSelectedRange,
  DayGridViewClassNames,
  DayGridViewProps,
  TimedCalendarEvent,
} from '@/types/calendar';
import { dayGridViewDefaults } from './defaults';
import { DayHeader } from './DayHeader';
import { DayColumn } from './DayColumn';
import { TimeGutter } from '../shared/TimeGutter';
import { SlotInteractionLayer } from '../shared/SlotInteractionLayer';
import { SelectionOverlay } from '../shared/SelectionOverlay';
import { NowIndicator } from '../shared/NowIndicator';
import { AllDayRow } from '../shared/AllDayRow';
import { useEffectiveHourHeight } from '../shared/useEffectiveHourHeight';
import { useAnnouncer } from '../shared/useAnnouncer';

export function DayGridView({
  activeRange,
  timeZone,
  events,
  timeAxis,
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
  eventGap,
  eventLayout = 'columns',
  stackOffset = 8,
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

  const { effectiveHourHeight, rootRef, headerRef, allDayRef, headerHeight } =
    useEffectiveHourHeight(hourHeight, endHour - startHour);

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

  const allDayByDate = useMemo(
    () => groupAllDayByDate(allDayEvents, dates),
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

      if (!event.allDay) {
        const parts = [
          event.title,
          formatTimeRange(event.startTime, event.endTime, timeZone),
        ];
        if (event.clientName) parts.push(event.clientName);
        announce(`Selected: ${parts.join(', ')}`);
      } else {
        const parts = [event.title, 'all day'];
        if (event.clientName) parts.push(event.clientName);
        announce(`Selected: ${parts.join(', ')}`);
      }
    },
    [onSelect, onEventClick, timeZone, announce]
  );

  const handleSlotInteractionSelect = useCallback(
    (
      range: {
        columnId: string;
        startTime: Temporal.ZonedDateTime;
        endTime: Temporal.ZonedDateTime;
      } | null
    ) => {
      if (!range) {
        onSelect?.(null);
        return;
      }
      const dayGridRange: DayGridSelectedRange = {
        startTime: range.startTime,
        endTime: range.endTime,
      };
      onSelect?.(dayGridRange);
      const parts = [formatTimeRange(range.startTime, range.endTime, timeZone)];
      announce(`Selected time: ${parts.join(', ')}`);
    },
    [onSelect, timeZone, announce]
  );

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

        {/* All-day cells */}
        {dates.map((date, i) => (
          <div
            key={`allday-${date.toString()}`}
            className={cls('allDayCell')}
            style={{
              gridRow: 2,
              gridColumn: i + 2,
              top: headerHeight,
              ...(i === dates.length - 1 ? { borderRightWidth: 0 } : {}),
            }}
          >
            <AllDayRow
              events={allDayByDate.get(date.toString()) ?? []}
              cls={cls}
              onEventClick={handleEventClick}
              selectedEventId={selectedEventId}
              selectedEventRef={selectedEventRef}
            />
          </div>
        ))}

        {/* Gutter cells */}
        {timeSlots.map((slot) => (
          <TimeGutter
            key={slot.index}
            label={slot.label}
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
          />
        ))}

        {/* Selection overlay */}
        {effectiveSelectedRange != null &&
          (() => {
            const selDate = effectiveSelectedRange.startTime
              .withTimeZone(timeZone)
              .toPlainDate();
            const colIdx = dates.findIndex(
              (d) => Temporal.PlainDate.compare(d, selDate) === 0
            );
            if (colIdx === -1) return null;
            return (
              <SelectionOverlay
                startTime={effectiveSelectedRange.startTime}
                endTime={effectiveSelectedRange.endTime}
                column={colIdx + 2}
                viewDate={dates[colIdx]}
                timeZone={timeZone}
                startHour={startHour}
                hourHeight={effectiveHourHeight}
                cls={cls}
                appearance={selectionAppearance}
                selectionRef={selectionRef}
                renderEvent={renderEvent}
              />
            );
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
