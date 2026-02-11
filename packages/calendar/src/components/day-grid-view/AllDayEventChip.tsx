import { memo, type Ref } from 'react';
import { cn } from '@/lib/utils';
import type { CalendarEvent, DayGridViewClassNames } from '@/types/calendar';
import type { PositionedAllDayEvent } from '@/lib/overlap';

interface AllDayEventChipProps {
  positioned: PositionedAllDayEvent;
  cls: (key: keyof DayGridViewClassNames) => string;
  onEventClick?: (event: CalendarEvent) => void;
  selectedEventId?: string | null;
  selectedEventRef?: Ref<HTMLDivElement>;
}

export const AllDayEventChip = memo(function AllDayEventChip({
  positioned,
  cls,
  onEventClick,
  selectedEventId,
  selectedEventRef,
}: AllDayEventChipProps) {
  const {
    event,
    gridColumnStart,
    gridColumnSpan,
    lane,
    continuesBefore,
    continuesAfter,
  } = positioned;
  const isSelected = event.id === selectedEventId;

  const labelParts = [event.title, 'all day'];
  if (event.clientName) labelParts.push(event.clientName);

  const button = (
    <button
      type="button"
      aria-label={labelParts.join(', ')}
      className={cn(
        cls('allDayEvent'),
        isSelected && cls('allDayEventSelected'),
        'relative flex items-center gap-1'
      )}
      style={{
        gridColumn: `${gridColumnStart} / span ${gridColumnSpan}`,
        gridRow: lane + 1,
        ...(continuesBefore
          ? {
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
              paddingLeft: 4,
            }
          : {}),
        ...(continuesAfter
          ? { borderTopRightRadius: 0, borderBottomRightRadius: 0 }
          : {}),
      }}
      onClick={() => onEventClick?.(event)}
    >
      {event.color && !continuesBefore && (
        <div
          className={cls('allDayEventColorBar')}
          style={{ backgroundColor: event.color, borderRadius: 'inherit' }}
        />
      )}
      {continuesBefore && (
        <span
          className="text-cal-text-muted text-[10px] leading-none shrink-0"
          aria-hidden
        >
          {'◂'}
        </span>
      )}
      <span className={cls('allDayEventTitle')}>{event.title}</span>
      {continuesAfter && (
        <span
          className="text-cal-text-muted text-[10px] leading-none shrink-0 ml-auto"
          aria-hidden
        >
          {'▸'}
        </span>
      )}
    </button>
  );

  if (isSelected) {
    return (
      <div
        ref={selectedEventRef}
        style={{
          gridColumn: `${gridColumnStart} / span ${gridColumnSpan}`,
          gridRow: lane + 1,
          display: 'flex',
          minWidth: 0,
        }}
      >
        <button
          type="button"
          aria-label={labelParts.join(', ')}
          className={cn(
            cls('allDayEvent'),
            cls('allDayEventSelected'),
            'relative flex items-center gap-1 w-full'
          )}
          style={{
            ...(continuesBefore
              ? {
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                  paddingLeft: 4,
                }
              : {}),
            ...(continuesAfter
              ? { borderTopRightRadius: 0, borderBottomRightRadius: 0 }
              : {}),
          }}
          onClick={() => onEventClick?.(event)}
        >
          {event.color && !continuesBefore && (
            <div
              className={cls('allDayEventColorBar')}
              style={{ backgroundColor: event.color, borderRadius: 'inherit' }}
            />
          )}
          {continuesBefore && (
            <span
              className="text-cal-text-muted text-[10px] leading-none shrink-0"
              aria-hidden
            >
              {'◂'}
            </span>
          )}
          <span className={cls('allDayEventTitle')}>{event.title}</span>
          {continuesAfter && (
            <span
              className="text-cal-text-muted text-[10px] leading-none shrink-0 ml-auto"
              aria-hidden
            >
              {'▸'}
            </span>
          )}
        </button>
      </div>
    );
  }

  return button;
});
