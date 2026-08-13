import { memo, type Ref } from 'react';
import type {
  CalendarEvent,
  EventLayout,
  GridViewClassNames,
  OverflowClickInfo,
  OverflowPopoverRenderProps,
  PositionedEvent,
  TimedCalendarEvent,
} from '@/types/calendar';
import { TimedEventLayer } from '../shared/TimedEventLayer';

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
  eventMinWidth?: number;
  eventMaxStack?: number;
  onOverflowClick?: (info: OverflowClickInfo) => void;
  renderOverflowPopover?: (
    props: OverflowPopoverRenderProps
  ) => React.ReactNode;
}

export const DayColumn = memo(function DayColumn(props: DayColumnProps) {
  return <TimedEventLayer {...props} />;
});
