import { memo } from 'react';
import type {
  CalendarResource,
  PositionedEvent,
  ResourceGridViewClassNames,
  SelectedRange,
  SelectionAppearance,
  TimedCalendarEvent,
} from '@/types/calendar';
import { getMinutesFromMidnight } from '@/lib/time';
import { buildSyntheticEvent } from '@/lib/selection';
import { EventChip } from './EventChip';

interface SelectionOverlayProps {
  selectedRange: SelectedRange;
  column: number;
  resource: CalendarResource;
  timeZone: string;
  startHour: number;
  hourHeight: number;
  cls: (key: keyof ResourceGridViewClassNames) => string;
  appearance?: SelectionAppearance;
  renderEvent?: (props: {
    event: TimedCalendarEvent;
    position: PositionedEvent;
  }) => React.ReactNode;
}

export const SelectionOverlay = memo(function SelectionOverlay({
  selectedRange,
  column,
  resource,
  timeZone,
  startHour,
  hourHeight,
  cls,
  appearance = 'highlight',
  renderEvent,
}: SelectionOverlayProps) {
  const pixelsPerMinute = hourHeight / 60;
  const axisStartMin = startHour * 60;

  const startMin = getMinutesFromMidnight(selectedRange.startTime, timeZone);
  const endMin = getMinutesFromMidnight(selectedRange.endTime, timeZone);

  const top = (startMin - axisStartMin) * pixelsPerMinute;
  const height = (endMin - startMin) * pixelsPerMinute;

  if (height <= 0) return null;

  const isEventStyle = appearance !== 'highlight';

  return (
    <div
      style={{
        gridRow: '3 / -1',
        gridColumn: column,
        position: 'relative',
        pointerEvents: 'none',
      }}
    >
      {isEventStyle ? (
        <div className={cls('eventColumn')}>
          <EventChip
            interactive={false}
            positioned={{
              event: buildSyntheticEvent(
                selectedRange.resourceId,
                selectedRange.startTime,
                selectedRange.endTime,
                appearance.eventData,
              ),
              top,
              height,
              subColumn: 0,
              totalSubColumns: 1,
            }}
            resource={resource}
            timeZone={timeZone}
            cls={cls}
            renderEvent={renderEvent}
          />
        </div>
      ) : (
        <div
          className={cls('selectionHighlight')}
          style={{
            position: 'absolute',
            top,
            left: 0,
            right: 0,
            height,
          }}
        />
      )}
    </div>
  );
});
