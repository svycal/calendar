import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Temporal } from 'temporal-polyfill';
import { cn } from '@/lib/utils';
import {
  generateTimeSlots,
  formatDateLabel,
  formatTimeRange,
} from '@/lib/time';
import { computePositionedEvents, groupByResource } from '@/lib/overlap';
import {
  computeUnavailableBlocks,
  type UnavailableBlock,
} from '@/lib/availability';
import type {
  AllDayCalendarEvent,
  CalendarEvent,
  ResourceGridViewClassNames,
  ResourceGridViewProps,
  SelectedRange,
  TimedCalendarEvent,
} from '@/types/calendar';
import { resourceGridViewDefaults } from './defaults';
import { GridHeader } from './GridHeader';
import { ResourceColumn } from './ResourceColumn';
import { TimeGutter } from '../shared/TimeGutter';
import { SlotInteractionLayer } from '../shared/SlotInteractionLayer';
import { SelectionOverlay } from '../shared/SelectionOverlay';
import { UnavailabilityOverlay } from '../shared/UnavailabilityOverlay';
import { NowIndicator } from '../shared/NowIndicator';
import { AllDayRow } from '../shared/AllDayRow';
import { useEffectiveHourHeight } from '../shared/useEffectiveHourHeight';
import { useAnnouncer } from '../shared/useAnnouncer';

