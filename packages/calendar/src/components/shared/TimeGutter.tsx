import { memo } from 'react';
import type { GridViewClassNames } from '@/types/calendar';

interface TimeGutterProps {
  label: string;
  row: number;
  isHourStart: boolean;
  isFirst: boolean;
  cls: (key: keyof GridViewClassNames) => string;
}

export const TimeGutter = memo(function TimeGutter({
  label,
  row,
  isHourStart,
  isFirst,
  cls,
}: TimeGutterProps) {
  return (
    <div
      className={cls(isHourStart ? 'gutterCell' : 'gutterCellMinor')}
      style={{
        gridRow: row,
        gridColumn: 1,
        ...(isFirst ? { marginTop: 0 } : {}),
      }}
    >
      {isHourStart && <span className={cls('gutterLabel')}>{label}</span>}
    </div>
  );
});
