import { memo, type CSSProperties, type ReactNode, type Ref } from 'react';
import { cn } from '@/lib/utils';
import { formatEventStartTime } from '@/lib/time';
import { describeEvent } from '@/lib/accessibility';
import type { CalendarEvent, MonthViewClassNames } from '@/types/calendar';

interface MonthEventItemProps {
  event: CalendarEvent;
  isBar: boolean;
  continuesBefore?: boolean;
  continuesAfter?: boolean;
  timeZone: string;
  cls: (key: keyof MonthViewClassNames) => string;
  onClick?: (event: CalendarEvent) => void;
  isSelected?: boolean;
  /** When false, renders an inert placeholder that passes pointer events through. Default: true. */
  interactive?: boolean;
  itemRef?: Ref<HTMLElement>;
  /** Grid placement, as primitives so memo can skip unchanged items */
  gridRow?: number;
  gridColumn?: string;
  style?: CSSProperties;
}

function stripes(color: string) {
  return `repeating-linear-gradient(-45deg, ${color}, ${color} 3px, transparent 3px, transparent 6px)`;
}

export const MonthEventItem = memo(function MonthEventItem({
  event,
  isBar,
  continuesBefore = false,
  continuesAfter = false,
  timeZone,
  cls,
  onClick,
  isSelected,
  interactive = true,
  itemRef,
  gridRow,
  gridColumn,
  style,
}: MonthEventItemProps) {
  const isCanceled = event.status === 'canceled';
  const isTentative = event.status === 'tentative';
  const titleStyle: CSSProperties | undefined = isCanceled
    ? { textDecoration: 'line-through' }
    : undefined;
  const startTime =
    !event.allDay && !continuesBefore
      ? formatEventStartTime(event.startTime, timeZone)
      : null;

  let className: string;
  let shellStyle: CSSProperties;
  let content: ReactNode;

  if (isBar) {
    className = cn(cls('event'), isSelected && cls('eventSelected'));
    shellStyle = {
      marginLeft: continuesBefore ? 0 : 4,
      marginRight: continuesAfter ? 0 : 4,
      ...(continuesBefore
        ? { borderTopLeftRadius: 0, borderBottomLeftRadius: 0, paddingLeft: 6 }
        : {}),
      ...(continuesAfter
        ? { borderTopRightRadius: 0, borderBottomRightRadius: 0 }
        : {}),
    };
    content = (
      <>
        {event.color && !continuesBefore && (
          <span
            className={cls('eventColorBar')}
            style={{
              borderRadius: 'inherit',
              ...(isTentative
                ? { backgroundImage: stripes(event.color) }
                : { backgroundColor: event.color }),
            }}
          />
        )}
        {startTime && <span className={cls('eventTime')}>{startTime}</span>}
        <span className={cls('eventTitle')} style={titleStyle}>
          {event.title}
        </span>
      </>
    );
  } else {
    const dotColor = event.color ?? 'var(--color-cal-text-muted)';
    className = cn(cls('timedEvent'), isSelected && cls('timedEventSelected'));
    shellStyle = { marginLeft: 4, marginRight: 4 };
    content = (
      <>
        <span
          className={cls('timedEventDot')}
          style={
            isTentative
              ? { boxShadow: `inset 0 0 0 1.5px ${dotColor}` }
              : { backgroundColor: dotColor }
          }
        />
        {startTime && (
          <span className={cls('timedEventTime')}>{startTime}</span>
        )}
        <span className={cls('timedEventTitle')} style={titleStyle}>
          {event.title}
        </span>
      </>
    );
  }

  if (!interactive) {
    return (
      <div
        ref={itemRef as Ref<HTMLDivElement>}
        aria-hidden="true"
        className={className}
        style={{
          ...shellStyle,
          gridRow,
          gridColumn,
          pointerEvents: 'none',
          ...style,
        }}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      ref={itemRef as Ref<HTMLButtonElement>}
      type="button"
      aria-label={describeEvent(event, timeZone, { includeStatus: true })}
      aria-pressed={isSelected || undefined}
      className={className}
      style={{ ...shellStyle, gridRow, gridColumn, ...style }}
      onClick={() => onClick?.(event)}
      // Keep presses on events from starting a day-range selection
      onMouseDown={(e) => e.stopPropagation()}
    >
      {content}
    </button>
  );
});
