import { memo, type Ref } from 'react';
import type {
  CalendarEvent,
  EventLayout,
  GridViewClassNames,
  PositionedEvent,
  TimedCalendarEvent,
} from '@/types/calendar';
import { EventChip } from '../shared/EventChip';

interface DayColumnProps {
  positionedEvents: PositionedEvent[];
  column: number;
  timeZone: string;
  cls: (key: keyof GridViewClassNames) => string;
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

export const DayColumn = memo(function DayColumn({
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
}: DayColumnProps) {
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
