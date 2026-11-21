import type { ReactNode } from 'react';
import type { Temporal } from 'temporal-polyfill';
import { cn } from '@/lib/utils';
import { formatDayOfWeek } from '@/lib/time';
import { DAYS_PER_WEEK, getMonthWeeks } from '@/lib/month';
import type { MonthViewClassNames, SwipeDirection } from '@/types/calendar';
import { DAY_HEADER_HEIGHT } from './MonthWeekRow';

interface MonthSwipeNeighborProps {
  side: SwipeDirection;
  month: Temporal.PlainYearMonth;
  weekStartsOn: number;
  fixedWeekCount: boolean;
  todayStr: string;
  cls: (key: keyof MonthViewClassNames) => string;
  renderHeader?: (props: {
    dayOfWeek: number;
    date: Temporal.PlainDate;
  }) => ReactNode;
}

/**
 * The empty month beside the view, which a swipe reveals: its weekday
 * headers, day cells, and day numbers, over the view's full size.
 */
export function MonthSwipeNeighbor({
  side,
  month,
  weekStartsOn,
  fixedWeekCount,
  todayStr,
  cls,
  renderHeader,
}: MonthSwipeNeighborProps) {
  const weeks = getMonthWeeks(month, weekStartsOn, fixedWeekCount);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        translate: side === 'next' ? '100% 0' : '-100% 0',
        display: 'grid',
        gridTemplateColumns: `repeat(${DAYS_PER_WEEK}, minmax(0, 1fr))`,
        gridTemplateRows: `auto repeat(${weeks.length}, minmax(0, 1fr))`,
        pointerEvents: 'none',
      }}
    >
      {weeks[0].map((date, i) => (
        <div
          key={date.dayOfWeek}
          className={cls('headerCell')}
          style={{
            gridRow: 1,
            gridColumn: i + 1,
            ...(i === DAYS_PER_WEEK - 1 ? { borderRightWidth: 0 } : {}),
          }}
        >
          {renderHeader
            ? renderHeader({ dayOfWeek: date.dayOfWeek, date })
            : formatDayOfWeek(date)}
        </div>
      ))}
      {weeks.map((dates, w) =>
        dates.map((date, col) => {
          const isOutside =
            date.month !== month.month || date.year !== month.year;
          return (
            <div
              key={date.toString()}
              className={cn(cls('dayCell'), isOutside && cls('dayCellOutside'))}
              style={{
                gridRow: w + 2,
                gridColumn: col + 1,
                display: 'flex',
                justifyContent: 'center',
                ...(w === 0 ? { borderTopWidth: 0 } : {}),
                ...(col === DAYS_PER_WEEK - 1 ? { borderRightWidth: 0 } : {}),
              }}
            >
              <span
                className={cn(
                  cls('dayNumber'),
                  isOutside && cls('dayNumberOutside'),
                  date.toString() === todayStr && cls('dayNumberToday')
                )}
                style={{ marginTop: (DAY_HEADER_HEIGHT - 24) / 2 }}
              >
                {date.day === 1
                  ? `${date.toLocaleString('en-US', { month: 'short' })} ${date.day}`
                  : date.day}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
