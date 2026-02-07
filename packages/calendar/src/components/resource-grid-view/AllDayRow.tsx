import { memo } from 'react';
import type {
  CalendarEvent,
  ResourceGridViewClassNames,
} from '@/types/calendar';

interface AllDayRowProps {
  events: CalendarEvent[];
  cls: (key: keyof ResourceGridViewClassNames) => string;
  onEventClick?: (event: CalendarEvent) => void;
}

export const AllDayRow = memo(function AllDayRow({
  events,
  cls,
  onEventClick,
}: AllDayRowProps) {
  if (events.length === 0) return null;

  return (
    <>
      {events.map((event) => (
        <button
          key={event.id}
          type="button"
          className={cls('event')}
          style={{
            position: 'relative',
            inset: 'unset',
            cursor: 'pointer',
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
      ))}
    </>
  );
});
