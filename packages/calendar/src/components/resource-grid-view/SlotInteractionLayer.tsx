import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type {
  CalendarResource,
  ResourceGridViewClassNames,
  SelectedRange,
} from '@/types/calendar';

interface SlotInteractionLayerProps {
  resource: CalendarResource;
  column: number;
  date: string;
  startHour: number;
  endHour: number;
  hourHeight: number;
  slotDuration: number;
  cls: (key: keyof ResourceGridViewClassNames) => string;
  onSlotClick?: (info: {
    resource: CalendarResource;
    startTime: string;
    endTime: string;
  }) => void;
  onSelect?: (range: SelectedRange | null) => void;
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function minutesToTimeString(date: string, totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${date}T${pad2(hours)}:${pad2(minutes)}:00`;
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
  startHour,
  endHour,
  hourHeight,
  slotDuration,
  cls,
  onSlotClick,
  onSelect,
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
  onSelectRef.current = onSelect;
  const resourceRef = useRef(resource);
  resourceRef.current = resource;
  const dateRef = useRef(date);
  dateRef.current = date;

  const axisStartMin = startHour * 60;
  const axisEndMin = endHour * 60;
  const pixelsPerMinute = hourHeight / 60;

  const snapToSlot = useCallback(
    (yOffset: number): number | null => {
      const minutesFromStart = yOffset / pixelsPerMinute;
      const snappedMinutes =
        Math.floor(minutesFromStart / slotDuration) * slotDuration;
      const absoluteMinutes = axisStartMin + snappedMinutes;

      if (absoluteMinutes + slotDuration > axisEndMin) return null;
      if (absoluteMinutes < axisStartMin) return null;

      return absoluteMinutes;
    },
    [pixelsPerMinute, slotDuration, axisStartMin, axisEndMin],
  );

  // Store values in refs for document handlers
  const snapToSlotRef = useRef(snapToSlot);
  snapToSlotRef.current = snapToSlot;
  const axisEndMinRef = useRef(axisEndMin);
  axisEndMinRef.current = axisEndMin;
  const slotDurationRef = useRef(slotDuration);
  slotDurationRef.current = slotDuration;

  const computeRange = useCallback(
    (anchor: number, currentSlot: number) => {
      const rangeStart = Math.min(anchor, currentSlot);
      const rangeEnd = Math.min(
        Math.max(anchor, currentSlot) + slotDurationRef.current,
        axisEndMinRef.current,
      );
      return { startMin: rangeStart, endMin: rangeEnd };
    },
    [],
  );

  const handleDocMouseMove = useCallback(
    (e: MouseEvent) => {
      const drag = dragRef.current;
      const container = containerRef.current;
      if (!drag || !container) return;

      const rect = container.getBoundingClientRect();
      const containerHeight = rect.height;
      const yOffset = Math.max(
        0,
        Math.min(e.clientY - rect.top, containerHeight),
      );

      let currentSlot = snapToSlotRef.current(yOffset);
      if (currentSlot == null) {
        // Clamped past bottom — use last valid slot
        currentSlot = axisEndMinRef.current - slotDurationRef.current;
      }

      const range = computeRange(drag.anchorSlotStart, currentSlot);
      drag.currentStartMin = range.startMin;
      drag.currentEndMin = range.endMin;
      drag.moved = true;
      setDragPreview(range);
    },
    [computeRange],
  );

  const handleDocMouseUp = useCallback(() => {
    const drag = dragRef.current;
    if (drag) {
      if (drag.moved) {
        didDragRef.current = true;
      }
      // Fire onSelect with the final settled range
      onSelectRef.current?.({
        resourceId: resourceRef.current.id,
        startTime: minutesToTimeString(dateRef.current, drag.currentStartMin),
        endTime: minutesToTimeString(dateRef.current, drag.currentEndMin),
      });
    }
    dragRef.current = null;
    setDragPreview(null);
    document.removeEventListener('mousemove', handleDocMouseMove);
    document.removeEventListener('mouseup', handleDocMouseUp);
  }, [handleDocMouseMove]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleDocMouseMove);
      document.removeEventListener('mouseup', handleDocMouseUp);
    };
  }, [handleDocMouseMove, handleDocMouseUp]);

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

      const slotEnd = slotStart + slotDuration;
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
      slotDuration,
      handleDocMouseMove,
      handleDocMouseUp,
    ],
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
    [snapToSlot],
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

      const slotEnd = slotStart + slotDuration;

      if (onSlotClick) {
        onSlotClick({
          resource,
          startTime: minutesToTimeString(date, slotStart),
          endTime: minutesToTimeString(date, slotEnd),
        });
      }
    },
    [onSlotClick, snapToSlot, slotDuration, resource, date],
  );

  const highlightTop =
    hoveredSlotStart != null
      ? (hoveredSlotStart - axisStartMin) * pixelsPerMinute
      : 0;
  const highlightHeight = slotDuration * pixelsPerMinute;

  return (
    <div
      ref={containerRef}
      style={{
        gridRow: '2 / -1',
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
      {dragPreview && (
        <div
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
      )}
    </div>
  );
});
