import { memo } from 'react';
import type {
  ResourceGridViewClassNames,
  SelectedRange,
} from '@/types/calendar';
import { getMinutesFromMidnight } from '@/lib/time';

interface SelectionOverlayProps {
  selectedRange: SelectedRange;
  column: number;
  timeZone: string;
  startHour: number;
  hourHeight: number;
  cls: (key: keyof ResourceGridViewClassNames) => string;
}

export const SelectionOverlay = memo(function SelectionOverlay({
  selectedRange,
  column,
  timeZone,
  startHour,
  hourHeight,
  cls,
}: SelectionOverlayProps) {
  const pixelsPerMinute = hourHeight / 60;
  const axisStartMin = startHour * 60;

  const startMin = getMinutesFromMidnight(selectedRange.startTime, timeZone);
  const endMin = getMinutesFromMidnight(selectedRange.endTime, timeZone);

  const top = (startMin - axisStartMin) * pixelsPerMinute;
  const height = (endMin - startMin) * pixelsPerMinute;

  if (height <= 0) return null;

  return (
    <div
      style={{
        gridRow: '3 / -1',
        gridColumn: column,
        position: 'relative',
        pointerEvents: 'none',
      }}
    >
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
    </div>
  );
});
