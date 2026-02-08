import { memo } from 'react';
import { cn } from '@/lib/utils';
import type {
  CalendarEvent,
  CalendarResource,
  EventLayout,
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
  interactive?: boolean;
  eventGap?: number;
  eventLayout?: EventLayout;
  stackOffset?: number;
}

export const EventChip = memo(function EventChip({
  positioned,
  resource,
  timeZone,
  cls,
  onClick,
  renderEvent,
  interactive = true,
  eventGap = 2,
  eventLayout = 'columns',
  stackOffset = 8,
}: EventChipProps) {
  const { event, top, height, subColumn, totalSubColumns } = positioned;
  const color = event.color ?? resource.color ?? undefined;

  let left: string;
  let width: string;
  let zIndex: number | undefined;

  if (eventLayout === 'stacked') {
    const maxOffset = (totalSubColumns - 1) * stackOffset;
    left = subColumn > 0 ? `${subColumn * stackOffset}px` : '0';
    width = maxOffset > 0 ? `calc(100% - ${maxOffset}px)` : '100%';
    zIndex = subColumn + 1;
  } else {
    const leftPct = (subColumn / totalSubColumns) * 100;
    const widthPct = (1 / totalSubColumns) * 100;
    const gap = eventGap;
    const leftOffset = (subColumn * gap) / totalSubColumns;
    const widthShrink = ((totalSubColumns - 1) * gap) / totalSubColumns;
    left = widthShrink ? `calc(${leftPct}% + ${leftOffset}px)` : `${leftPct}%`;
    width = widthShrink ? `calc(${widthPct}% - ${widthShrink}px)` : `${widthPct}%`;
  }

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
          left,
          width,
          zIndex,
          pointerEvents: interactive ? 'auto' : 'none',
        }}
      >
        {renderEvent({ event, position: positioned })}
      </div>
    );
  }

  const startTimeStr = formatEventStartTime(event.startTime, timeZone);

  return (
    <div
      {...(interactive ? { role: 'button', tabIndex: 0 } : {})}
      className={cn(cls('event'), event.selected && cls('eventSelected'))}
      style={{
        top,
        height,
        left,
        width,
        zIndex,
        pointerEvents: interactive ? 'auto' : 'none',
      }}
      {...(interactive
        ? {
            onClick: () => onClick?.(event),
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.(event);
              }
            },
          }
        : {})}
    >
      {color && (
        <div
          className={cls('eventColorBar')}
          style={
            event.id === '__selection__'
              ? {
                  backgroundImage: `repeating-linear-gradient(
                    -45deg,
                    ${color},
                    ${color} 3px,
                    transparent 3px,
                    transparent 6px
                  )`,
                }
              : { backgroundColor: color }
          }
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
