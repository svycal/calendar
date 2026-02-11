import { memo, type Ref } from 'react';
import { cn } from '@/lib/utils';
import type {
  AllDayCalendarEvent,
  CalendarEvent,
  GridViewClassNames,
} from '@/types/calendar';

interface AllDayRowProps {
  events: AllDayCalendarEvent[];
  cls: (key: keyof GridViewClassNames) => string;
  onEventClick?: (event: CalendarEvent) => void;
  selectedEventId?: string | null;
  selectedEventRef?: Ref<HTMLDivElement>;
}

export const AllDayRow = memo(function AllDayRow({
  events,
  cls,
  onEventClick,
  selectedEventId,
  selectedEventRef,
}: AllDayRowProps) {
  if (events.length === 0) return null;

  return (
    <>
      {events.map((event) => {
        const isSelected = event.id === selectedEventId;
        const labelParts = [event.title, 'all day'];
        if (event.clientName) labelParts.push(event.clientName);
        const button = (
          <button
            key={event.id}
            type="button"
            aria-label={labelParts.join(', ')}
            className={cn(cls('event'), isSelected && cls('eventSelected'))}
            style={{
              position: 'relative',
              inset: 'unset',
              cursor: 'pointer',
              flex: '1 1 0',
              minWidth: 0,
            }}
            onClick={() => onEventClick?.(event)}
          >
            {event.color && (
              <div
                className={cls('eventColorBar')}
                style={{ backgroundColor: event.color }}
              />
            )}
            <div className={cls('eventTitle')}>{event.title}</div>
          </button>
        );

        if (isSelected) {
          return (
            <div
              key={event.id}
              ref={selectedEventRef}
              style={{ flex: '1 1 0', minWidth: 0 }}
            >
              {button}
            </div>
          );
        }

        return button;
      })}
    </>
  );
});
