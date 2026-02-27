import { memo, type Ref } from 'react';
import { cn } from '@/lib/utils';
import { getEventLabel, getClientNameLabel } from '@/lib/accessibility';
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
        const labelParts: string[] = [getEventLabel(event), 'all day'];
        const clientLabel = getClientNameLabel(event);
        if (clientLabel) labelParts.push(clientLabel);
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
