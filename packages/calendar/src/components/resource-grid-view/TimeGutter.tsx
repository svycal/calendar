import { memo } from 'react';
import type { ResourceGridViewClassNames } from '@/types/calendar';

interface TimeGutterProps {
  label: string;
  row: number;
  cls: (key: keyof ResourceGridViewClassNames) => string;
}

export const TimeGutter = memo(function TimeGutter({
  label,
  row,
  cls,
}: TimeGutterProps) {
  return (
    <div
      className={cls('gutterCell')}
      style={{ gridRow: row, gridColumn: 1 }}
    >
      <span className={cls('gutterLabel')}>{label}</span>
    </div>
  );
});
