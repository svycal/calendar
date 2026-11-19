import { memo, type Ref } from 'react';
import type { Temporal } from 'temporal-polyfill';
import type {
  GridViewClassNames,
  PositionedEvent,
  SelectionAppearance,
  TimedCalendarEvent,
} from '@/types/calendar';
import { getMinuteRange } from '@/lib/time';
import { buildSyntheticEvent } from '@/lib/selection';
import { EventChip } from './EventChip';

interface SelectionOverlayProps {
  startTime: Temporal.ZonedDateTime;
  endTime: Temporal.ZonedDateTime;
  fallbackColor?: string;
  column: number;
  viewDate: Temporal.PlainDate;
  timeZone: string;
  startHour: number;
  endHour: number;
  hourHeight: number;
  cls: (key: keyof GridViewClassNames) => string;
  appearance?: SelectionAppearance;
  selectionRef?: Ref<HTMLDivElement>;
  renderEvent?: (props: {
    event: TimedCalendarEvent;
    position: PositionedEvent;
  }) => React.ReactNode;
  /** Draws this event, moved to `startTime`–`endTime`, instead of a placeholder. */
  event?: TimedCalendarEvent;
  /** Keeps the overlay laid out, as a popover anchor, but invisible. */
  hidden?: boolean;
}

export const SelectionOverlay = memo(function SelectionOverlay({
  startTime,
  endTime,
  fallbackColor,
  column,
  viewDate,
  timeZone,
  startHour,
  endHour,
  hourHeight,
  cls,
  appearance = 'highlight',
  selectionRef,
  renderEvent,
  event,
  hidden,
}: SelectionOverlayProps) {
  const pixelsPerMinute = hourHeight / 60;
  const axisStartMin = startHour * 60;

  const range = getMinuteRange(startTime, endTime, viewDate, timeZone);
  if (!range) return null;

  // Clip to the visible time axis so the overlay never extends the grid
  const startMin = Math.max(range.startMin, axisStartMin);
  const endMin = Math.min(range.endMin, endHour * 60);
  const top = (startMin - axisStartMin) * pixelsPerMinute;
  const height = (endMin - startMin) * pixelsPerMinute;

  if (height <= 0) return null;

  const isEventStyle = event != null || appearance !== 'highlight';

  return (
    <div
      aria-hidden="true"
      style={{
        gridRow: '3 / -1',
        gridColumn: column,
        position: 'relative',
        pointerEvents: 'none',
        visibility: hidden ? 'hidden' : undefined,
      }}
    >
      <div
        ref={selectionRef}
        style={{
          position: 'absolute',
          top,
          left: 0,
          right: 0,
          height,
        }}
      >
        {isEventStyle ? (
          <div className={cls('eventColumn')} style={{ height: '100%' }}>
            <EventChip
              interactive={false}
              isSelected
              positioned={{
                event: event
                  ? { ...event, startTime, endTime }
                  : buildSyntheticEvent(
                      '',
                      startTime,
                      endTime,
                      appearance !== 'highlight'
                        ? appearance.eventData
                        : undefined
                    ),
                top: 0,
                height,
                subColumn: 0,
                totalSubColumns: 1,
              }}
              fallbackColor={fallbackColor}
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
              inset: 0,
            }}
          />
        )}
      </div>
    </div>
  );
});
