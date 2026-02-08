import { useCallback, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { generateTimeSlots } from '@/lib/time';
import { computePositionedEvents } from '@/lib/overlap';
import {
  computeUnavailableBlocks,
  type UnavailableBlock,
} from '@/lib/availability';
import type {
  AllDayCalendarEvent,
  CalendarEvent,
  ResourceGridViewClassNames,
  ResourceGridViewProps,
  TimedCalendarEvent,
} from '@/types/calendar';
import { resourceGridViewDefaults } from './defaults';
import { GridHeader } from './GridHeader';
import { TimeGutter } from './TimeGutter';
import { ResourceColumn } from './ResourceColumn';
import { SlotInteractionLayer } from './SlotInteractionLayer';
import { SelectionOverlay } from './SelectionOverlay';
import { UnavailabilityOverlay } from './UnavailabilityOverlay';
import { NowIndicator } from './NowIndicator';
import { AllDayRow } from './AllDayRow';
import { useEffectiveHourHeight } from './useEffectiveHourHeight';

export function ResourceGridView({
  date,
  timeZone,
  resources,
  events,
  availability,
  unavailability,
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
  renderCorner,
  eventGap,
}: ResourceGridViewProps) {
  const startHour = timeAxis?.startHour ?? 0;
  const endHour = timeAxis?.endHour ?? 24;
  const intervalMinutes = timeAxis?.intervalMinutes ?? 60;

  const { effectiveHourHeight, rootRef, headerRef, allDayRef, headerHeight } =
    useEffectiveHourHeight(hourHeight, endHour - startHour);

  const cls = useCallback(
    (key: keyof ResourceGridViewClassNames) =>
      cn(
        resourceGridViewDefaults[key],
        classNames?.[key],
      ),
    [classNames],
  );

  const timeSlots = useMemo(
    () => generateTimeSlots({ startHour, endHour, intervalMinutes }),
    [startHour, endHour, intervalMinutes],
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

  const allDayByResource = useMemo(() => {
    const map = new Map<string, AllDayCalendarEvent[]>();
    for (const event of allDayEvents) {
      const list = map.get(event.resourceId);
      if (list) {
        list.push(event);
      } else {
        map.set(event.resourceId, [event]);
      }
    }
    return map;
  }, [allDayEvents]);

  const positionedByResource = useMemo(
    () =>
      computePositionedEvents(timedEvents, timeZone, startHour, endHour, effectiveHourHeight),
    [timedEvents, timeZone, startHour, endHour, effectiveHourHeight],
  );

  const unavailableByResource = useMemo(() => {
    if (!availability && !unavailability)
      return new Map<string, UnavailableBlock[]>();

    // Collect all resource IDs referenced by either prop
    const resourceIds = new Set([
      ...Object.keys(availability ?? {}),
      ...Object.keys(unavailability ?? {}),
    ]);

    const map = new Map<string, UnavailableBlock[]>();
    for (const resourceId of resourceIds) {
      const blocks = computeUnavailableBlocks(
        availability?.[resourceId],
        unavailability?.[resourceId],
        timeZone,
        startHour,
        endHour,
        effectiveHourHeight,
      );
      if (blocks.length > 0) {
        map.set(resourceId, blocks);
      }
    }
    return map;
  }, [availability, unavailability, timeZone, startHour, endHour, effectiveHourHeight]);

  const handleEventClick = useCallback(
    (event: CalendarEvent) => {
      onSelect?.(null);
      onEventClick?.(event);
    },
    [onSelect, onEventClick],
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
          {renderCorner?.()}
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
          className={cn(cls('allDayCell'), 'border-r border-zinc-200 dark:border-zinc-700 sticky left-0 z-30')}
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
            }}
          >
            <AllDayRow
              events={allDayByResource.get(resource.id) ?? []}
              cls={cls}
              onEventClick={handleEventClick}
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
              className={cls(
                slot.isHourStart ? 'bodyCell' : 'bodyCellMinor',
              )}
              style={{
                gridRow: slot.index + 3,
                gridColumn: colIdx + 2,
                ...(!slot.isHourStart
                  ? { borderTopStyle: 'dotted' as const }
                  : {}),
                ...(slot.index === 0 ? { borderTopWidth: 0 } : {}),
                ...(colIdx === resources.length - 1 ? { borderRightWidth: 0 } : {}),
              }}
            />
          )),
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
              resource={resource}
              column={i + 2}
              date={date}
              timeZone={timeZone}
              startHour={startHour}
              endHour={endHour}
              hourHeight={effectiveHourHeight}
              snapDuration={snapDuration}
              placeholderDuration={placeholderDuration ?? 15}
              cls={cls}
              onSlotClick={onSlotClick}
              onSelect={onSelect}
              dragPreviewAppearance={dragPreviewAppearance}
              renderEvent={renderEvent}
            />
          ))}

        {/* Resource columns with events */}
        {resources.map((resource, i) => (
          <ResourceColumn
            key={resource.id}
            resource={resource}
            positionedEvents={
              positionedByResource.get(resource.id) ?? []
            }
            column={i + 2}
            timeZone={timeZone}
            cls={cls}
            onEventClick={handleEventClick}
            renderEvent={renderEvent}
            eventGap={eventGap}
          />
        ))}

        {/* Selection overlay (after resource columns so it stacks on top) */}
        {selectedRange != null &&
          (() => {
            const colIdx = resources.findIndex(
              (r) => r.id === selectedRange.resourceId,
            );
            if (colIdx === -1) return null;
            return (
              <SelectionOverlay
                selectedRange={selectedRange}
                column={colIdx + 2}
                resource={resources[colIdx]}
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
    </div>
  );
}
