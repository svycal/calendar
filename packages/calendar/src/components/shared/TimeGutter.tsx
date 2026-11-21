import { memo, type CSSProperties } from 'react';
import type { GridViewClassNames } from '@/types/calendar';

interface TimeGutterProps {
  label: string;
  row: number;
  isHourStart: boolean;
  isFirst: boolean;
  cls: (key: keyof GridViewClassNames) => string;
  style?: CSSProperties;
}

export const TimeGutter = memo(function TimeGutter({
  label,
  row,
  isHourStart,
  isFirst,
  cls,
  style,
}: TimeGutterProps) {
  return (
    <div
      className={cls(isHourStart ? 'gutterCell' : 'gutterCellMinor')}
      style={{
        gridRow: row,
        gridColumn: 1,
        ...(isFirst ? { marginTop: 0 } : {}),
        ...style,
      }}
    >
      {isHourStart && <span className={cls('gutterLabel')}>{label}</span>}
    </div>
  );
});
