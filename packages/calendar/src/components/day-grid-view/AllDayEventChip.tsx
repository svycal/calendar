import { memo, type Ref } from 'react';
import { cn } from '@/lib/utils';
import type { CalendarEvent, DayGridViewClassNames } from '@/types/calendar';
import type { PositionedAllDayEvent } from '@/lib/overlap';

interface AllDayEventChipProps {
  positioned: PositionedAllDayEvent;
  laneOffset: number;
  cls: (key: keyof DayGridViewClassNames) => string;
  onEventClick?: (event: CalendarEvent) => void;
  selectedEventId?: string | null;
  selectedEventRef?: Ref<HTMLDivElement>;
}

export const AllDayEventChip = memo(function AllDayEventChip({
  positioned,
  laneOffset,
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
  const gridRow = lane + 1 + laneOffset;

  const labelParts = [event.title, 'all day'];
  if (event.clientName) labelParts.push(event.clientName);

  // Horizontal margin: inset from column borders (smaller on truncated edges)
  const marginLeft = continuesBefore ? 2 : 4;
  const marginRight = continuesAfter ? 2 : 4;

  const chipStyle = {
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
  };

  const chipContent = (
    <>
      {event.color && !continuesBefore && (
        <div
          className={cls('allDayEventColorBar')}
          style={{ backgroundColor: event.color, borderRadius: 'inherit' }}
        />
      )}
      <span className={cls('allDayEventTitle')}>{event.title}</span>
    </>
  );

  if (isSelected) {
    return (
      <div
        ref={selectedEventRef}
        style={{
          gridColumn: `${gridColumnStart} / span ${gridColumnSpan}`,
          gridRow,
          display: 'flex',
          minWidth: 0,
          marginLeft,
          marginRight,
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
          style={chipStyle}
          onClick={() => onEventClick?.(event)}
        >
          {chipContent}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label={labelParts.join(', ')}
      className={cn(cls('allDayEvent'), 'relative flex items-center gap-1')}
      style={{
        gridColumn: `${gridColumnStart} / span ${gridColumnSpan}`,
        gridRow,
        marginLeft,
        marginRight,
        ...chipStyle,
      }}
      onClick={() => onEventClick?.(event)}
    >
      {chipContent}
    </button>
  );
});
