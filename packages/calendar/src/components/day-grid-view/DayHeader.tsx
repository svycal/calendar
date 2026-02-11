import { memo } from 'react';
import type { ReactNode } from 'react';
import type { Temporal } from 'temporal-polyfill';
import { cn } from '@/lib/utils';
import type { DayGridViewClassNames } from '@/types/calendar';
import { formatDayOfWeek } from '@/lib/time';

interface DayHeaderProps {
  date: Temporal.PlainDate;
  isToday: boolean;
  column: number;
  cls: (key: keyof DayGridViewClassNames) => string;
  renderHeader?: (props: {
    date: Temporal.PlainDate;
    isToday: boolean;
  }) => ReactNode;
}

export const DayHeader = memo(function DayHeader({
  date,
  isToday,
  column,
  cls,
  renderHeader,
}: DayHeaderProps) {
  return (
    <div
      role="columnheader"
      className={cls('headerCell')}
      style={{ gridRow: 1, gridColumn: column }}
    >
      {renderHeader ? (
        renderHeader({ date, isToday })
      ) : (
        <>
          <span className={cls('headerWeekday')}>{formatDayOfWeek(date)}</span>
          <span
            className={cn(
              cls('headerDayNumber'),
              isToday && cls('headerToday')
            )}
          >
            {date.day}
          </span>
        </>
      )}
    </div>
  );
});
