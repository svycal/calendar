import { memo, type Ref } from 'react';
import { cn } from '@/lib/utils';
import type {
  CalendarEvent,
  EventLayout,
  GridViewClassNames,
  PositionedEvent,
  TimedCalendarEvent,
} from '@/types/calendar';
import { formatEventStartTime } from '@/lib/time';
import { describeEvent } from '@/lib/accessibility';
import { TOUCH_DRAG_STYLE } from './useTouchDrag';

interface EventChipProps {
  positioned: PositionedEvent;
  fallbackColor?: string;
  timeZone: string;
  cls: (key: keyof GridViewClassNames) => string;
  onClick?: (event: CalendarEvent) => void;
  renderEvent?: (props: {
    event: TimedCalendarEvent;
    position: PositionedEvent;
  }) => React.ReactNode;
  interactive?: boolean;
  eventGap?: number;
  eventLayout?: EventLayout;
  stackOffset?: number;
  isSelected?: boolean;
  selectedEventRef?: Ref<HTMLDivElement>;
  /** Dims the event while it's dragged or a drop of it awaits confirmation. */
  isDragSource?: boolean;
  /** Makes the event draggable: called when the user presses on it. */
  onDragStart?: (
    event: TimedCalendarEvent,
    e: React.PointerEvent<HTMLElement>
  ) => void;
}

export const EventChip = memo(function EventChip({
  positioned,
  fallbackColor,
  timeZone,
  cls,
  onClick,
  renderEvent,
  interactive = true,
  eventGap = 2,
  eventLayout = 'columns',
  stackOffset = 8,
  isSelected,
  selectedEventRef,
  isDragSource,
  onDragStart,
}: EventChipProps) {
  const { event, top, height, subColumn, totalSubColumns } = positioned;
  const isInteractive = interactive && event.interactive !== false;
  const colSpan = positioned.colSpan ?? 1;
  const color = event.color ?? fallbackColor;

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
    const widthPct = (colSpan / totalSubColumns) * 100;
    const gap = eventGap;
    const leftOffset = (subColumn * gap) / totalSubColumns;
    const widthShrink = ((totalSubColumns - colSpan) * gap) / totalSubColumns;
    left = widthShrink ? `calc(${leftPct}% + ${leftOffset}px)` : `${leftPct}%`;
    width = widthShrink
      ? `calc(${widthPct}% - ${widthShrink}px)`
      : `${widthPct}%`;
  }

  if (positioned.overlay) {
    zIndex = 8;
  }

  if (isSelected) {
    zIndex = 20;
  }

  // 2 lines (~36px): title + collapsed time/client
  // 3 lines (~52px): title + time + client on separate lines
  const canFitTwoLines = height >= 36;
  const canFitThreeLines = height >= 52;
  const isCanceled = event.status === 'canceled';
  const isOutline = event.appearance === 'outline';
  // An outlined event's text takes the color its shell sets
  const textStyle = isOutline ? { color: 'inherit' } : undefined;

  const isDraggable = isInteractive && event.draggable !== false && onDragStart;
  // A long press starts a touch drag, so keep it from opening the iOS callout
  const dragStyle = isDraggable ? TOUCH_DRAG_STYLE : undefined;

  const interactionProps = isInteractive
    ? {
        onPointerDown: isDraggable
          ? (e: React.PointerEvent<HTMLElement>) => onDragStart(event, e)
          : undefined,
        role: 'button',
        tabIndex: 0,
        'aria-label': describeEvent(event, timeZone, { includeStatus: true }),
        onClick: () => onClick?.(event),
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.(event);
          }
        },
      }
    : {};

  if (renderEvent) {
    const customContent = renderEvent({ event, position: positioned });

    if (customContent) {
      return (
        <div
          ref={selectedEventRef}
          {...interactionProps}
          className={cn(
            isInteractive &&
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cal-focus',
            isDragSource && cls('eventDragSource')
          )}
          style={{
            position: 'absolute',
            cursor: isInteractive ? 'pointer' : undefined,
            top,
            height,
            left,
            width,
            zIndex,
            pointerEvents: isInteractive ? 'auto' : 'none',
            ...dragStyle,
          }}
        >
          {customContent}
        </div>
      );
    }
  }

  const startTimeStr = formatEventStartTime(event.startTime, timeZone);

  return (
    <div
      ref={selectedEventRef}
      {...interactionProps}
      className={cn(
        cls('event'),
        isSelected && cls('eventSelected'),
        isOutline && cls('eventOutline'),
        isDragSource && cls('eventDragSource')
      )}
      style={{
        ...(isOutline && { '--cal-event-color': color }),
        top,
        height,
        left,
        width,
        zIndex,
        pointerEvents: isInteractive ? 'auto' : 'none',
        ...dragStyle,
      }}
    >
      {color && !isOutline && (
        <div
          className={cls('eventColorBar')}
          style={
            event.status === 'tentative'
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
        style={{
          ...textStyle,
          ...(isCanceled ? { textDecoration: 'line-through' } : {}),
        }}
      >
        {event.title}
      </div>
      {canFitTwoLines &&
        (canFitThreeLines ? (
          <>
            <div className={cls('eventTime')} style={textStyle}>
              {startTimeStr}
            </div>
            {event.clientName && (
              <div className={cls('eventClientName')} style={textStyle}>
                {event.clientName}
              </div>
            )}
          </>
        ) : event.clientName ? (
          <div className={cls('eventTime')} style={textStyle}>
            {startTimeStr}, {event.clientName}
          </div>
        ) : (
          <div className={cls('eventTime')} style={textStyle}>
            {startTimeStr}
          </div>
        ))}
    </div>
  );
});
