import { memo } from 'react';
import type {
  CalendarEvent,
  CalendarResource,
  PositionedEvent,
  ResourceGridViewClassNames,
} from '@/types/calendar';
import { EventChip } from './EventChip';

interface ResourceColumnProps {
  resource: CalendarResource;
  positionedEvents: PositionedEvent[];
  column: number;
  timeZone: string;
  cls: (key: keyof ResourceGridViewClassNames) => string;
  onEventClick?: (event: CalendarEvent) => void;
  renderEvent?: (props: {
    event: CalendarEvent;
    position: PositionedEvent;
  }) => React.ReactNode;
}

export const ResourceColumn = memo(function ResourceColumn({
  resource,
  positionedEvents,
  column,
  timeZone,
  cls,
  onEventClick,
  renderEvent,
}: ResourceColumnProps) {
  return (
    <div
      className={cls('eventColumn')}
      style={{
        gridRow: '2 / -1',
        gridColumn: column,
        pointerEvents: 'none',
      }}
    >
      {positionedEvents.map((positioned) => (
        <EventChip
          key={positioned.event.id}
          positioned={positioned}
          resource={resource}
          timeZone={timeZone}
          cls={cls}
          onClick={onEventClick}
          renderEvent={renderEvent}
        />
      ))}
    </div>
  );
});
