import { memo, type Ref } from 'react';
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
  selectedEventId?: string | null;
  selectedEventRef?: Ref<HTMLDivElement>;
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
  selectedEventId,
  selectedEventRef,
}: ResourceColumnProps) {
  return (
    <div
      className={cls('eventColumn')}
      style={{
        gridRow: '3 / -1',
        gridColumn: column,
        pointerEvents: 'none',
        isolation: 'isolate',
      }}
    >
      {positionedEvents.map((positioned) => {
        const isSelected = positioned.event.id === selectedEventId;
        return (
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
            isSelected={isSelected}
            selectedEventRef={isSelected ? selectedEventRef : undefined}
          />
        );
      })}
    </div>
  );
});
