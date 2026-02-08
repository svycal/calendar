import { memo } from 'react';
import type {
  CalendarEvent,
  CalendarResource,
  EventLayout,
  PositionedEvent,
  ResourceGridViewClassNames,
  TimedCalendarEvent,
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
    event: TimedCalendarEvent;
    position: PositionedEvent;
  }) => React.ReactNode;
  eventGap?: number;
  eventLayout?: EventLayout;
  stackOffset?: number;
}

export const ResourceColumn = memo(function ResourceColumn({
  resource,
  positionedEvents,
  column,
  timeZone,
  cls,
  onEventClick,
  renderEvent,
  eventGap,
  eventLayout,
  stackOffset,
}: ResourceColumnProps) {
  return (
    <div
      className={cls('eventColumn')}
      style={{
        gridRow: '3 / -1',
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
          eventGap={eventGap}
          eventLayout={eventLayout}
          stackOffset={stackOffset}
        />
      ))}
    </div>
  );
});