export function ResourceGridView({
  date,
  timeZone,
  resources,
  events,
  availability,
  unavailability,
  defaultUnavailable,
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
}: ResourceGridViewProps) {
  const startHour = timeAxis?.startHour ?? 0;
  const endHour = timeAxis?.endHour ?? 24;
  const intervalMinutes = timeAxis?.intervalMinutes ?? 60;

  const { effectiveHourHeight, rootRef, headerRef, allDayRef, headerHeight } =
    useEffectiveHourHeight(hourHeight, endHour - startHour);

  const cls = useCallback(
    (key: keyof ResourceGridViewClassNames) =>
      cn(resourceGridViewDefaults[key], classNames?.[key]),
    [classNames]
  );

  // Keep the selection overlay mounted briefly after clearing so popover
  // close transitions can finish without losing their reference element.
  const staleSelectionRef = useRef<SelectedRange | null>(null);
  const lingerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [staleSelection, setStaleSelection] = useState<SelectedRange | null>(
    null
  );

  useEffect(() => {
    if (selectedRange) {
      // New selection starting — cancel any pending linger timer
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

  const allDayByResource = useMemo(
    () => groupByResource(allDayEvents),
    [allDayEvents]
  );

  const positionedByResource = useMemo(
    () =>
      computePositionedEvents(
        timedEvents,
        timeZone,
        date,
        startHour,
        endHour,
        effectiveHourHeight
      ),
    [timedEvents, timeZone, date, startHour, endHour, effectiveHourHeight]
  );

  const unavailableByResource = useMemo(() => {
    if (!defaultUnavailable && !availability && !unavailability)
      return new Map<string, UnavailableBlock[]>();

    // Collect all resource IDs that need evaluation
    const resourceIds = new Set([
      ...Object.keys(availability ?? {}),
      ...Object.keys(unavailability ?? {}),
      ...(defaultUnavailable ? resources.map((r) => r.id) : []),
    ]);

    const map = new Map<string, UnavailableBlock[]>();
    for (const resourceId of resourceIds) {
      const availableRanges = availability?.[resourceId];
      const effectiveAvailable =
        defaultUnavailable && availableRanges === undefined
          ? []
          : availableRanges;

      const blocks = computeUnavailableBlocks(
        effectiveAvailable,
        unavailability?.[resourceId],
        timeZone,
        date,
        startHour,
        endHour,
        effectiveHourHeight
      );
      if (blocks.length > 0) {
        map.set(resourceId, blocks);
      }
    }
    return map;
  }, [
    defaultUnavailable,
    resources,
    availability,
    unavailability,
    timeZone,
    date,
    startHour,
    endHour,
    effectiveHourHeight,
  ]);

  const { message: announcerMessage, announce } = useAnnouncer();

  const gridAriaLabel = useMemo(
    () => `Schedule for ${formatDateLabel(date)}`,
    [date]
  );

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
        const resource = resources.find((r) => r.id === event.resourceId);
        if (resource) parts.push(resource.name);
        announce(`Selected: ${parts.join(', ')}`);
      } else {
        const parts = [event.title, 'all day'];
        if (event.clientName) parts.push(event.clientName);
        announce(`Selected: ${parts.join(', ')}`);
      }
    },
    [onSelect, onEventClick, timeZone, resources, announce]
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
      const selectedRangeValue: SelectedRange = {
        resourceId: range.columnId,
        startTime: range.startTime,
        endTime: range.endTime,
      };
      onSelect?.(selectedRangeValue);
      const parts = [formatTimeRange(range.startTime, range.endTime, timeZone)];
      const resource = resources.find((r) => r.id === range.columnId);
      if (resource) parts.push(resource.name);
      announce(`Selected time: ${parts.join(', ')}`);
    },
    [onSelect, timeZone, resources, announce]
  );

  const handleSlotClick = useCallback(
    (info: {
      columnId: string;
      startTime: Temporal.ZonedDateTime;
      endTime: Temporal.ZonedDateTime;
    }) => {
      const resource = resources.find((r) => r.id === info.columnId);
      if (!resource) return;
      onSlotClick?.({
        resource,
        startTime: info.startTime,
        endTime: info.endTime,
      });
    },
    [onSlotClick, resources]
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

  return (
    <div ref={rootRef} className={cn(cls('root'), className)}>
      <div
        className={cls('grid')}
        role="region"
        aria-roledescription="calendar"
        aria-label={gridAriaLabel}
        style={{
          display: 'grid',
          gridTemplateColumns: `max-content repeat(${resources.length}, minmax(${columnMinWidth}px, 1fr))`,
          gridTemplateRows: `auto auto repeat(${timeSlots.length}, ${rowHeight}px)`,
        }}
      >
        {/* Corner cell */}
        <div
          ref={headerRef}
          className={cls('cornerCell')}
          style={{ gridRow: 1, gridColumn: 1 }}
        >
          {renderCorner?.({ timeZone, date })}
        </div>

        {/* Header cells */}
        {resources.map((resource, i) => (
          <GridHeader
            key={resource.id}
            resource={resource}
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
        {resources.map((resource, i) => (
          <div
            key={`allday-${resource.id}`}
            className={cls('allDayCell')}
            style={{
              gridRow: 2,
              gridColumn: i + 2,
              top: headerHeight,
              ...(i === resources.length - 1 ? { borderRightWidth: 0 } : {}),
            }}
          >
            <AllDayRow
              events={allDayByResource.get(resource.id) ?? []}
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
          resources.map((resource, colIdx) => (
            <div
              key={`${slot.index}-${resource.id}`}
              className={cls(slot.isHourStart ? 'bodyCell' : 'bodyCellMinor')}
              style={{
                gridRow: slot.index + 3,
                gridColumn: colIdx + 2,
                ...(!slot.isHourStart
                  ? { borderTopStyle: 'dotted' as const }
                  : {}),
                ...(slot.index === 0 ? { borderTopWidth: 0 } : {}),
                ...(colIdx === resources.length - 1
                  ? { borderRightWidth: 0 }
                  : {}),
              }}
            />
          ))
        )}

        {/* Unavailability overlays */}
        {resources.map((resource, i) => {
          const blocks = unavailableByResource.get(resource.id);
          if (!blocks) return null;
          return (
            <UnavailabilityOverlay
              key={`unavail-${resource.id}`}
              blocks={blocks}
              column={i + 2}
              cls={cls}
            />
          );
        })}

        {/* Slot interaction layers (between body cells and event columns) */}
        {snapDuration != null &&
          resources.map((resource, i) => (
            <SlotInteractionLayer
              key={`slot-${resource.id}`}
              columnId={resource.id}
              fallbackColor={resource.color}
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

        {/* Resource columns with events */}
        {resources.map((resource, i) => (
          <ResourceColumn
            key={resource.id}
            resource={resource}
            positionedEvents={positionedByResource.get(resource.id) ?? []}
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

        {/* Selection overlay (after resource columns so it stacks on top) */}
        {effectiveSelectedRange != null &&
          (() => {
            const colIdx = resources.findIndex(
              (r) => r.id === effectiveSelectedRange.resourceId
            );
            if (colIdx === -1) return null;
            return (
              <SelectionOverlay
                startTime={effectiveSelectedRange.startTime}
                endTime={effectiveSelectedRange.endTime}
                fallbackColor={resources[colIdx].color}
                column={colIdx + 2}
                viewDate={date}
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

        {/* Now indicator */}
        <NowIndicator
          date={date}
          timeZone={timeZone}
          startHour={startHour}
          endHour={endHour}
          hourHeight={effectiveHourHeight}
          cls={cls}
        />
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
