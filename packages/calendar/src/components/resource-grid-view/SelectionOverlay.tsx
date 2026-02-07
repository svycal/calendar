import { memo } from 'react';
import type {
  ResourceGridViewClassNames,
  SelectedRange,
} from '@/types/calendar';

interface SelectionOverlayProps {
  selectedRange: SelectedRange;
  column: number;
  startHour: number;
  hourHeight: number;
  cls: (key: keyof ResourceGridViewClassNames) => string;
}

function parseMinutesFromISO(iso: string): number {
  // "2025-01-15T09:30:00" → 9*60+30 = 570
  const timePart = iso.split('T')[1];
  const [h, m] = timePart.split(':').map(Number);
  return h * 60 + m;
}

export const SelectionOverlay = memo(function SelectionOverlay({
  selectedRange,
  column,
  startHour,
  hourHeight,
  cls,
}: SelectionOverlayProps) {
  const pixelsPerMinute = hourHeight / 60;
  const axisStartMin = startHour * 60;

  const startMin = parseMinutesFromISO(selectedRange.startTime);
  const endMin = parseMinutesFromISO(selectedRange.endTime);

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
