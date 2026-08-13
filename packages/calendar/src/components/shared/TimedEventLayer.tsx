import { memo, useMemo, type Ref } from 'react';
import type {
  CalendarEvent,
  EventLayout,
  GridViewClassNames,
  OverflowClickInfo,
  OverflowPopoverRenderProps,
  PositionedEvent,
  TimedCalendarEvent,
} from '@/types/calendar';
import {
  applyEventOverflow,
  computeMaxVisibleColumns,
  DEFAULT_EVENT_MIN_WIDTH,
} from '@/lib/overlap';
import { EventChip } from './EventChip';
import { OverflowChip } from './OverflowChip';
import { useColumnWidth } from './useColumnWidth';

interface TimedEventLayerProps {
  positionedEvents: PositionedEvent[];
  column: number;
  timeZone: string;
  cls: (key: keyof GridViewClassNames) => string;
  fallbackColor?: string;
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

export const TimedEventLayer = memo(function TimedEventLayer({
  positionedEvents,
  column,
  timeZone,
  cls,
  fallbackColor,
  onEventClick,
  renderEvent,
  eventGap,
  eventLayout,
  stackOffset,
  selectedEventId,
  selectedEventRef,
  eventMinWidth = DEFAULT_EVENT_MIN_WIDTH,
  eventMaxStack,
  onOverflowClick,
  renderOverflowPopover,
}: TimedEventLayerProps) {
  const { ref, width } = useColumnWidth();

  const { visible, overflows } = useMemo(() => {
    const maxVisible = computeMaxVisibleColumns(
      width,
      eventMinWidth,
      eventMaxStack
    );
    return applyEventOverflow(positionedEvents, maxVisible);
  }, [positionedEvents, width, eventMinWidth, eventMaxStack]);

  return (
    <div
      ref={ref}
      className={cls('eventColumn')}
      style={{
        gridRow: '3 / -1',
        gridColumn: column,
        pointerEvents: 'none',
        isolation: 'isolate',
      }}
    >
      {visible.map((positioned) => {
        const isSelected = positioned.event.id === selectedEventId;
        return (
          <EventChip
            key={positioned.event.id}
            positioned={positioned}
            fallbackColor={fallbackColor}
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
      {overflows.map((group) => (
        <OverflowChip
          key={group.id}
          group={group}
          timeZone={timeZone}
          cls={cls}
          onEventClick={onEventClick}
          onOverflowClick={onOverflowClick}
          renderOverflowPopover={renderOverflowPopover}
        />
      ))}
    </div>
  );
});
