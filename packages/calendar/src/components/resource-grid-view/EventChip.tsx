import { memo } from 'react';
import type {
  CalendarEvent,
  CalendarResource,
  PositionedEvent,
  ResourceGridViewClassNames,
} from '@/types/calendar';
import { formatEventTimeRange } from '@/lib/time';

interface EventChipProps {
  positioned: PositionedEvent;
  resource: CalendarResource;
  timeZone: string;
  cls: (key: keyof ResourceGridViewClassNames) => string;
  onClick?: (event: CalendarEvent) => void;
  renderEvent?: (
    event: CalendarEvent,
    position: PositionedEvent,
  ) => React.ReactNode;
}

export const EventChip = memo(function EventChip({
  positioned,
  resource,
  timeZone,
  cls,
  onClick,
  renderEvent,
}: EventChipProps) {
  const { event, top, height, subColumn, totalSubColumns } = positioned;
  const color = event.color ?? resource.color ?? undefined;
  const leftPct = (subColumn / totalSubColumns) * 100;
  const widthPct = (1 / totalSubColumns) * 100;
  const showTime = height >= 36;

  if (renderEvent) {
    return (
      <div
        style={{
          position: 'absolute',
          top,
          height,
          left: `${leftPct}%`,
          width: `${widthPct}%`,
          pointerEvents: 'auto',
        }}
      >
        {renderEvent(event, positioned)}
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={cls('event')}
      style={{
        top,
        height,
        left: `${leftPct}%`,
        width: `${widthPct}%`,
        pointerEvents: 'auto',
      }}
      onClick={() => onClick?.(event)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(event);
        }
      }}
    >
      {color && (
        <div className={cls('eventColorBar')} style={{ backgroundColor: color }} />
      )}
      <div className={cls('eventTitle')}>{event.title}</div>
      {showTime && (
        <div className={cls('eventTime')}>
          {formatEventTimeRange(event.startTime, event.endTime, timeZone)}
        </div>
      )}
    </div>
  );
});
