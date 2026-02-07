import { useCallback, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { generateTimeSlots } from '@/lib/time';
import { computePositionedEvents } from '@/lib/overlap';
import {
  computeUnavailableBlocks,
  type UnavailableBlock,
} from '@/lib/availability';
import type {
  CalendarEvent,
  ResourceGridViewClassNames,
  ResourceGridViewProps,
} from '@/types/calendar';
import { resourceGridViewDefaults } from './defaults';
import { GridHeader } from './GridHeader';
import { TimeGutter } from './TimeGutter';
import { ResourceColumn } from './ResourceColumn';
import { SlotInteractionLayer } from './SlotInteractionLayer';
import { SelectionOverlay } from './SelectionOverlay';
import { UnavailabilityOverlay } from './UnavailabilityOverlay';
import { NowIndicator } from './NowIndicator';
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
  slotDuration,
  selectedRange,
  onSelect,
  onSlotClick,
  className,
  classNames,
  hourHeight = 60,
  columnMinWidth = 120,
  renderHeader,
  renderEvent,
}: ResourceGridViewProps) {
  const startHour = timeAxis?.startHour ?? 0;
  const endHour = timeAxis?.endHour ?? 24;
  const intervalMinutes = timeAxis?.intervalMinutes ?? 60;

  const { effectiveHourHeight, rootRef, headerRef } =
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

  const positionedByResource = useMemo(
    () =>
      computePositionedEvents(events, timeZone, startHour, endHour, effectiveHourHeight),
    [events, timeZone, startHour, endHour, effectiveHourHeight],
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
          gridTemplateRows: `auto repeat(${timeSlots.length}, ${rowHeight}px)`,
        }}
      >
        {/* Corner cell */}
        <div
          ref={headerRef}
          className={cls('cornerCell')}
          style={{ gridRow: 1, gridColumn: 1 }}
        />

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

        {/* Gutter cells */}
        {timeSlots.map((slot) => (
          <TimeGutter
            key={slot.index}
            label={slot.label}
            row={slot.index + 2}
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
                gridRow: slot.index + 2,
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
        {slotDuration != null &&
          resources.map((resource, i) => (
            <SlotInteractionLayer
              key={`slot-${resource.id}`}
              resource={resource}
              column={i + 2}
              date={date}
              startHour={startHour}
              endHour={endHour}
              hourHeight={effectiveHourHeight}
              slotDuration={slotDuration}
              cls={cls}
              onSlotClick={onSlotClick}
              onSelect={onSelect}
            />
          ))}

        {/* Selection overlay */}
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
                startHour={startHour}
                hourHeight={effectiveHourHeight}
                cls={cls}
              />
            );
          })()}

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
          />
        ))}

        {/* Now indicator */}
        <NowIndicator
          date={date}
          timeZone={timeZone}
          startHour={startHour}
          hourHeight={effectiveHourHeight}
          cls={cls}
        />
      </div>
    </div>
  );
}
