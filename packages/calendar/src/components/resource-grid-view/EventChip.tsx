import { memo } from 'react';
import { cn } from '@/lib/utils';
import type {
  CalendarEvent,
  CalendarResource,
  PositionedEvent,
  ResourceGridViewClassNames,
  TimedCalendarEvent,
} from '@/types/calendar';
import { formatEventStartTime } from '@/lib/time';

interface EventChipProps {
  positioned: PositionedEvent;
  resource: CalendarResource;
  timeZone: string;
  cls: (key: keyof ResourceGridViewClassNames) => string;
  onClick?: (event: CalendarEvent) => void;
  renderEvent?: (props: {
    event: TimedCalendarEvent;
    position: PositionedEvent;
  }) => React.ReactNode;
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

  // 2 lines (~36px): title + collapsed time/client
  // 3 lines (~52px): title + time + client on separate lines
  const canFitTwoLines = height >= 36;
  const canFitThreeLines = height >= 52;
  const isCanceled = event.status === 'canceled';

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
        {renderEvent({ event, position: positioned })}
      </div>
    );
  }

  const startTimeStr = formatEventStartTime(event.startTime, timeZone);

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(cls('event'), event.selected && cls('eventSelected'))}
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
        <div
          className={cls('eventColorBar')}
          style={{ backgroundColor: color }}
        />
      )}
      <div
        className={cls('eventTitle')}
        style={isCanceled ? { textDecoration: 'line-through' } : undefined}
      >
        {event.title}
      </div>
      {canFitTwoLines &&
        (canFitThreeLines ? (
          <>
            <div className={cls('eventTime')}>{startTimeStr}</div>
            {event.clientName && (
              <div className={cls('eventClientName')}>{event.clientName}</div>
            )}
          </>
        ) : event.clientName ? (
          <div className={cls('eventTime')}>
            {startTimeStr}, {event.clientName}
          </div>
        ) : (
          <div className={cls('eventTime')}>{startTimeStr}</div>
        ))}
    </div>
  );
});
