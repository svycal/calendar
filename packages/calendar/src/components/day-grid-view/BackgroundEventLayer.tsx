import { memo, type ReactNode } from 'react';
import type { Temporal } from 'temporal-polyfill';
import type { BackgroundEvent } from '@/types/calendar';
import { getMinuteRange } from '@/lib/time';

interface BackgroundEventLayerProps {
  events: BackgroundEvent[];
  date: Temporal.PlainDate;
  column: number;
  timeZone: string;
  startHour: number;
  endHour: number;
  hourHeight: number;
  renderBackgroundEvent?: (props: {
    event: BackgroundEvent;
    height: number;
  }) => ReactNode;
}

export const BackgroundEventLayer = memo(function BackgroundEventLayer({
  events,
  date,
  column,
  timeZone,
  startHour,
  endHour,
  hourHeight,
  renderBackgroundEvent,
}: BackgroundEventLayerProps) {
  const axisStartMin = startHour * 60;
  const axisEndMin = endHour * 60;
  const pixelsPerMinute = hourHeight / 60;

  const blocks = events.flatMap((event) => {
    const range = getMinuteRange(
      event.startTime,
      event.endTime,
      date,
      timeZone
    );
    if (!range) return [];
    const startMin = Math.max(range.startMin, axisStartMin);
    const endMin = Math.min(range.endMin, axisEndMin);
    if (endMin <= startMin) return [];
    return [
      {
        event,
        top: (startMin - axisStartMin) * pixelsPerMinute,
        height: (endMin - startMin) * pixelsPerMinute,
      },
    ];
  });

  if (blocks.length === 0) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        gridRow: '3 / -1',
        gridColumn: column,
        position: 'relative',
        pointerEvents: 'none',
      }}
    >
      {blocks.map(({ event, top, height }) => (
        <div
          key={event.id}
          className={event.className}
          style={{ position: 'absolute', top, height, left: 0, right: 0 }}
        >
          {renderBackgroundEvent?.({ event, height })}
        </div>
      ))}
    </div>
  );
});
