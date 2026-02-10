import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { Temporal } from 'temporal-polyfill';
import type {
  CalendarResource,
  PositionedEvent,
  ResourceGridViewClassNames,
  SelectedRange,
  SelectionAppearance,
  TimedCalendarEvent,
} from '@/types/calendar';
import { buildSyntheticEvent } from '@/lib/selection';
import { EventChip } from './EventChip';

interface SlotInteractionLayerProps {
  resource: CalendarResource;
  column: number;
  date: Temporal.PlainDate;
  timeZone: string;
  startHour: number;
  endHour: number;
  hourHeight: number;
  snapDuration: number;
  placeholderDuration: number;
  cls: (key: keyof ResourceGridViewClassNames) => string;
  onSlotClick?: (info: {
    resource: CalendarResource;
    startTime: Temporal.ZonedDateTime;
    endTime: Temporal.ZonedDateTime;
  }) => void;
  onSelect?: (range: SelectedRange | null) => void;
  dragPreviewAppearance?: SelectionAppearance;
  renderEvent?: (props: {
    event: TimedCalendarEvent;
    position: PositionedEvent;
  }) => React.ReactNode;
}

function minutesToZonedDateTime(
  date: Temporal.PlainDate,
  totalMinutes: number,
  timeZone: string
): Temporal.ZonedDateTime {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  if (hour >= 24) {
    return date
      .add({ days: Math.floor(hour / 24) })
      .toPlainDateTime({ hour: hour % 24, minute })
      .toZonedDateTime(timeZone);
  }
  return date.toPlainDateTime({ hour, minute }).toZonedDateTime(timeZone);
}

interface DragState {
  anchorSlotStart: number;
  currentStartMin: number;
  currentEndMin: number;
  moved: boolean;
}

