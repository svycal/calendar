import { useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { generateTimeSlots } from '@/lib/time';
import { computePositionedEvents } from '@/lib/overlap';
import {
  computeUnavailableBlocks,
  type UnavailableBlock,
} from '@/lib/availability';
import type {
  ResourceGridViewClassNames,
  ResourceGridViewProps,
} from '@/types/calendar';
import { resourceGridViewDefaults } from './defaults';
import { GridHeader } from './GridHeader';
import { TimeGutter } from './TimeGutter';
import { ResourceColumn } from './ResourceColumn';
import { SlotInteractionLayer } from './SlotInteractionLayer';
import { UnavailabilityOverlay } from './UnavailabilityOverlay';
import { NowIndicator } from './NowIndicator';

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
  onSlotClick,
  className,
  classNames,
  hourHeight = 60,
  renderEvent,
}: ResourceGridViewProps) {
  const startHour = timeAxis?.startHour ?? 0;
  const endHour = timeAxis?.endHour ?? 24;
  const intervalMinutes = timeAxis?.intervalMinutes ?? 60;

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
      computePositionedEvents(events, timeZone, startHour, endHour, hourHeight),
    [events, timeZone, startHour, endHour, hourHeight],
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
        hourHeight,
      );
      if (blocks.length > 0) {
        map.set(resourceId, blocks);
      }
    }
    return map;
  }, [availability, unavailability, timeZone, startHour, endHour, hourHeight]);

  const rowHeight = (hourHeight * intervalMinutes) / 60;

  return (
    <div className={cn(cls('root'), className)}>
      <div
        className={cls('grid')}
        style={{
          display: 'grid',
          gridTemplateColumns: `auto repeat(${resources.length}, 1fr)`,
          gridTemplateRows: `auto repeat(${timeSlots.length}, ${rowHeight}px)`,
        }}
      >
        {/* Corner cell */}
        <div
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
          />
        ))}

        {/* Gutter cells */}
        {timeSlots.map((slot) => (
          <TimeGutter
            key={slot.index}
            label={slot.label}
            row={slot.index + 2}
            cls={cls}
          />
        ))}

        {/* Body cells */}
        {timeSlots.map((slot) =>
          resources.map((resource, colIdx) => (
            <div
              key={`${slot.index}-${resource.id}`}
              className={cls('bodyCell')}
              style={{
                gridRow: slot.index + 2,
                gridColumn: colIdx + 2,
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
              hourHeight={hourHeight}
              slotDuration={slotDuration}
              cls={cls}
              onSlotClick={onSlotClick}
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
            hourHeight={hourHeight}
            cls={cls}
            onEventClick={onEventClick}
            renderEvent={renderEvent}
          />
        ))}

        {/* Now indicator */}
        <NowIndicator
          date={date}
          timeZone={timeZone}
          startHour={startHour}
          hourHeight={hourHeight}
          cls={cls}
        />
      </div>
    </div>
  );
}
