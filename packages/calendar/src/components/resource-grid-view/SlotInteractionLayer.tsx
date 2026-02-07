import { memo, useCallback, useRef, useState } from 'react';
import type {
  CalendarResource,
  ResourceGridViewClassNames,
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
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function minutesToTimeString(date: string, totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${date}T${pad2(hours)}:${pad2(minutes)}:00`;
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
}: SlotInteractionLayerProps) {
  const [hoveredSlotStart, setHoveredSlotStart] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const axisStartMin = startHour * 60;
  const axisEndMin = endHour * 60;
  const pixelsPerMinute = hourHeight / 60;

  const snapToSlot = useCallback(
    (yOffset: number): number | null => {
      const minutesFromStart = yOffset / pixelsPerMinute;
      const snappedMinutes =
        Math.floor(minutesFromStart / slotDuration) * slotDuration;
      const absoluteMinutes = axisStartMin + snappedMinutes;

      // Don't highlight if slot would extend past endHour
      if (absoluteMinutes + slotDuration > axisEndMin) return null;
      if (absoluteMinutes < axisStartMin) return null;

      return absoluteMinutes;
    },
    [pixelsPerMinute, slotDuration, axisStartMin, axisEndMin],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const yOffset = e.clientY - rect.top;
      setHoveredSlotStart(snapToSlot(yOffset));
    },
    [snapToSlot],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredSlotStart(null);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onSlotClick) return;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const yOffset = e.clientY - rect.top;
      const slotStart = snapToSlot(yOffset);
      if (slotStart == null) return;

      const slotEnd = slotStart + slotDuration;
      onSlotClick({
        resource,
        startTime: minutesToTimeString(date, slotStart),
        endTime: minutesToTimeString(date, slotEnd),
      });
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
        cursor: onSlotClick ? 'pointer' : undefined,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {hoveredSlotStart != null && (
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
    </div>
  );
});