export const SlotInteractionLayer = memo(function SlotInteractionLayer({
  resource,
  column,
  date,
  timeZone,
  startHour,
  endHour,
  hourHeight,
  snapDuration,
  placeholderDuration,
  cls,
  onSlotClick,
  onSelect,
  dragPreviewAppearance = 'highlight',
  renderEvent,
}: SlotInteractionLayerProps) {
  const [hoveredSlotStart, setHoveredSlotStart] = useState<number | null>(null);
  const [dragPreview, setDragPreview] = useState<{
    startMin: number;
    endMin: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const didDragRef = useRef(false);

  // Stable refs for document-level handlers
  const onSelectRef = useRef(onSelect);
  const resourceRef = useRef(resource);
  const dateRef = useRef(date);
  const timeZoneRef = useRef(timeZone);

  const axisStartMin = startHour * 60;
  const axisEndMin = endHour * 60;
  const pixelsPerMinute = hourHeight / 60;

  const snapToSlot = useCallback(
    (yOffset: number): number | null => {
      const minutesFromStart = yOffset / pixelsPerMinute;
      const snappedMinutes =
        Math.floor(minutesFromStart / snapDuration) * snapDuration;
      const absoluteMinutes = axisStartMin + snappedMinutes;

      if (absoluteMinutes + placeholderDuration > axisEndMin) return null;
      if (absoluteMinutes < axisStartMin) return null;

      return absoluteMinutes;
    },
    [
      pixelsPerMinute,
      snapDuration,
      placeholderDuration,
      axisStartMin,
      axisEndMin,
    ]
  );

  // Store values in refs for document handlers
  const snapToSlotRef = useRef(snapToSlot);
  const axisEndMinRef = useRef(axisEndMin);
  const snapDurationRef = useRef(snapDuration);
  const placeholderDurationRef = useRef(placeholderDuration);

  const computeRange = useCallback((anchor: number, currentSlot: number) => {
    const rangeStart = Math.min(anchor, currentSlot);
    const rangeEnd = Math.min(
      Math.max(anchor, currentSlot) + placeholderDurationRef.current,
      axisEndMinRef.current
    );
    return { startMin: rangeStart, endMin: rangeEnd };
  }, []);

  const handleDocMouseMove = useCallback(
    (e: MouseEvent) => {
      const drag = dragRef.current;
      const container = containerRef.current;
      if (!drag || !container) return;

      const rect = container.getBoundingClientRect();
      const containerHeight = rect.height;
      const yOffset = Math.max(
        0,
        Math.min(e.clientY - rect.top, containerHeight)
      );

      let currentSlot = snapToSlotRef.current(yOffset);
      if (currentSlot == null) {
        // Clamped past bottom — use last valid slot
        currentSlot = axisEndMinRef.current - placeholderDurationRef.current;
      }

      const range = computeRange(drag.anchorSlotStart, currentSlot);
      drag.currentStartMin = range.startMin;
      drag.currentEndMin = range.endMin;
      drag.moved = true;
      setDragPreview(range);
    },
    [computeRange]
  );

  const handleDocMouseUpRef = useRef<() => void>(() => {});

  const handleDocMouseUp = useCallback(() => {
    const drag = dragRef.current;
    if (drag) {
      if (drag.moved) {
        didDragRef.current = true;
      }
      // Fire onSelect with the final settled range
      onSelectRef.current?.({
        resourceId: resourceRef.current.id,
        startTime: minutesToZonedDateTime(
          dateRef.current,
          drag.currentStartMin,
          timeZoneRef.current
        ),
        endTime: minutesToZonedDateTime(
          dateRef.current,
          drag.currentEndMin,
          timeZoneRef.current
        ),
      });
    }
    dragRef.current = null;
    setDragPreview(null);
    document.removeEventListener('mousemove', handleDocMouseMove);
    document.removeEventListener('mouseup', handleDocMouseUpRef.current);
  }, [handleDocMouseMove]);

  // Sync all latest-value refs after render, before browser events
  useLayoutEffect(() => {
    onSelectRef.current = onSelect;
    resourceRef.current = resource;
    dateRef.current = date;
    timeZoneRef.current = timeZone;
    snapToSlotRef.current = snapToSlot;
    axisEndMinRef.current = axisEndMin;
    snapDurationRef.current = snapDuration;
    placeholderDurationRef.current = placeholderDuration;
    handleDocMouseUpRef.current = handleDocMouseUp;
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleDocMouseMove);
      document.removeEventListener('mouseup', handleDocMouseUpRef.current);
    };
  }, [handleDocMouseMove]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onSelect) return;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const yOffset = e.clientY - rect.top;
      const slotStart = snapToSlot(yOffset);
      if (slotStart == null) return;

      e.preventDefault(); // Prevent text selection
      onSelect(null); // Clear previous selection

      const slotEnd = slotStart + placeholderDuration;
      dragRef.current = {
        anchorSlotStart: slotStart,
        currentStartMin: slotStart,
        currentEndMin: slotEnd,
        moved: false,
      };

      setDragPreview({ startMin: slotStart, endMin: slotEnd });

      document.addEventListener('mousemove', handleDocMouseMove);
      document.addEventListener('mouseup', handleDocMouseUp);
    },
    [
      onSelect,
      snapToSlot,
      placeholderDuration,
      handleDocMouseMove,
      handleDocMouseUp,
    ]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Suppress hover highlight during drag
      if (dragRef.current) return;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const yOffset = e.clientY - rect.top;
      setHoveredSlotStart(snapToSlot(yOffset));
    },
    [snapToSlot]
  );

  const handleMouseLeave = useCallback(() => {
    if (dragRef.current) return;
    setHoveredSlotStart(null);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // If we just finished a drag, suppress the click
      if (didDragRef.current) {
        didDragRef.current = false;
        return;
      }

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const yOffset = e.clientY - rect.top;
      const slotStart = snapToSlot(yOffset);
      if (slotStart == null) return;

      const slotEnd = slotStart + placeholderDuration;

      if (onSlotClick) {
        onSlotClick({
          resource,
          startTime: minutesToZonedDateTime(date, slotStart, timeZone),
          endTime: minutesToZonedDateTime(date, slotEnd, timeZone),
        });
      }
    },
    [onSlotClick, snapToSlot, placeholderDuration, resource, date, timeZone]
  );

  const highlightTop =
    hoveredSlotStart != null
      ? (hoveredSlotStart - axisStartMin) * pixelsPerMinute
      : 0;
  const highlightHeight = placeholderDuration * pixelsPerMinute;

  return (
    <div
      ref={containerRef}
      style={{
        gridRow: '3 / -1',
        gridColumn: column,
        position: 'relative',
        pointerEvents: 'auto',
        cursor: onSlotClick || onSelect ? 'pointer' : undefined,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {hoveredSlotStart != null && !dragPreview && (
        <div
          aria-hidden="true"
          className={cls('slotHighlight')}
          style={{
            position: 'absolute',
            top: highlightTop,
            left: 0,
            right: 0,
            height: highlightHeight,
            pointerEvents: 'none',
          }}
        />
      )}
      {dragPreview &&
        (dragPreviewAppearance !== 'highlight' ? (
          <div
            aria-hidden="true"
            className={cls('eventColumn')}
            style={{ pointerEvents: 'none' }}
          >
            <EventChip
              interactive={false}
              positioned={{
                event: buildSyntheticEvent(
                  resource.id,
                  minutesToZonedDateTime(date, dragPreview.startMin, timeZone),
                  minutesToZonedDateTime(date, dragPreview.endMin, timeZone),
                  dragPreviewAppearance.eventData
                ),
                top: (dragPreview.startMin - axisStartMin) * pixelsPerMinute,
                height:
                  (dragPreview.endMin - dragPreview.startMin) * pixelsPerMinute,
                subColumn: 0,
                totalSubColumns: 1,
              }}
              resource={resource}
              timeZone={timeZone}
              cls={cls}
              renderEvent={renderEvent}
            />
          </div>
        ) : (
          <div
            aria-hidden="true"
            className={cls('selectionHighlight')}
            style={{
              position: 'absolute',
              top: (dragPreview.startMin - axisStartMin) * pixelsPerMinute,
              left: 0,
              right: 0,
              height:
                (dragPreview.endMin - dragPreview.startMin) * pixelsPerMinute,
              pointerEvents: 'none',
            }}
          />
        ))}
    </div>
  );
});
